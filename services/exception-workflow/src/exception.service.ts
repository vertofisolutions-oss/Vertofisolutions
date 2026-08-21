import { Injectable } from "@nestjs/common";
import { PgService, assertGrantedScope } from "@vertofi/nest-common";
import { setRlsContext, setSystemContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";
import type { EventEnvelope } from "@vertofi/events";

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  // Associates can resolve (EDIT); teams/accountants flag only (VIEW).
  const permission = p.role === "ASSOCIATE" ? "EDIT" : "VIEW";
  return { orgIds: [orgId], permission, scope: "FULL" };
}

@Injectable()
export class ExceptionService {
  constructor(private readonly pg: PgService) {}

  /** System ingestion from pipeline events (needs_review, recon mismatches). */
  async ingest(env: EventEnvelope<Record<string, unknown>>, type: string, severity = "MEDIUM"): Promise<void> {
    const orgId = env.org_id;
    if (!orgId) return;
    await this.pg.transaction(async (c) => {
      await setSystemContext(c);
      await c.query(
        `INSERT INTO exception.exceptions (org_id, type, severity, payload, sla_due_at)
         VALUES ($1,$2,$3,$4, now() + interval '2 days')`,
        [orgId, type, severity, JSON.stringify(env.data)],
      );
    });
  }

  async list(p: Principal, orgId: string, status = "OPEN") {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query(
        "SELECT * FROM exception.exceptions WHERE org_id=$1 AND status=$2 ORDER BY severity DESC, created_at LIMIT 200",
        [orgId, status],
      );
      return r.rows;
    });
  }

  /** Teams (view-only on data) flag an accounting flaw → an exception (docs/03). */
  async flagFlaw(p: Principal, orgId: string, payload: { title: string; detail: string; severity?: string }) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query<{ id: string }>(
        `INSERT INTO exception.exceptions (org_id, type, severity, payload, raised_by)
         VALUES ($1,'FLAW_FLAG',$2,$3,$4) RETURNING id`,
        [orgId, payload.severity ?? "MEDIUM", JSON.stringify(payload), p.userId],
      );
      return { id: r.rows[0]!.id };
    });
  }

  /** Resolve/dismiss an exception (associates/admin only — enforced by scope). */
  async resolve(p: Principal, orgId: string, id: string, resolution: Record<string, unknown>, dismiss = false) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      await c.query(
        `UPDATE exception.exceptions SET status=$3, resolution=$4, assigned_to=$5, updated_at=now()
         WHERE id=$1 AND org_id=$2`,
        [id, orgId, dismiss ? "DISMISSED" : "RESOLVED", JSON.stringify(resolution), p.userId],
      );
      return { id, status: dismiss ? "DISMISSED" : "RESOLVED" };
    });
  }
}
