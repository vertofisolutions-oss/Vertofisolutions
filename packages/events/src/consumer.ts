import { type Consumer, type EachMessagePayload } from "kafkajs";
import { createKafka } from "./kafka-factory.js";
import type { EventEnvelope } from "./envelope.js";

export interface ConsumerConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  /** Topics to subscribe to. */
  topics: string[];
  /** Send failed messages to "<topic>.dlq" after maxRetries (see docs/18). */
  dlqSuffix?: string;
  maxRetries?: number;
  /**
   * H-3 fix: number of partitions to process concurrently within one consumer.
   * Defaults to 3. Increase for high-throughput consumers (e.g. audit, reporting).
   */
  partitionsConsumedConcurrently?: number;
}

export type Handler<T = unknown> = (
  envelope: EventEnvelope<T>,
  raw: EachMessagePayload,
) => Promise<void>;

/**
 * Resilient consumer with at-least-once delivery + dead-letter queue.
 * Handlers MUST be idempotent (see docs/18-scalability-and-reliability.md).
 */
export class EventConsumer {
  private consumer: Consumer | undefined;
  private dlqProducer = false;
  private readonly handlers = new Map<string, Handler>();
  private anyHandler: Handler | null = null;
  private readonly maxRetries: number;
  private readonly dlqSuffix: string;
  private readonly partitionsConsumedConcurrently: number;

  constructor(private readonly config: ConsumerConfig) {
    this._kafkaPromise = createKafka(config.clientId, config.brokers);
    this.maxRetries = config.maxRetries ?? 5;
    this.dlqSuffix = config.dlqSuffix ?? ".dlq";
    // H-3 fix: default 3 partitions concurrently to prevent head-of-line blocking.
    this.partitionsConsumedConcurrently = config.partitionsConsumedConcurrently ?? 3;
  }

  private _kafkaPromise: Promise<import("kafkajs").Kafka>;

  /** Register a handler for a specific event name. */
  on<T>(event: string, handler: Handler<T>): this {
    this.handlers.set(event, handler as Handler);
    return this;
  }

  /** Register a catch-all handler invoked for every event (e.g. the audit log). */
  onAny(handler: Handler): this {
    this.anyHandler = handler;
    return this;
  }

  async start(): Promise<void> {
    const kafka = await this._kafkaPromise;
    this.consumer = kafka.consumer({ groupId: this.config.groupId });
    await this.consumer.connect();
    for (const topic of this.config.topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }
    const producer = kafka.producer();
    await producer.connect();
    this.dlqProducer = true;

    await this.consumer.run({
      autoCommit: true,
      // H-3 fix: process multiple partitions concurrently instead of serially.
      // This prevents a slow/poisoned message on partition N from blocking
      // messages on partitions N+1, N+2, etc.
      partitionsConsumedConcurrently: this.partitionsConsumedConcurrently,
      eachMessage: async (payload) => {
        const { message, topic } = payload;
        if (!message.value) return;
        let envelope: EventEnvelope;
        try {
          envelope = JSON.parse(message.value.toString()) as EventEnvelope;
        } catch {
          return; // unparseable → drop (cannot DLQ what we can't read)
        }
        const handler = this.handlers.get(envelope.event) ?? this.anyHandler;
        if (!handler) return; // not for us

        let attempt = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            await handler(envelope, payload);
            return;
          } catch (err) {
            attempt += 1;
            if (attempt > this.maxRetries) {
              // M-3 / H-3 fix: log before DLQ'ing so failures are visible.
              console.error("[consumer] DLQ'ing message after max retries", {
                topic,
                event: envelope.event,
                id: envelope.id,
                attempt,
                err: err instanceof Error ? err.message : String(err),
              });
              await producer.send({
                topic: `${topic}${this.dlqSuffix}`,
                messages: [
                  {
                    key: message.key ?? undefined,
                    value: message.value,
                    headers: {
                      ...message.headers,
                      "dlq-reason": String(err instanceof Error ? err.message : err),
                      "dlq-attempts": String(attempt),
                      "dlq-original-topic": topic,
                      "dlq-timestamp": new Date().toISOString(),
                    },
                  },
                ],
              });
              return;
            }
            // H-3 fix: cap retry sleep to 2 s (was 5 s) so a single poisoned
            // message blocks its partition for at most ~10 s before DLQ (was ~25 s).
            await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 100, 2_000)));
          }
        }
      },
    });
  }

  async stop(): Promise<void> {
    await this.consumer?.disconnect();
    this.dlqProducer = false;
  }
}
