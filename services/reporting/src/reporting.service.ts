import { ForbiddenException, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PgService, assertGrantedScope } from "@vertofi/nest-common";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

const BUSINESS_ROLES = ["BUSINESS_OWNER", "BUSINESS_USER"];

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "VIEW", scope: "FULL" };
  // Business users may only read their OWN org (carried in the JWT). Professional
  // roles are constrained by RLS to the requested org; cross-org grant checks
  // are enforced by the access service (see docs/04).
  if (BUSINESS_ROLES.includes(p.role) && p.orgId !== orgId) {
    throw new ForbiddenException("org_not_owned");
  }
  return { orgIds: [orgId], permission: "VIEW", scope: "FULL" };
}

@Injectable()
export class ReportingService {
  constructor(private readonly pg: PgService) {}

  private run<T>(p: Principal, orgId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      return fn(c);
    });
  }

  /** Profit & Loss grouped by account type — computed from the ledger. */
  async profitAndLoss(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      const rows = await c.query<{ type: string; name: string; amount: string }>(
        `SELECT a.type, a.name,
                sum(CASE WHEN a.type IN ('INCOME','LIABILITY','EQUITY') THEN l.credit - l.debit
                         ELSE l.debit - l.credit END) AS amount
           FROM ledger.ledger_lines l
           JOIN ledger.chart_of_accounts a ON a.id = l.account_id
           JOIN ledger.ledger_entries e ON e.id = l.entry_id AND e.status='POSTED'
          WHERE l.org_id = $1
          GROUP BY a.type, a.name`,
        [orgId],
      );
      const income = rows.rows.filter((r) => r.type === "INCOME").reduce((s, r) => s + Number(r.amount), 0);
      const expense = rows.rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + Number(r.amount), 0);
      return {
        income,
        expense,
        netProfit: income - expense,
        margin: income > 0 ? (income - expense) / income : null,
        lines: rows.rows,
      };
    });
  }

  /**
   * Balance Sheet from the double-entry ledger: account balances grouped
   * ASSET / LIABILITY / EQUITY, with retained earnings (income − expense)
   * folded into equity so the statement balances by construction.
   */
  async balanceSheet(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      const rows = await c.query<{ type: string; name: string; amount: string }>(
        `SELECT a.type, a.name,
                sum(CASE WHEN a.type IN ('INCOME','LIABILITY','EQUITY') THEN l.credit - l.debit
                         ELSE l.debit - l.credit END) AS amount
           FROM ledger.ledger_lines l
           JOIN ledger.chart_of_accounts a ON a.id = l.account_id
           JOIN ledger.ledger_entries e ON e.id = l.entry_id AND e.status='POSTED'
          WHERE l.org_id = $1
          GROUP BY a.type, a.name`,
        [orgId],
      );
      const pick = (t: string) => rows.rows.filter((r) => r.type === t).map((r) => ({ name: r.name, amount: Number(r.amount) }));
      const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
      const assets = pick("ASSET");
      const liabilities = pick("LIABILITY");
      const equity = pick("EQUITY");
      const income = sum(pick("INCOME"));
      const expense = sum(pick("EXPENSE"));
      const retainedEarnings = income - expense;
      const totalAssets = sum(assets);
      const totalLiabilities = sum(liabilities);
      const totalEquity = sum(equity) + retainedEarnings;
      return {
        hasData: rows.rows.length > 0,
        assets, liabilities,
        equity: [...equity, { name: "Retained Earnings (current period)", amount: retainedEarnings }],
        totalAssets, totalLiabilities, totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      };
    });
  }

  /** GST summary from invoices (output vs input tax). */
  async gstSummary(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      const r = await c.query<{ direction: string; cgst: string; sgst: string; igst: string }>(
        `SELECT direction, coalesce(sum(cgst),0) AS cgst, coalesce(sum(sgst),0) AS sgst, coalesce(sum(igst),0) AS igst
           FROM ledger.invoices WHERE org_id = $1 GROUP BY direction`,
        [orgId],
      );
      const out = r.rows.find((x) => x.direction === "SALES");
      const inp = r.rows.find((x) => x.direction === "PURCHASE");
      const outputTax = out ? Number(out.cgst) + Number(out.sgst) + Number(out.igst) : 0;
      const inputTax = inp ? Number(inp.cgst) + Number(inp.sgst) + Number(inp.igst) : 0;
      return { outputTax, inputTaxCredit: inputTax, netGstPayable: Math.max(0, outputTax - inputTax) };
    });
  }

  /**
   * MoneyMap Live™ — inflow/outflow + profit & waste zones (docs/11 #11).
   * Aggregates bank transactions and categorized spend. Returns an empty map
   * when there is no data (the UI shows the empty state, not fake flows).
   */
  async moneyMap(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      const flow = await c.query<{ direction: string; total: string; n: string }>(
        `SELECT direction, coalesce(sum(amount),0) AS total, count(*) AS n
           FROM reconciliation.bank_txns WHERE org_id = $1 GROUP BY direction`,
        [orgId],
      );
      const byCategory = await c.query<{ category: string; total: string }>(
        `SELECT coalesce(category,'Uncategorized') AS category, sum(amount) AS total
           FROM reconciliation.pending_items WHERE org_id = $1 GROUP BY category ORDER BY total DESC LIMIT 12`,
        [orgId],
      );
      const inflow = Number(flow.rows.find((x) => x.direction === "CREDIT")?.total ?? 0);
      const outflow = Number(flow.rows.find((x) => x.direction === "DEBIT")?.total ?? 0);
      const spend = byCategory.rows.map((r) => ({ category: r.category, amount: Number(r.total) }));
      // Waste zones = subscription/uncategorized-style buckets; profit zones = net positive.
      const wasteZones = spend.filter((s) => ["Subscriptions", "Uncategorized", "Bank Charges"].includes(s.category));
      return {
        inflow,
        outflow,
        net: inflow - outflow,
        hasData: inflow > 0 || outflow > 0 || spend.length > 0,
        spendByCategory: spend,
        wasteZones,
      };
    });
  }
}
