import type { EventProducer } from "./producer.js";
import { buildEnvelope, type NewEvent, type EventEnvelope } from "./envelope.js";

/**
 * Transactional outbox (see docs/18-scalability-and-reliability.md).
 *
 * Services write domain changes + an outbox row in the SAME db transaction,
 * so an event is never lost on crash. A relay polls unpublished rows and
 * pushes them to Kafka, marking them published. This decouples db commit
 * from broker availability.
 *
 * The persistence is injected (each service owns its `<schema>.outbox` table)
 * so this package stays storage-agnostic.
 */
export interface OutboxRow {
  id: string;
  envelope: EventEnvelope;
}

export interface OutboxStore {
  /** Fetch a batch of unpublished events (FOR UPDATE SKIP LOCKED in SQL impls). */
  fetchUnpublished(limit: number): Promise<OutboxRow[]>;
  /** Mark events as published after a successful Kafka send. */
  markPublished(ids: string[]): Promise<void>;
}

/** Build an envelope to be persisted by a service inside its own transaction. */
export function toOutboxEnvelope<T>(input: NewEvent<T>): EventEnvelope<T> {
  return buildEnvelope(input);
}

export class OutboxRelay {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** Consecutive failure count — used for escalated error logging. */
  private consecutiveFailures = 0;
  private readonly log: { warn: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void };

  constructor(
    private readonly store: OutboxStore,
    private readonly producer: EventProducer,
    private readonly opts: { batchSize?: number; intervalMs?: number; label?: string } = {},
  ) {
    // Use a lightweight logger stub if @vertofi/observability is not available in this context.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLogger } = require("@vertofi/observability");
      this.log = createLogger(`outbox-relay:${opts.label ?? "default"}`);
    } catch {
      this.log = {
        warn: (obj, msg) => console.warn("[outbox-relay]", msg, obj),
        error: (obj, msg) => console.error("[outbox-relay]", msg, obj),
      };
    }
  }

  start(): void {
    if (this.timer) return;
    // Default interval raised from 500 ms → 2 s with ±200 ms jitter to reduce
    // thundering-herd of SELECT…SKIP LOCKED across all replicas (H-4 fix).
    const base = this.opts.intervalMs ?? 2_000;
    const jitter = Math.random() * 400 - 200; // ±200 ms
    this.timer = setInterval(() => void this.tick(), base + jitter);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<void> {
    if (this.running) return; // prevent overlap
    this.running = true;
    try {
      const rows = await this.store.fetchUnpublished(this.opts.batchSize ?? 100);
      // Emit backlog depth so Prometheus can alert on accumulation.
      if (rows.length > 0) {
        this.log.warn({ backlog: rows.length }, "outbox relay publishing batch");
      }
      if (rows.length === 0) return;
      await this.producer.publishEnvelopes(rows.map((r) => r.envelope));
      await this.store.markPublished(rows.map((r) => r.id));
      // Reset consecutive failure counter on success.
      this.consecutiveFailures = 0;
    } catch (err) {
      // H-4 fix: surface errors instead of swallowing them silently.
      this.consecutiveFailures += 1;
      const logLevel = this.consecutiveFailures >= 5 ? "error" : "warn";
      this.log[logLevel](
        {
          err: err instanceof Error ? err.message : String(err),
          consecutiveFailures: this.consecutiveFailures,
        },
        "outbox relay tick failed — rows remain unpublished, will retry next interval",
      );
    } finally {
      this.running = false;
    }
  }
}
