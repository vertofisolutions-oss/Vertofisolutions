import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { category, details } = body;

    // AI Simulation Core Processing (Mocked 2-second delay)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let decision = "WAIT";
    let riskScore = 50;
    let explanation = "";
    let financialImpact = {};
    let cashflowImpact = [];
    let profitSimulation = [];
    let taxEffect = "";
    let complianceImpact = "";
    let recommendation = "";

    // Required fields check logic (Missing Data Handling)
    if (category === "Hiring" && (!details.salary || !details.revenueContribution)) {
      return NextResponse.json({ success: false, missingData: true, requiredFields: ["Proposed Salary", "Expected Monthly Revenue Contribution"] }, { status: 400 });
    }
    if (category === "Capex" && (!details.purchasePrice || !details.paybackMonths)) {
      return NextResponse.json({ success: false, missingData: true, requiredFields: ["Purchase Price", "Target Payback Period (Months)"] }, { status: 400 });
    }
    if (category === "Loan" && (!details.amount || !details.interestRate)) {
      return NextResponse.json({ success: false, missingData: true, requiredFields: ["Loan Amount", "Interest Rate (%)"] }, { status: 400 });
    }

    // 1. Hiring Engine
    if (category === "Hiring") {
      const cost = Number(details.salary);
      const rev = Number(details.revenueContribution);
      const roi = rev / cost;

      if (roi > 2) {
        decision = "YES";
        riskScore = 15;
        explanation = "Revenue capacity comfortably supports the new hire. Expected ROI exceeds estimated cost by >2x.";
      } else if (roi >= 1.2) {
        decision = "DELAY";
        riskScore = 45;
        explanation = "The ROI is marginal. Delay hiring until revenue capacity increases or consider a contractor.";
      } else {
        decision = "NO";
        riskScore = 85;
        explanation = "High risk to cashflow. The projected revenue contribution does not cover the fully loaded HR costs.";
      }

      financialImpact = { initialCost: "₹15,000", recurringCost: `₹${cost}/mo`, profitImpact: `₹${rev - cost}/mo` };
      taxEffect = "Standard TDS deduction requirements. EPF/ESI compliance required.";
      complianceImpact = "Requires payroll registration updates if crossing employee thresholds.";
      recommendation = decision === "YES" ? "Proceed with hiring." : "Pause hiring. Review productivity of existing team.";
      
      for (let i = 1; i <= 12; i++) cashflowImpact.push({ month: `M${i}`, value: 100000 + (rev - cost) * i });
      for (let i = 1; i <= 12; i++) profitSimulation.push({ month: `M${i}`, current: 50000, proposed: 50000 + (rev - cost) * (i > 2 ? 1 : 0) });
    }

    // 2. Capex / Equipment
    else if (category === "Capex") {
      const price = Number(details.purchasePrice);
      decision = price > 500000 ? "NO" : "YES"; // Arbitrary rule for demo
      riskScore = price > 500000 ? 75 : 30;
      explanation = decision === "YES" ? "Payback period is well within 24 months. Improves operational efficiency." : "Capital outlay is too high for current liquidity levels.";
      financialImpact = { initialCost: `₹${price}`, recurringCost: "₹5,000/mo", profitImpact: "+12%" };
      taxEffect = "Eligible for Section 32 depreciation. GST ITC available on purchase.";
      complianceImpact = "Ensure e-way bill was generated for asset transit.";
      recommendation = decision === "YES" ? "Approve capital expenditure." : "Consider leasing instead of buying.";
      
      for (let i = 1; i <= 12; i++) cashflowImpact.push({ month: `M${i}`, value: 500000 - price + (20000 * i) });
      for (let i = 1; i <= 12; i++) profitSimulation.push({ month: `M${i}`, current: 80000, proposed: 80000 + 15000 });
    }

    // 3. Loan / Funding
    else if (category === "Loan") {
      const amount = Number(details.amount);
      const emi = (amount * (Number(details.interestRate)/100/12)) + (amount / 36); // Rough EMI for 3 yrs
      
      if (emi > 50000) {
        decision = "REDUCE AMOUNT";
        riskScore = 80;
        explanation = "EMI stress test failed. Projected cashflow cannot comfortably service this debt level.";
      } else {
        decision = "YES";
        riskScore = 35;
        explanation = "Debt-to-income ratio remains healthy. Interest benefits provide tax shield.";
      }
      financialImpact = { initialCost: "₹0", recurringCost: `₹${Math.round(emi)}/mo EMI`, profitImpact: `Interest cost: ₹${Math.round(emi*36 - amount)} total` };
      taxEffect = "Interest payments are tax-deductible under business expenses.";
      complianceImpact = "Requires maintaining debt schedules for annual audit.";
      recommendation = decision === "YES" ? "Proceed with loan application." : "Reduce loan principal to lower EMI burden.";
      
      for (let i = 1; i <= 12; i++) cashflowImpact.push({ month: `M${i}`, value: 200000 - (emi * i) });
      for (let i = 1; i <= 12; i++) profitSimulation.push({ month: `M${i}`, current: 60000, proposed: 60000 - (emi * 0.3) });
    }

    // Default Fallback Engine
    else {
      decision = "YES";
      riskScore = 40;
      explanation = "General strategic alignment looks positive based on standard benchmarks.";
      financialImpact = { initialCost: "TBD", recurringCost: "TBD", profitImpact: "Positive" };
      taxEffect = "Standard corporate tax rates apply.";
      complianceImpact = "Standard operational compliance.";
      recommendation = "Proceed with caution.";
      for (let i = 1; i <= 12; i++) cashflowImpact.push({ month: `M${i}`, value: 100000 + (10000 * i) });
      for (let i = 1; i <= 12; i++) profitSimulation.push({ month: `M${i}`, current: 50000, proposed: 55000 });
    }

    const aiResult = {
      decision,
      riskScore,
      explanation,
      financialImpact,
      cashflowImpact,
      profitSimulation,
      taxEffect,
      complianceImpact,
      recommendation,
      cpaStatus: "Awaiting CPA Review"
    };

    return NextResponse.json({ success: true, analysis: aiResult }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "AI Decision Engine failed" }, { status: 500 });
  }
}
