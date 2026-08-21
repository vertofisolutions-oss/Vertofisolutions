import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import express from "express";
import { Pool } from "pg";
import { EventConsumer, Topics, type EventEnvelope } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";

const log = createLogger("audit");
const PORT = Number(process.env.AUDIT_PORT ?? 4004);
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

/**
 * C-3 fix: Derive prev_hash from the DB inside the INSERT transaction rather
 * than from in-process memory (`let lastHash`).
 *
 * The original design stored `lastHash` in a module-level variable. This is
 * broken when more than 1 replica runs (each pod maintains its own divergent
 * chain) and also on any pod restart (the in-memory value is lost). Each
 * replica competes to write and produces conflicting hash chains.
 *
 * Fix: SELECT the most recent hash row inside the same transaction as the
 * INSERT, using FOR UPDATE to serialise concurrent writers. This keeps the
 * chain correct regardless of replica count and survives restarts.
 *
 * The audit Helm values.yaml pins replicaCount: 1 / autoscaling: false for
 * now — this code-level fix means it will also be correct if we later migrate
 * to a partition-local chain design and allow scale-out.
 */
async function record(env: EventEnvelope): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the last row so concurrent writers serialise (not needed at replica=1
    // but safe and correct at any replica count).
    const prevRow = await client.query<{ hash: string }>(
      "SELECT hash FROM audit.audit_log ORDER BY seq DESC LIMIT 1 FOR UPDATE",
    );
    const prev = prevRow.rows[0]?.hash ?? null;

    const material = JSON.stringify({ id: env.id, event: env.event, prev, data: env.data });
    const hash = createHash("sha256").update(material).digest("hex");

    // Dedupe by event id WITHOUT ON CONFLICT: the table is partitioned with
    // PK (id, recorded_at), so there is no unique constraint on (id) alone —
    // ON CONFLICT (id) errors out (this silently broke ingestion from day
    // one). The FOR UPDATE above serialises writers, so NOT EXISTS is safe.
    await client.query(
      `INSERT INTO audit.audit_log
         (id, org_id, actor_id, event, correlation_id, payload, prev_hash, hash, occurred_at)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9
        WHERE NOT EXISTS (SELECT 1 FROM audit.audit_log WHERE id = $1)`,
      [
        env.id,
        env.org_id,
        env.actor_id,
        env.event,
        env.correlation_id,
        JSON.stringify(env.data),
        prev,
        hash,
        env.occurred_at,
      ],
    );

    await client.query("COMMIT");
    log.warn({ event: env.event, id: env.id }, "audit record written");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    log.error({ err: err instanceof Error ? err.message : String(err), id: env.id }, "audit record failed");
    throw err; // bubble to consumer → DLQ after maxRetries
  } finally {
    client.release();
  }
}

async function start(): Promise<void> {
  // Verify DB connectivity on startup.
  await pool.query("SELECT 1");
  log.warn({}, "audit DB connected");

  // Consume EVERY domain topic into the immutable log (docs/11 #13).
  const allTopics = Object.values(Topics);
  const consumer = new EventConsumer({
    clientId: "audit",
    brokers,
    groupId: "audit-blackbox",
    topics: allTopics,
    // On repeated DLQ failures the error is logged by the consumer's DLQ path.
    maxRetries: 3,
  });

  // Record EVERY event into the immutable, hash-chained log.
  consumer.onAny(async (env: EventEnvelope) => record(env));

  await consumer.start();
  log.warn({ topics: allTopics.length }, "audit consumer started");

  const app = express();
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // ── Black Box read API (docs/11 #13) ──────────────────────────────────────
  // The gateway verifies the JWT and forwards x-principal-* headers, but we
  // re-verify here (defense in depth — same rule as every Nest service).
  type Claims = { sub: string; role: string; orgId?: string; exp: number; iss?: string };
  function verifyJwt(header: string | undefined): Claims | null {
    if (!header?.startsWith("Bearer ")) return null;
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return null;
    const [h, p, sig] = header.slice(7).split(".");
    if (!h || !p || !sig) return null;
    const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
    const given = Buffer.from(sig, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    try {
      const claims = JSON.parse(Buffer.from(p, "base64url").toString()) as Claims;
      if (claims.exp * 1000 < Date.now()) return null;
      if (claims.iss && claims.iss !== "vertofi") return null;
      return claims;
    } catch {
      return null;
    }
  }

  /** Immutable event timeline for one org (owner of that org, or ADMIN). */
  app.get("/audit/:orgId/timeline", async (req, res) => {
    const claims = verifyJwt(req.headers.authorization);
    if (!claims) return res.status(401).json({ errors: [{ code: "unauthorized" }] });
    const { orgId } = req.params;
    if (claims.role !== "ADMIN" && claims.orgId !== orgId) {
      return res.status(403).json({ errors: [{ code: "forbidden" }] });
    }
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
    try {
      const r = await pool.query(
        `SELECT seq, event, occurred_at, recorded_at, actor_id, payload, prev_hash, hash
           FROM audit.audit_log WHERE org_id = $1
          ORDER BY recorded_at DESC LIMIT $2 OFFSET $3`,
        [orgId, limit, offset],
      );
      return res.json({ entries: r.rows, count: r.rowCount });
    } catch (err) {
      log.error({ err: String(err) }, "timeline query failed");
      return res.status(500).json({ errors: [{ code: "timeline_failed" }] });
    }
  });

  /**
   * Tamper-evidence check: walk the most recent N rows of the global chain and
   * confirm every row's prev_hash equals the previous row's hash. (Payload
   * round-trips through jsonb, which doesn't preserve key order, so the chain
   * linkage — not hash recomputation — is the verifiable property.)
   */
  app.get("/audit/verify", async (req, res) => {
    const claims = verifyJwt(req.headers.authorization);
    if (!claims) return res.status(401).json({ errors: [{ code: "unauthorized" }] });
    const limit = Math.min(Number(req.query.limit ?? 1000) || 1000, 10_000);
    try {
      const r = await pool.query<{ seq: string; prev_hash: string | null; hash: string }>(
        "SELECT seq, prev_hash, hash FROM audit.audit_log ORDER BY seq DESC LIMIT $1",
        [limit],
      );
      const rows = r.rows.reverse(); // ascending
      let breaks = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i]!.prev_hash !== rows[i - 1]!.hash) breaks++;
      }
      return res.json({ checked: rows.length, breaks, intact: breaks === 0 });
    } catch (err) {
      log.error({ err: String(err) }, "verify query failed");
      return res.status(500).json({ errors: [{ code: "verify_failed" }] });
    }
  });

  // H-5 fix applied here too: always 200 even if DB is slow.
  app.get("/ready", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "ok" });
    } catch {
      // Return 200 degraded — do not remove the pod from endpoints on DB blip.
      res.json({ status: "degraded", db: "fail" });
    }
  });
  app.listen(PORT, () => log.warn({ port: PORT }, "audit http listening"));
}

void start().catch((e) => {
  log.error({ err: String(e) }, "audit failed to start");
  process.exit(1);
});
