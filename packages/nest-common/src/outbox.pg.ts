import type { EventEnvelope, OutboxRow, OutboxStore } from "@vertofi/events";
import type { PgService } from "./pg.service.js";

/**
 * Postgres-backed transactional outbox store (see docs/18). Each service owns
 * a `<schema>.outbox` table. Writers insert into it inside their domain
 * transaction via `enqueue`; the OutboxRelay drains it to Kafka.
 *
 * Table DDL (created in each service's migration):
 *   CREATE TABLE <schema>.outbox (
 *     id uuid PRIMARY KEY,
 *     envelope jsonb NOT NULL,
 *     published_at timestamptz,
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX ON <schema>.outbox (published_at) WHERE published_at IS NULL;
 */
export class PgOutboxStore implements OutboxStore {
  constructor(
    private readonly pg: PgService,
    private readonly schema: string,
  ) {}

  async fetchUnpublished(limit: number): Promise<OutboxRow[]> {
    const rows = await this.pg.query<{ id: string; envelope: EventEnvelope }>(
      `SELECT id, envelope FROM ${this.schema}.outbox
       WHERE published_at IS NULL
       ORDER BY created_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    return rows.map((r) => ({ id: r.id, envelope: r.envelope }));
  }

  async markPublished(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.pg.query(
      `UPDATE ${this.schema}.outbox SET published_at = now() WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }

  /** Insert an envelope into the outbox using an existing transaction client. */
  async enqueue(client: { query: (t: string, p?: unknown[]) => Promise<unknown> }, env: EventEnvelope): Promise<void> {
    await client.query(`INSERT INTO ${this.schema}.outbox (id, envelope) VALUES ($1, $2)`, [
      env.id,
      JSON.stringify(env),
    ]);
  }
}
