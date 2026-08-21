/**
 * Business Health Score computation (docs/11 #1). A weighted 0–100 composite
 * over real sub-signals. Returns null when there is insufficient data — we do
 * NOT invent a score for an empty business (docs/00).
 */
export interface BhsInputs {
  entryCount: number; // posted ledger entries (data sufficiency signal)
  income: number;
  expense: number;
  reconciledRatio: number; // 0..1 share of items reconciled
  gstFilingOnTime: number | null; // 0..1, null if unknown
  unmatchedCount: number;
  exceptionCount: number;
}

export interface BhsResult {
  score: number | null;
  rating: "EXCELLENT" | "HEALTHY" | "NEEDS_ATTENTION" | "AT_RISK" | "INSUFFICIENT";
  subScores: Record<string, number | null>;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeBhs(i: BhsInputs): BhsResult {
  // Require a minimum of real activity before scoring.
  if (i.entryCount < 3) {
    return { score: null, rating: "INSUFFICIENT", subScores: {} };
  }

  // Profitability: positive margin scores well.
  const margin = i.income > 0 ? (i.income - i.expense) / i.income : -1;
  const profitability = clamp((margin + 0.5) * 100); // margin 0 → 50, 0.5 → 100

  // Expense discipline: penalize expense > income.
  const expenseDiscipline = clamp(i.income > 0 ? Math.min(100, (i.income / Math.max(i.expense, 1)) * 60) : 30);

  // Reconciliation hygiene: how much is matched.
  const reconHygiene = clamp(i.reconciledRatio * 100);

  // Compliance: GST filing punctuality (neutral 50 when unknown).
  const compliance = i.gstFilingOnTime === null ? 50 : clamp(i.gstFilingOnTime * 100);

  // Risk drag: open exceptions + unmatched reduce health.
  const riskDrag = clamp(100 - (i.exceptionCount * 5 + i.unmatchedCount * 2));

  const subScores = { profitability, expenseDiscipline, reconHygiene, compliance, riskDrag };

  // Weighted composite.
  const score = clamp(
    profitability * 0.3 +
      expenseDiscipline * 0.2 +
      reconHygiene * 0.2 +
      compliance * 0.2 +
      riskDrag * 0.1,
  );

  const rating =
    score >= 80 ? "EXCELLENT" : score >= 60 ? "HEALTHY" : score >= 40 ? "NEEDS_ATTENTION" : "AT_RISK";

  return { score, rating, subScores };
}
