import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * Postgres access with connection pooling (PgBouncer-friendly).
 * Services use `query` for simple cases and `withClient`/transactions for
 * RLS-scoped work (see @vertofi/tenancy withTenantContext).
 */
@Injectable()
export class PgService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      // C-1 fix: default reduced from 20 → 5. Helm values.yaml also sets this.
      // Math: ~20 DB services × 30 replicas × 5 = 3,000 connections max.
      // Set Postgres max_connections ≥ 3,500 via Terraform database_flags.
      // With PgBouncer in transaction mode, lower to 2–3.
      max: Number(process.env.DB_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      // Fail fast on connection exhaustion (was 5 s, silent hang in high load).
      // At 5 s * hundreds of queued requests = cascading timeout storm.
      connectionTimeoutMillis: 3_000,
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<T[]> {
    const res = await this.pool.query<T>(text, params as never[]);
    return res.rows;
  }

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const out = await fn(client);
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    });
  }

  async ping(): Promise<boolean> {
    const rows = await this.query<{ ok: number }>("SELECT 1 AS ok");
    return rows[0]?.ok === 1;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
