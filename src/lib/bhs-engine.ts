// BHS Calculation Engine (Based on PDF V3.0)

export type BusinessType = "SoleProp" | "Partnership" | "PvtLtd" | "Manufacturing" | "Retail" | "Services";
export type Seasonality = "NonSeasonal" | "Seasonal";

export interface BHSFormData {
  // Setup
  businessType: BusinessType;
  seasonality: Seasonality;
  
  // Pillar 1: EDS
  expenseVariancePct: number | null; // e.g., 5 for 5%
  undocumentedExpensesPct: number | null;
  nonBusinessExpensePct: number | null;
  duplicatePayments: number | null; // count
  cashExpensePct: number | null;
  singleVendorSpendPct: number | null;
  expenseSpikeDetected: boolean;
  
  // Pillar 2: TCH
  gstLateReturns: number | null; // days total late per return or max
  tdsLateDays: number | null;
  advanceTaxShortfallPct: number | null;
  taxPenaltiesPaid: number | null; // count
  noticesReceived: number | null; // count
  unresolvedNotices: number | null; // count
  
  // Pillar 3: CSS
  cashBufferMonths: number | null;
  actualDebtorDays: number | null;
  industryBenchmarkDays: number | null;
  negativeCashflowWeeks: number | null;
  emiToRevenuePct: number | null;
  avgVendorPaymentDelayDays: number | null;
  
  // Pillar 4: GFA
  gstr1vs3BVariancePct: number | null;
  gstr2BvsITCMismatchPct: number | null;
  missingInvoicesGstr1: number | null; // count
  hsnSacErrors: number | null; // count
  blockedItcClaims: number | null; // count
  
  // Pillar 5: PCS
  salaryDelayDaysAvg: number | null;
  pfEsiLateDays: number | null; // N/A if < 10 employees, but handle in form
  attendanceVariancePct: number | null; // null if no HRMS
  headcountChangePct: number | null;
  cashSalaryPct: number | null;
  
  // Pillar 6: DRM
  dscr: number | null; // Ratio like 1.5, 2.0
  missedEmis: number | null; // count
  odUtilisationPct: number | null;
  highInterestDebtPct: number | null;
  relatedPartyUndocumentedLoans: boolean;
  
  // Pillar 7: PLC
  leakagePct: number | null;
  expenseAnomaliesCount: number | null;
  unbilledSalesPct: number | null;
  excessiveDiscountPattern: boolean;
  unexplainedCashWithdrawals: number | null; // count
}

const defaultWeights: Record<BusinessType, number[]> = {
  // [EDS, TCH, CSS, GFA, PCS, DRM, PLC]
  SoleProp:      [22, 20, 25, 15, 0,  8,  10],
  Partnership:   [20, 18, 22, 12, 8,  12, 8],
  PvtLtd:        [18, 15, 20, 12, 12, 13, 10],
  Manufacturing: [18, 12, 22, 10, 8,  20, 10],
  Retail:        [20, 15, 25, 12, 8,  12, 8],
  Services:      [15, 18, 22, 12, 15, 10, 8]
};

function scoreMap(val: number, thresholds: {limit: number, score: number}[]): number {
  for (const t of thresholds) {
    if (val < t.limit) return t.score;
  }
  return thresholds[thresholds.length - 1].score;
}

