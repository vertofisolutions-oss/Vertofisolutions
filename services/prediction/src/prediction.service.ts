import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PgService, assertGrantedScope } from "@vertofi/nest-common";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "VIEW", scope: "FULL" };
  return { orgIds: [orgId], permission: "VIEW", scope: "FULL" };
}

@Injectable()
export class PredictionService {
  constructor(private readonly pg: PgService) {}

  private run<T>(p: Principal, orgId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      return fn(c);
    });
  }

  /**
   * ProfitLeak Finder™ (docs/11 #4): real heuristics over categorized spend.
   * Detects duplicate payments and subscription/uncategorized waste. Persists
   * findings with evidence; returns [] honestly when nothing is detectable.
   */
  async profitLeaks(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      // Duplicate payments: same vendor + amount appearing multiple times.
      const dups = await c.query<{ vendor: string; amount: string; n: string }>(
        `SELECT vendor, amount, count(*) AS n
           FROM reconciliation.pending_items
          WHERE org_id = $1 AND vendor IS NOT NULL
          GROUP BY vendor, amount HAVING count(*) > 1`,
        [orgId],
      );
      // Subscription / waste-bucket spend.
      const waste = await c.query<{ category: string; total: string }>(
        `SELECT category, sum(amount) AS total
           FROM reconciliation.pending_items
          WHERE org_id = $1 AND category IN ('Subscriptions','Bank Charges','Uncategorized')
          GROUP BY category`,
        [orgId],
      );

      const findings: { type: string; amount: number; evidence: Record<string, unknown> }[] = [];
      for (const d of dups.rows) {
        const extra = (Number(d.n) - 1) * Number(d.amount);
        findings.push({ type: "DUPLICATE", amount: extra, evidence: { vendor: d.vendor, amount: Number(d.amount), occurrences: Number(d.n) } });
      }
      for (const w of waste.rows) {
        findings.push({ type: "SUBSCRIPTION_WASTE", amount: Number(w.total), evidence: { category: w.category } });
      }

      // Persist fresh findings (replace OPEN set).
      await c.query("DELETE FROM prediction.profit_leaks WHERE org_id=$1 AND status='OPEN'", [orgId]);
      for (const f of findings) {
        await c.query(
          "INSERT INTO prediction.profit_leaks (org_id, type, amount, evidence) VALUES ($1,$2,$3,$4)",
          [orgId, f.type, f.amount, JSON.stringify(f.evidence)],
        );
      }
      const totalLeak = findings.reduce((s, f) => s + f.amount, 0);
      return { totalLeak, findings };
    });
  }

  /** Predictive Tax Warning™ (docs/11 #2): GST liability trend from invoices. */
  async taxWarning(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      const r = await c.query<{ direction: string; tax: string }>(
        `SELECT direction, coalesce(sum(cgst+sgst+igst),0) AS tax
           FROM ledger.invoices WHERE org_id=$1 GROUP BY direction`,
        [orgId],
      );
      const output = Number(r.rows.find((x) => x.direction === "SALES")?.tax ?? 0);
      const input = Number(r.rows.find((x) => x.direction === "PURCHASE")?.tax ?? 0);
      const netPayable = Math.max(0, output - input);
      const hasData = output > 0 || input > 0;
      const warning =
        !hasData
          ? null
          : netPayable > input * 1.5
            ? { level: "HIGH", message: "GST liability is rising vs input credit", projected: netPayable }
            : { level: "LOW", message: "GST liability within normal range", projected: netPayable };
      if (warning) {
        await c.query(
          "INSERT INTO prediction.predictions (org_id, type, horizon, payload, confidence) VALUES ($1,'TAX_WARNING','MONTH',$2,$3)",
          [orgId, JSON.stringify(warning), 0.7],
        );
      }
      return { hasData, netPayable, warning };
    });
  }

  /** Cashflow runway forecast from net bank flow (docs/11 #11 supports MoneyMap). */
  async cashflowForecast(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      const r = await c.query<{ inflow: string; outflow: string; days: string }>(
        `SELECT
            coalesce(sum(amount) FILTER (WHERE direction='CREDIT'),0) AS inflow,
            coalesce(sum(amount) FILTER (WHERE direction='DEBIT'),0) AS outflow,
            greatest(1, extract(day FROM (max(txn_date)::timestamp - min(txn_date)::timestamp))) AS days
           FROM reconciliation.bank_txns WHERE org_id=$1`,
        [orgId],
      );
      const row = r.rows[0]!;
      const inflow = Number(row.inflow);
      const outflow = Number(row.outflow);
      const days = Number(row.days);
      const hasData = inflow > 0 || outflow > 0;
      const dailyBurn = days > 0 ? outflow / days : 0;
      const balance = inflow - outflow;
      const runwayDays = dailyBurn > 0 ? Math.max(0, Math.round(balance / dailyBurn)) : null;
      const risk = runwayDays === null ? "UNKNOWN" : runwayDays < 30 ? "HIGH" : runwayDays < 60 ? "MEDIUM" : "LOW";
      return { hasData, balance, dailyBurn, runwayDays, risk };
    });
  }
}
