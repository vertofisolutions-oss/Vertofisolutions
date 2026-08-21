import { Injectable } from "@nestjs/common";
import { PgService, assertGrantedScope } from "@vertofi/nest-common";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";

const AI_URL = process.env.AI_GATEWAY_URL ?? "http://localhost:4010";

function scopeFor(p: Principal, orgId: string): EffectiveScope {
  if (p.role === "ADMIN") return { orgIds: "*", permission: "VIEW", scope: "FULL" };
  return { orgIds: [orgId], permission: "VIEW", scope: "FULL" };
}

export interface SimResult {
  decision: string;
  recommendation: "PROCEED" | "DELAY" | "AVOID";
  riskScore: number; // 0–100
  reasoning: string;
  signals: Record<string, number | null>;
  aiDegraded: boolean;
}

/**
 * Virtual Business Director™ / Voice CFO (docs/11 #5). Simulates the financial
 * impact of a decision (hire / invest / switch supplier) over REAL cashflow
 * signals, then asks the ai-gateway for an explanation. If AI is degraded the
 * deterministic verdict still stands — we never fabricate a narrative as fact.
 */
@Injectable()
export class VbdService {
  constructor(private readonly pg: PgService) {}

  async simulate(p: Principal, orgId: string, decision: string, monthlyImpact: number): Promise<SimResult> {
    const signals = await this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      const r = await c.query<{ inflow: string; outflow: string; days: string }>(
        `SELECT
            coalesce(sum(amount) FILTER (WHERE direction='CREDIT'),0) AS inflow,
            coalesce(sum(amount) FILTER (WHERE direction='DEBIT'),0) AS outflow,
            greatest(1, extract(day FROM (max(txn_date)::timestamp - min(txn_date)::timestamp))) AS days
           FROM reconciliation.bank_txns WHERE org_id=$1`,
        [orgId],
      );
      const row = r.rows[0]!;
      return { inflow: Number(row.inflow), outflow: Number(row.outflow), days: Number(row.days) };
    });

    const balance = signals.inflow - signals.outflow;
    const dailyBurn = signals.days > 0 ? signals.outflow / signals.days : 0;
    const runwayNow = dailyBurn > 0 ? Math.round(balance / dailyBurn) : null;
    // New monthly cost shortens runway.
    const newDailyBurn = dailyBurn + monthlyImpact / 30;
    const runwayAfter = newDailyBurn > 0 ? Math.round(balance / newDailyBurn) : null;

    let recommendation: SimResult["recommendation"] = "PROCEED";
    let riskScore = 30;
    if (runwayAfter !== null) {
      if (runwayAfter < 30) {
        recommendation = "AVOID";
        riskScore = 80;
      } else if (runwayAfter < 60) {
        recommendation = "DELAY";
        riskScore = 60;
      }
    } else {
      riskScore = 50; // unknown runway
    }

    const reasoning = await this.explain(orgId, decision, runwayNow, runwayAfter, recommendation);
    return {
      decision,
      recommendation,
      riskScore,
      reasoning: reasoning.text,
      aiDegraded: reasoning.degraded,
      signals: { balance, dailyBurn, runwayNow, runwayAfter },
    };
  }

  private async explain(
    orgId: string,
    decision: string,
    runwayNow: number | null,
    runwayAfter: number | null,
    recommendation: string,
  ): Promise<{ text: string; degraded: boolean }> {
    const fallback = `Recommendation: ${recommendation}. Cash runway moves from ${runwayNow ?? "unknown"} to ${runwayAfter ?? "unknown"} days with this decision.`;
    try {
      const res = await fetch(`${AI_URL}/ai/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "analyze",
          org_id: orgId,
          plan: "PRO",
          prompt: `As a CFO, briefly explain a ${recommendation} recommendation for this decision: "${decision}". Cash runway changes from ${runwayNow} to ${runwayAfter} days. 2 sentences.`,
        }),
      });
      const body = (await res.json()) as { degraded?: boolean; content?: { text?: string } };
      if (body.degraded || !body.content?.text) return { text: fallback, degraded: true };
      return { text: body.content.text, degraded: false };
    } catch {
      return { text: fallback, degraded: true };
    }
  }
}
