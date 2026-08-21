/**
 * Vertofi Internal Risk Score engine (docs/07). Deterministic, explainable
 * scoring computed from collected onboarding data + risk answers. No fabricated
 * numbers — every output derives from real submitted fields.
 */
export interface OnboardingData {
  stage1: Record<string, unknown>;
  stage2: Record<string, unknown>;
  stage3: Record<string, unknown>;
  riskAnswers: RiskAnswers;
}

export interface RiskAnswers {
  gstNotice?: boolean;
  itNotice?: boolean;
  tdsNotice?: boolean;
  cashflowProblems?: boolean;
  pendingGstFilings?: boolean;
  pendingItr?: boolean;
  vendorDisputes?: boolean;
  loanDefaults?: boolean;
}

export interface OnboardingScore {
  completeness: number; // 0–100
  financialMaturity: "LOW" | "MEDIUM" | "HIGH";
  complianceRisk: "LOW" | "MEDIUM" | "HIGH";
  cashflowRisk: "LOW" | "MEDIUM" | "HIGH";
  confidenceScore: number; // 0–100
}

/** Required fields per stage that contribute to completeness. */
const STAGE1_FIELDS = ["legalName", "businessType", "industry", "pan", "gstin", "ownerName", "ownerMobile", "ownerEmail"];
const STAGE2_FIELDS = ["bankName", "ifsc", "accountNumber", "bankStatementMonths", "gstr1Months", "gstr3bMonths"];
const STAGE3_FIELDS = ["revenueRange", "topVendors", "payrollSummary", "existingSoftware"];

function presentCount(obj: Record<string, unknown>, fields: string[]): number {
  return fields.filter((f) => {
    const v = obj[f];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;
}

function band(score: number): "LOW" | "MEDIUM" | "HIGH" {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function computeScore(data: OnboardingData): OnboardingScore {
  const total = STAGE1_FIELDS.length + STAGE2_FIELDS.length + STAGE3_FIELDS.length;
  const present =
    presentCount(data.stage1, STAGE1_FIELDS) +
    presentCount(data.stage2, STAGE2_FIELDS) +
    presentCount(data.stage3, STAGE3_FIELDS);
  const completeness = Math.round((present / total) * 100);

  // Financial maturity: more historical data + accounting docs → higher.
  const bankMonths = Number(data.stage2.bankStatementMonths ?? 0);
  const hasAccountingDocs = Boolean(data.stage2.profitLoss || data.stage2.balanceSheet);
  const maturityScore = Math.min(100, bankMonths * 6 + (hasAccountingDocs ? 30 : 0));
  const financialMaturity = band(maturityScore);

  // Compliance risk: notices + pending filings raise risk (so invert for "low risk").
  const r = data.riskAnswers;
  const complianceHits =
    (r.gstNotice ? 1 : 0) + (r.itNotice ? 1 : 0) + (r.tdsNotice ? 1 : 0) +
    (r.pendingGstFilings ? 1 : 0) + (r.pendingItr ? 1 : 0);
  const complianceRisk = complianceHits >= 3 ? "HIGH" : complianceHits >= 1 ? "MEDIUM" : "LOW";

  // Cashflow risk: problems / disputes / defaults.
  const cashflowHits = (r.cashflowProblems ? 1 : 0) + (r.vendorDisputes ? 1 : 0) + (r.loanDefaults ? 1 : 0);
  const cashflowRisk = cashflowHits >= 2 ? "HIGH" : cashflowHits >= 1 ? "MEDIUM" : "LOW";

  // Confidence = completeness weighted, penalized by risk exposure.
  const riskPenalty = (complianceHits + cashflowHits) * 4;
  const confidenceScore = Math.max(0, Math.min(100, Math.round(completeness * 0.85 + maturityScore * 0.15 - riskPenalty)));

  return { completeness, financialMaturity, complianceRisk, cashflowRisk, confidenceScore };
}
