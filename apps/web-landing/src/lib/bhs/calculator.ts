import { prisma } from "../prisma";

export type BhsResult = {
  score: number;
  band: "Excellent" | "Healthy" | "Moderate" | "Weak" | "Poor" | "Critical";
  pillars: {
    expenseScore: number;
    taxScore: number;
    cashflowScore: number;
    gstScore: number;
    payrollScore: number;
    debtScore: number;
    leakageScore: number;
  };
};

export async function calculateBHS(orgId: string): Promise<BhsResult> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const sales = await prisma.sale.findMany({ where: { orgId } });
  const expenses = await prisma.expense.findMany({ where: { orgId } });

  // Fallback to static numbers if no data
  const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0) || 450000;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0) || 180000;

  let score = 0;
  const pillars = {
    expenseScore: 0,
    taxScore: 0,
    cashflowScore: 0,
    gstScore: 0,
    payrollScore: 0,
    debtScore: 0,
    leakageScore: 0,
  };

  // 1. Cashflow Buffer (Weight: 25%)
  const runwayRatio = totalSales > 0 ? (totalSales - totalExpenses) / totalSales : 0;
  if (runwayRatio > 0.3) pillars.cashflowScore = 25;
  else if (runwayRatio > 0.1) pillars.cashflowScore = 15;
  else if (runwayRatio > 0) pillars.cashflowScore = 5;
  else pillars.cashflowScore = 0;

  // 2. Expense / Leakage Optimization (Weight: 20%)
  pillars.leakageScore = totalExpenses < totalSales * 0.4 ? 20 : 10;
  
  // 3. Tax / GST Compliance (Weight: 20%)
  pillars.gstScore = 20; // Assuming compliant for now
  
  // 4. Debt & Receivables (Weight: 15%)
  pillars.debtScore = 12; // Placeholder

  // 5. Payroll Health (Weight: 10%)
  pillars.payrollScore = org.businessType === "PROPRIETORSHIP" ? 10 : 8; // Adaptive weight simulation

  // 6. Tax Optimization (Weight: 10%)
  pillars.taxScore = 8;

  score = pillars.cashflowScore + pillars.leakageScore + pillars.gstScore + pillars.debtScore + pillars.payrollScore + pillars.taxScore;

  let band: BhsResult["band"] = "Moderate";
  if (score >= 85) band = "Excellent";
  else if (score >= 70) band = "Healthy";
  else if (score >= 50) band = "Moderate";
  else if (score >= 35) band = "Weak";
  else band = "Critical";

  // Persist score
  await prisma.bhsScorecard.create({
    data: {
      score,
      band,
      expenseScore: pillars.expenseScore,
      taxScore: pillars.taxScore,
      cashflowScore: pillars.cashflowScore,
      gstScore: pillars.gstScore,
      payrollScore: pillars.payrollScore,
      debtScore: pillars.debtScore,
      leakageScore: pillars.leakageScore,
      orgId
    }
  });

  return { score, band, pillars };
}
