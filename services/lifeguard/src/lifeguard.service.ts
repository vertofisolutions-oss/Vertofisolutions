import { Injectable } from "@nestjs/common";
import { PgService, PgOutboxStore, assertGrantedScope } from "@vertofi/nest-common";
import { toOutboxEnvelope, type EventEnvelope } from "@vertofi/events";
import { setRlsContext, setSystemContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  if (p.role === "LAWYER") return { orgIds: [orgId], permission: "EDIT", scope: "CASES_ONLY" };
  return { orgIds: [orgId], permission: "EDIT", scope: "FULL" };
}

const LEGAL_CATEGORIES = ["GST_NOTICE", "TAX_NOTICE", "FRAUD"];

@Injectable()
export class LifeguardService {
  private readonly outbox: PgOutboxStore;
  constructor(private readonly pg: PgService) {
    this.outbox = new PgOutboxStore(pg, "lifeguard");
  }

  async raise(p: Principal, orgId: string, category: string, source = "APP") {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query<{ id: string }>(
        `INSERT INTO lifeguard.lifeguard_cases (org_id, category, source, raised_by, timeline)
         VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING id`,
        [orgId, category, source, p.userId, JSON.stringify([{ at: new Date().toISOString(), event: "raised" }])],
      );
      const id = r.rows[0]!.id;
      // Escalate notices/fraud to the Legal panel (docs/10 SOS → legal).
      if (LEGAL_CATEGORIES.includes(category)) {
        await this.outbox.enqueue(
          c,
          toOutboxEnvelope({
            event: "lifeguard.case.escalated",
            org_id: orgId,
            actor_id: p.userId,
            data: { case_id: id, category },
          }),
        );
      }
      return { id, category, escalatedToLegal: LEGAL_CATEGORIES.includes(category) };
    });
  }

  /** SOS arriving from WhatsApp (system-context ingest). */
  async ingestSos(env: EventEnvelope<Record<string, unknown>>) {
    const orgId = env.org_id;
    if (!orgId) return;
    await this.pg.transaction(async (c) => {
      await setSystemContext(c);
      await c.query(
        `INSERT INTO lifeguard.lifeguard_cases (org_id, category, source, timeline)
         VALUES ($1,$2,'WHATSAPP',$3::jsonb)`,
        [orgId, String(env.data.category ?? "CASHFLOW_CRISIS"), JSON.stringify([{ at: env.occurred_at, event: "sos_whatsapp" }])],
      );
    });
  }

  async list(p: Principal, orgId: string, status = "OPEN") {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query(
        "SELECT * FROM lifeguard.lifeguard_cases WHERE org_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT 100",
        [orgId, status],
      );
      return r.rows;
    });
  }

  async resolve(p: Principal, orgId: string, id: string) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      await c.query(
        `UPDATE lifeguard.lifeguard_cases
            SET status='RESOLVED', assigned_to=$3,
                timeline = timeline || jsonb_build_object('at', now(), 'event', 'resolved'),
                updated_at=now()
          WHERE id=$1 AND org_id=$2`,
        [id, orgId, p.userId],
      );
      return { id, status: "RESOLVED" };
    });
  }
}
