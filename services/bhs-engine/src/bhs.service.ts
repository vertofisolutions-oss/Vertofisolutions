import { ForbiddenException, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PgService, assertGrantedScope } from "@vertofi/nest-common";
import { setRlsContext, setSystemContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";
import { computeBhs, type BhsResult } from "./score.js";

const BUSINESS_ROLES = ["BUSINESS_OWNER", "BUSINESS_USER"];

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "VIEW", scope: "FULL" };
  if (BUSINESS_ROLES.includes(p.role) && p.orgId !== orgId) {
    throw new ForbiddenException("org_not_owned");
  }
  return { orgIds: [orgId], permission: "VIEW", scope: p.role === "BHS_ANALYST" ? "BHS_ONLY" : "FULL" };
}

@Injectable()
export class BhsService {
  constructor(private readonly pg: PgService) {}

  /** Gather real signals from the ledger + reconciliation + exception schemas. */
  private async gather(c: PoolClient, orgId: string) {
    const totals = (
      await c.query<{ income: string; expense: string; entries: string }>(
        `SELECT
           coalesce(sum(CASE WHEN a.type='INCOME' THEN l.credit ELSE 0 END),0) AS income,
           coalesce(sum(CASE WHEN a.type='EXPENSE' THEN l.debit ELSE 0 END),0) AS expense,
           count(DISTINCT e.id) AS entries
         FROM ledger.ledger_entries e
         JOIN ledger.ledger_lines l ON l.entry_id = e.id
         JOIN ledger.chart_of_accounts a ON a.id = l.account_id
         WHERE e.org_id = $1 AND e.status='POSTED'`,
        [orgId],
      )
    ).rows[0]!;

    const recon = (
      await c.query<{ matched: string; total: string }>(
        `SELECT count(*) FILTER (WHERE matched) AS matched, count(*) AS total
         FROM reconciliation.pending_items WHERE org_id = $1`,
        [orgId],
      )
    ).rows[0] ?? { matched: "0", total: "0" };

    const unmatched = (
      await c.query<{ n: string }>(
        "SELECT count(*) AS n FROM reconciliation.pending_items WHERE org_id=$1 AND matched=false",
        [orgId],
      )
    ).rows[0]!.n;

    const exceptions = (
      await c.query<{ n: string }>(
        "SELECT count(*) AS n FROM exception.exceptions WHERE org_id=$1 AND status='OPEN'",
        [orgId],
      )
    ).rows[0]!.n;

    const total = Number(recon.total);
    return {
      entryCount: Number(totals.entries),
      income: Number(totals.income),
      expense: Number(totals.expense),
      reconciledRatio: total > 0 ? Number(recon.matched) / total : 0,
      gstFilingOnTime: null as number | null, // wired when gst-connector returns data
      unmatchedCount: Number(unmatched),
      exceptionCount: Number(exceptions),
    };
  }

  /** Recompute + persist the score for an org (system-triggered on events). */
  async recompute(orgId: string): Promise<BhsResult> {
    return this.pg.transaction(async (c) => {
      await setSystemContext(c);
      const inputs = await this.gather(c, orgId);
      const result = computeBhs(inputs);
      await c.query(
        `INSERT INTO bhs.bhs_scores (org_id, score, sub_scores, rating) VALUES ($1,$2,$3,$4)`,
        [orgId, result.score, JSON.stringify(result.subScores), result.rating],
      );
      return result;
    });
  }

  /** Latest score for the dashboard (user-scoped read). */
  async latest(p: Principal, orgId: string) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query(
        "SELECT score, sub_scores, rating, computed_at FROM bhs.bhs_scores WHERE org_id=$1 ORDER BY computed_at DESC LIMIT 1",
        [orgId],
      );
      return r.rows[0] ?? { score: null, rating: "INSUFFICIENT", sub_scores: {} };
    });
  }

  async history(p: Principal, orgId: string) {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query(
        "SELECT score, rating, computed_at FROM bhs.bhs_scores WHERE org_id=$1 ORDER BY computed_at DESC LIMIT 30",
        [orgId],
      );
      return r.rows;
    });
  }
}