export function calculateBHS(data: Partial<BHSFormData>): {
  score: number;
  band: string;
  pillarScores: Record<string, number>;
} {
  const safeData = data as BHSFormData;
  
  // Base normalization function
  const norm = (val: number) => Math.max(0, Math.min(100, val));
  
  // --- Pillar 1: EDS ---
  let v1 = scoreMap(safeData.expenseVariancePct || 0, [
    {limit: 5, score: 100}, {limit: 10, score: 85}, {limit: 20, score: 65}, {limit: 30, score: 40}, {limit: Infinity, score: 10}
  ]);
  let v2 = scoreMap(safeData.undocumentedExpensesPct || 0, [
    {limit: 5, score: 100}, {limit: 10, score: 75}, {limit: 20, score: 50}, {limit: Infinity, score: 20}
  ]);
  let v3 = scoreMap(safeData.nonBusinessExpensePct || 0, [
    {limit: 3, score: 100}, {limit: 5, score: 80}, {limit: 10, score: 60}, {limit: Infinity, score: 20}
  ]);
  let v4 = Math.max(0, 100 - (safeData.duplicatePayments || 0) * 15 - ((safeData.duplicatePayments || 0) >= 3 ? 40 : 0));
  let v5 = scoreMap(safeData.cashExpensePct || 0, [
    {limit: 10, score: 100}, {limit: 20, score: 75}, {limit: 35, score: 50}, {limit: Infinity, score: 20}
  ]);
  let v6 = scoreMap(safeData.singleVendorSpendPct || 0, [
    {limit: 60, score: 100}, {limit: 80, score: 50}, {limit: Infinity, score: 30}
  ]);
  if (safeData.businessType === "SoleProp") v6 = 100; // No vendor dependency check
  
  let v7 = safeData.expenseSpikeDetected ? 80 : 100;
  
  let edsNorm = norm(v1*0.20 + v2*0.20 + v3*0.15 + v4*0.15 + v5*0.10 + v6*0.10 + v7*0.10);

  // --- Pillar 2: TCH ---
  let t1 = Math.max(0, 100 - (safeData.gstLateReturns || 0) * 3);
  let t2 = Math.max(0, 100 - (safeData.tdsLateDays || 0) * 4);
  let t3 = 100;
  if ((safeData.advanceTaxShortfallPct || 0) > 25) t3 = 65;
  else if ((safeData.advanceTaxShortfallPct || 0) > 10) t3 = 80;
  let t4 = Math.max(0, 100 - (safeData.taxPenaltiesPaid || 0) * 8);
  let t5 = Math.max(0, 100 - (safeData.unresolvedNotices || 0) * 12 - (Math.max(0, (safeData.noticesReceived || 0) - (safeData.unresolvedNotices || 0))) * 6);
  
  let tchNorm = norm(t1*0.28 + t2*0.22 + t3*0.18 + t4*0.17 + t5*0.15);

  // --- Pillar 3: CSS ---
  let c1 = scoreMap(safeData.cashBufferMonths || 0, [
    {limit: 0.5, score: 10}, {limit: 1, score: 35}, {limit: 2, score: 60}, {limit: 3, score: 80}, {limit: Infinity, score: 100}
  ]);
  if (safeData.businessType === "SoleProp") {
    c1 = scoreMap(safeData.cashBufferMonths || 0, [
       {limit: 0.5, score: 35}, {limit: 1, score: 60}, {limit: 1.5, score: 80}, {limit: Infinity, score: 100}
    ]);
  }
  let c2 = 100;
  if ((safeData.actualDebtorDays || 0) > 0 && (safeData.industryBenchmarkDays || 0) > 0) {
    c2 = Math.min(100, Math.round(((safeData.industryBenchmarkDays as number) / (safeData.actualDebtorDays as number)) * 100));
  }
  let c3 = scoreMap(safeData.negativeCashflowWeeks || 0, [
    {limit: 1, score: 100}, {limit: 2, score: 75}, {limit: 3, score: 50}, {limit: 4, score: 25}, {limit: Infinity, score: 0}
  ]);
  let c4 = scoreMap(safeData.emiToRevenuePct || 0, [
    {limit: 15, score: 100}, {limit: 25, score: 75}, {limit: 35, score: 50}, {limit: 45, score: 25}, {limit: Infinity, score: 0}
  ]);
  let c5 = scoreMap(safeData.avgVendorPaymentDelayDays || 0, [
    {limit: 1, score: 100}, {limit: 31, score: 100 - (safeData.avgVendorPaymentDelayDays || 0)}, {limit: 61, score: 50}, {limit: Infinity, score: 20} // simplified approximation
  ]);
  
  let cssNorm = norm(c1*0.28 + c2*0.25 + c3*0.20 + c4*0.15 + c5*0.12);

  // --- Pillar 4: GFA ---
  let g1 = scoreMap(safeData.gstr1vs3BVariancePct || 0, [
    {limit: 1, score: 100}, {limit: 3, score: 75}, {limit: 5, score: 50}, {limit: Infinity, score: 20}
  ]);
  let g2 = scoreMap(safeData.gstr2BvsITCMismatchPct || 0, [
    {limit: 2, score: 100}, {limit: 5, score: 75}, {limit: 10, score: 50}, {limit: Infinity, score: 20}
  ]);
  let g3 = Math.max(0, 100 - (safeData.missingInvoicesGstr1 || 0) * 5);
  let g4 = Math.max(0, 100 - (safeData.hsnSacErrors || 0) * 3 - ((safeData.hsnSacErrors || 0) >= 3 ? 15 : 0));
  let g5 = Math.max(0, 100 - (safeData.blockedItcClaims || 0) * 20);
  
  let gfaNorm = norm(g1*0.28 + g2*0.28 + g3*0.18 + g4*0.14 + g5*0.12);

  // --- Pillar 5: PCS ---
  let p1 = Math.max(0, 100 - (safeData.salaryDelayDaysAvg || 0) * 10);
  let p2 = Math.max(0, 100 - (safeData.pfEsiLateDays || 0) * 5);
  let p3 = safeData.attendanceVariancePct !== null ? (safeData.attendanceVariancePct > 5 ? 80 : 100) : null;
  let p4 = (safeData.headcountChangePct || 0) > 20 ? 85 : 100;
  let p5 = scoreMap(safeData.cashSalaryPct || 0, [
    {limit: 15, score: 100}, {limit: 30, score: 70}, {limit: 50, score: 40}, {limit: Infinity, score: 15}
  ]);
  
  let pcsNorm = 100;
  if (safeData.businessType !== "SoleProp") {
    if (p3 === null) {
      pcsNorm = norm(p1*0.40 + p2*0.30 + p4*0.20 + p5*0.10);
    } else {
      pcsNorm = norm(p1*0.30 + p2*0.25 + p3*0.20 + p4*0.15 + p5*0.10);
    }
  }

  // --- Pillar 6: DRM ---
  let d1 = scoreMap((safeData.dscr === null ? 3.0 : safeData.dscr) * -1, [ // invert for scoreMap logic
    {limit: -3.0, score: 100}, {limit: -2.0, score: 85}, {limit: -1.5, score: 70}, {limit: -1.25, score: 55}, {limit: -1.0, score: 35}, {limit: Infinity, score: 10}
  ]);
  if (safeData.dscr === null) d1 = 100;
  let d2 = Math.max(0, 100 - (safeData.missedEmis || 0) * 25);
  let d3 = scoreMap(safeData.odUtilisationPct || 0, [
    {limit: 50, score: 100}, {limit: 70, score: 75}, {limit: 85, score: 50}, {limit: 95, score: 25}, {limit: Infinity, score: 0}
  ]);
  let d4 = scoreMap(safeData.highInterestDebtPct || 0, [
    {limit: 10, score: 100}, {limit: 25, score: 75}, {limit: 50, score: 50}, {limit: Infinity, score: 20}
  ]);
  let d5 = safeData.relatedPartyUndocumentedLoans ? 80 : 100;
  
  let drmNorm = norm(d1*0.35 + d2*0.25 + d3*0.20 + d4*0.10 + d5*0.10);

  // --- Pillar 7: PLC ---
  let l1 = scoreMap(safeData.leakagePct || 0, [
    {limit: 0.5, score: 100}, {limit: 1, score: 85}, {limit: 2, score: 65}, {limit: 3, score: 45}, {limit: 5, score: 25}, {limit: Infinity, score: 10}
  ]);
  let l2 = Math.max(0, 100 - (safeData.expenseAnomaliesCount || 0) * 10);
  let l3 = Math.max(0, 100 - (safeData.unbilledSalesPct || 0) * 25);
  let l4 = safeData.excessiveDiscountPattern ? 80 : 100;
  let l5 = Math.max(0, 100 - (safeData.unexplainedCashWithdrawals || 0) * 15);
  
  let plcNorm = norm(l1*0.25 + l2*0.22 + l3*0.18 + l4*0.18 + l5*0.17);

  // Apply weight redistributions based on business type
  let weights = [...defaultWeights[safeData.businessType || "PvtLtd"]];
  let finalScore = 0;
  
  // Specific override for SoleProp (0 for PCS, redistributed +5 to EDS, +5 to CSS)
  if (safeData.businessType === "SoleProp") {
    weights[0] += 5; // EDS
    weights[2] += 5; // CSS
    weights[4] = 0;  // PCS
  }
  
  finalScore = (edsNorm * weights[0] + tchNorm * weights[1] + cssNorm * weights[2] + gfaNorm * weights[3] + pcsNorm * weights[4] + drmNorm * weights[5] + plcNorm * weights[6]) / 100;
  finalScore = Math.round(finalScore * 10) / 10;
  
  let band = "Critical";
  if (finalScore >= 85) band = "Excellent";
  else if (finalScore >= 71) band = "Healthy";
  else if (finalScore >= 55) band = "Moderate";
  else if (finalScore >= 40) band = "Weak";
  else if (finalScore >= 20) band = "Poor";

  return {
    score: finalScore,
    band,
    pillarScores: {
      EDS: Math.round(edsNorm),
      TCH: Math.round(tchNorm),
      CSS: Math.round(cssNorm),
      GFA: Math.round(gfaNorm),
      PCS: Math.round(pcsNorm),
      DRM: Math.round(drmNorm),
      PLC: Math.round(plcNorm)
    }
  };
}
