import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { action, amount, date, metadata, orgId = "demo-business-org" } = body;

    let result: any = {
      scenarioA: {},
      scenarioB: {},
      delta: 0,
      percentageChange: 0,
      confidence: 0,
      recommendation: "",
      impactType: ""
    };

    const amt = Number(amount || 0);

    // --- 1. Invoice Timing Simulator ---
    if (action === "INVOICE") {
      // Logic based on PDF pseudocode:
      // projected_tax_if_invoice_now vs projected_tax_if_invoice_next_month
      // Simplification: assume 30% tax bracket.
      const currentTaxLiability = 120000; // Mock current liability
      const taxRateNow = 0.30;
      const taxRateNextMonth = 0.25; // Assumption: pushing to next quarter/year or lower bracket

      const taxIfNow = currentTaxLiability + (amt * taxRateNow);
      const taxIfNextMonth = currentTaxLiability + (amt * taxRateNextMonth);

      const delta = taxIfNow - taxIfNextMonth;
      const percentageChange = ((delta / taxIfNextMonth) * 100);

      result = {
        scenarioA: { label: "Invoice Now", projectedTax: taxIfNow, cashflowImpact: amt },
        scenarioB: { label: "Invoice Next Month", projectedTax: taxIfNextMonth, cashflowImpact: 0 },
        delta: delta,
        percentageChange: percentageChange,
        confidence: 82,
        impactType: "Tax Liability",
        recommendation: percentageChange >= 20 
          ? "Delaying this invoice reduces bracket impact significantly. Splitting the invoice is also recommended." 
          : "Tax impact is minimal. Invoicing now is optimal for cash flow."
      };
    }

    // --- 2. Payroll Simulator ---
    else if (action === "PAYROLL") {
      const newHires = Number(metadata?.employees || 1);
      const averageSalary = amt; // Total new payroll
      
      const tdsRate = 0.10;
      const pfRate = 0.12; // Employer PF

      const addedTDS = averageSalary * tdsRate;
      const addedPF = averageSalary * pfRate;
      const totalLiability = addedTDS + addedPF;

      // Mock cashflow calculation
      const cashBalance = 500000; 
      const currentBurn = 300000;
      const newBurn = currentBurn + averageSalary + addedPF;
      
      const currentHeadroom = Math.floor(cashBalance / (currentBurn / 30));
      const newHeadroom = Math.floor(cashBalance / (newBurn / 30));
      const daysLost = currentHeadroom - newHeadroom;

      result = {
        scenarioA: { label: "Current Payroll", tdsAndPf: 25000, cashHeadroomDays: currentHeadroom },
        scenarioB: { label: `Add ${newHires} Employees`, tdsAndPf: 25000 + totalLiability, cashHeadroomDays: newHeadroom },
        delta: totalLiability,
        percentageChange: (totalLiability / 25000) * 100,
        confidence: 95,
        impactType: "Obligations & Runway",
        recommendation: daysLost >= 7 
          ? `Adding these employees will raise monthly TDS/PF obligations by ₹${totalLiability.toLocaleString('en-IN')} and reduce free cash balance by ${daysLost} days. Suggest phasing hires or negotiating net salary structure.` 
          : "Cash reserves are sufficient to absorb this payroll increase safely."
      };
    }

    // --- 3. Generic What-If Builder (Loan / Purchase) ---
    else {
      // Provide a generic response for loan or large purchases
      const cashImpact = action === "LOAN" ? amt : -amt;
      const taxImpact = action === "PURCHASE" ? -(amt * 0.18) : 0; // Assuming GST input credit

      result = {
        scenarioA: { label: "Current Trajectory", projectedTax: 120000, cashBalance: 500000 },
        scenarioB: { label: `After ${action}`, projectedTax: 120000 + taxImpact, cashBalance: 500000 + cashImpact },
        delta: Math.abs(taxImpact || cashImpact),
        percentageChange: 15,
        confidence: 70,
        impactType: action === "PURCHASE" ? "GST Credit" : "Cash Position",
        recommendation: "Action registered in forecast. Ensure all documentation is filed correctly to claim potential credits."
      };
    }

    // Optionally save the simulation to audit trail
    serverDb.insert("tax_simulations", orgId, {
      action,
      amount: amt,
      date,
      metadata,
      result,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
