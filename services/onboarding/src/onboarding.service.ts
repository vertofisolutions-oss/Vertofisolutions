import { Injectable, NotFoundException } from "@nestjs/common";
import { PgService, assertGrantedScope } from "@vertofi/nest-common";
import { setRlsContext, type EffectiveScope, type Principal } from "@vertofi/tenancy";
import { computeScore, type RiskAnswers } from "./confidence.js";

/** Effective scope for self-service onboarding (own org, or all for ADMIN). */
function scopeFor(principal: Principal, orgId: string): EffectiveScope {
  if (principal.role === "ADMIN") return { orgIds: "*", permission: "EDIT", scope: "FULL" };
  return { orgIds: [orgId], permission: "EDIT", scope: "FULL" };
}

export interface ProfileRow {
  org_id: string;
  stage: number;
  completeness: number;
  confidence_score: number | null;
  financial_maturity: string | null;
  compliance_risk: string | null;
  cashflow_risk: string | null;
  stage1: Record<string, unknown>;
  stage2: Record<string, unknown>;
  stage3: Record<string, unknown>;
  sections: Record<string, Record<string, unknown>>;
  risk_answers: RiskAnswers;
  selected_professional_id: string | null;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly pg: PgService) {}

  /** All writes/reads run inside an RLS-scoped transaction (docs/04). */
  private run<T>(principal: Principal, orgId: string, fn: (q: (t: string, p?: unknown[]) => Promise<ProfileRow[]>) => Promise<T>): Promise<T> {
    return this.pg.transaction(async (client) => {
      await setRlsContext(client, principal, await assertGrantedScope(client, principal, orgId, "VIEW"));
      const q = async (t: string, p?: unknown[]) => (await client.query<ProfileRow>(t, p as never[])).rows;
      return fn(q);
    });
  }

  async getOrCreate(principal: Principal, orgId: string): Promise<ProfileRow> {
    return this.run(principal, orgId, async (q) => {
      const existing = await q("SELECT * FROM onboarding.onboarding_profiles WHERE org_id = $1", [orgId]);
      if (existing[0]) return existing[0];
      const created = await q(
        "INSERT INTO onboarding.onboarding_profiles (org_id) VALUES ($1) RETURNING *",
        [orgId],
      );
      return created[0]!;
    });
  }

  async saveStage(principal: Principal, orgId: string, stage: 1 | 2 | 3, payload: Record<string, unknown>): Promise<ProfileRow> {
    const col = `stage${stage}`;
    return this.run(principal, orgId, async (q) => {
      const rows = await q(
        `INSERT INTO onboarding.onboarding_profiles (org_id, stage, ${col})
           VALUES ($1, $2, $3)
         ON CONFLICT (org_id) DO UPDATE
           SET ${col} = EXCLUDED.${col},
               stage = GREATEST(onboarding.onboarding_profiles.stage, $2),
               updated_at = now()
         RETURNING *`,
        [orgId, stage, JSON.stringify(payload)],
      );
      return rows[0]!;
    });
  }

  /** V3 enterprise wizard autosave: merge one section into the jsonb doc. */
  async saveSection(principal: Principal, orgId: string, key: string, payload: Record<string, unknown>): Promise<ProfileRow> {
    return this.run(principal, orgId, async (q) => {
      const rows = await q(
        `INSERT INTO onboarding.onboarding_profiles (org_id, sections)
           VALUES ($1, jsonb_build_object($2::text, $3::jsonb))
         ON CONFLICT (org_id) DO UPDATE
           SET sections = onboarding.onboarding_profiles.sections || jsonb_build_object($2::text, $3::jsonb),
               updated_at = now()
         RETURNING *`,
        [orgId, key, JSON.stringify(payload)],
      );
      return rows[0]!;
    });
  }

  async saveRiskAnswers(principal: Principal, orgId: string, answers: RiskAnswers): Promise<ProfileRow> {
    return this.run(principal, orgId, async (q) => {
      const rows = await q(
        `UPDATE onboarding.onboarding_profiles SET risk_answers = $2, updated_at = now()
         WHERE org_id = $1 RETURNING *`,
        [orgId, JSON.stringify(answers)],
      );
      if (!rows[0]) throw new NotFoundException("profile_not_found");
      return rows[0];
    });
  }

  async selectProfessional(principal: Principal, orgId: string, professionalId: string): Promise<void> {
    await this.run(principal, orgId, async (q) => {
      await q(
        "UPDATE onboarding.onboarding_profiles SET selected_professional_id = $2, updated_at = now() WHERE org_id = $1",
        [orgId, professionalId],
      );
      return [] as ProfileRow[];
    });
    // NOTE: emits onboarding.professional_selected via outbox → access service
    // auto-creates the grant for the chosen associate (docs/08 access-service).
  }

  /** Finalize: compute the Vertofi Internal Risk Score from stored data. */
  async complete(principal: Principal, orgId: string): Promise<ProfileRow> {
    return this.run(principal, orgId, async (q) => {
      const rows = await q("SELECT * FROM onboarding.onboarding_profiles WHERE org_id = $1", [orgId]);
      const p = rows[0];
      if (!p) throw new NotFoundException("profile_not_found");
      const score = computeScore({
        stage1: p.stage1,
        stage2: p.stage2,
        stage3: p.stage3,
        riskAnswers: p.risk_answers,
      });
      const updated = await q(
        `UPDATE onboarding.onboarding_profiles
           SET completeness = $2, financial_maturity = $3, compliance_risk = $4,
               cashflow_risk = $5, confidence_score = $6, updated_at = now()
         WHERE org_id = $1 RETURNING *`,
        [orgId, score.completeness, score.financialMaturity, score.complianceRisk, score.cashflowRisk, score.confidenceScore],
      );
      return updated[0]!;
    });
  }
}
