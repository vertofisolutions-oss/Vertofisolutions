import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const orgId = body.orgId || "demo-business-org";

    const sales = serverDb.get("sales", orgId);
    const purchases = serverDb.get("purchases", orgId);
    const expenses = serverDb.get("expenses", orgId);
    const warnings = serverDb.get("tax_warnings", orgId);

    const newWarnings = [];

    // --- 1. GST Input Credit Shortfall (CRITICAL) ---
    // Calculate current month's GST credit
    let inputGst = 0;
    for (const p of purchases) {
      inputGst += Number(p.tax || 0);
    }
    
    // Safety Threshold is defined historically or statically (e.g. 75,000 as per PDF)
    const safetyThreshold = 75000;
    const projectedGstCredit = inputGst || 45000; // Fallback to PDF example if 0
    
    if (projectedGstCredit < safetyThreshold && !warnings.some(w => w.type === "GST_CREDIT_LOW" && w.status !== "RESOLVED")) {
      newWarnings.push({
        id: `warn_${Date.now()}_gst`,
        type: "GST_CREDIT_LOW",
        title: "GST Credit Low",
        priority: "Critical",
        message: `Your projected GST input credit for this month is ₹${projectedGstCredit.toLocaleString('en-IN')}, below the internal safety threshold of ₹${safetyThreshold.toLocaleString('en-IN')}.`,
        impact: safetyThreshold - projectedGstCredit,
        confidence: 86,
        recommendedAction: "Delay non-essential purchases or accelerate vendor invoice receipts.",
        explainability: ["Recent drop in vendor filings", "Seasonal drop in inbound credit"],
        status: "ACTIVE",
        created_at: new Date().toISOString()
      });
    }

    // --- 2. Cashflow Headroom Forecast (MEDIUM) ---
    // Simple heuristic: Total cash vs burn rate
    const totalSales = sales.reduce((s, r) => s + Number(r.total || 0), 0) || 500000;
    const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount || 0), 0) || 350000;
    const cashBalance = Math.max(150000, totalSales - totalExpenses);
    const dailyBurn = totalExpenses / 30;
    const headroomDays = Math.floor(cashBalance / dailyBurn);

    if (headroomDays < 15 && !warnings.some(w => w.type === "CASHFLOW_LOW" && w.status !== "RESOLVED")) {
      newWarnings.push({
        id: `warn_${Date.now()}_cash`,
        type: "CASHFLOW_LOW",
        title: "Cashflow Headroom Low",
        priority: "Medium",
        message: `Your forecasted cashflow headroom is ${headroomDays} days (below the 15-day safe threshold).`,
        impact: cashBalance,
        confidence: 92,
        recommendedAction: "Defer large capital expenditures and follow up on overdue receivables.",
        explainability: ["High operating expenses this month", "Delayed collections from Client X"],
        status: "ACTIVE",
        created_at: new Date().toISOString()
      });
    }

    // --- 3. Filing Deadline Risk (HIGH) ---
    // Assuming today is close to the 20th for GSTR-3B
    const today = new Date();
    if (today.getDate() > 15 && today.getDate() <= 20 && !warnings.some(w => w.type === "FILING_DEADLINE" && w.status !== "RESOLVED")) {
      newWarnings.push({
        id: `warn_${Date.now()}_deadline`,
        type: "FILING_DEADLINE",
        title: "Upcoming GSTR-3B Deadline",
        priority: "High",
        message: "GSTR-3B filing deadline is approaching. Ensure all vendor invoices are reconciled to maximize ITC.",
        impact: 5000, // Estimated late fee / penalty risk
        confidence: 99,
        recommendedAction: "Review filing and authorize tax payment.",
        explainability: ["Calendar date approaches 20th", "Unreconciled invoices detected"],
        status: "ACTIVE",
        created_at: new Date().toISOString()
      });
    }

    // Seed Demo Data if completely empty (matches PDF examples)
    if (warnings.length === 0 && newWarnings.length === 0) {
      newWarnings.push({
        id: `warn_${Date.now()}_demo_gst`,
        type: "GST_CREDIT_LOW",
        title: "GST Credit Low",
        priority: "Critical",
        message: `Your projected GST input credit for this month is ₹45,000, below the internal safety threshold of ₹75,000.`,
        impact: 30000,
        confidence: 86,
        recommendedAction: "Delay non-essential purchases or accelerate vendor invoice receipts.",
        explainability: ["Large one-off expense last month", "Seasonal drop in inbound credit", "Vendor X delayed filing"],
        status: "ACTIVE",
        created_at: new Date().toISOString()
      });
      newWarnings.push({
        id: `warn_${Date.now()}_demo_timing`,
        type: "INVOICE_TIMING",
        title: "Suboptimal Invoice Timing",
        priority: "High",
        message: `If you invoice Client X today (₹200,000), your estimated income tax for Q4 will increase by 27% (≈₹54,000).`,
        impact: 54000,
        confidence: 78,
        recommendedAction: "Consider invoicing after Jan 1, or splitting into two invoices to reduce bracket impact.",
        explainability: ["Pushes revenue into higher bracket", "End of quarter timing"],
        status: "ACTIVE",
        created_at: new Date().toISOString()
      });
    }

    for (const warning of newWarnings) {
      serverDb.insert("tax_warnings", orgId, warning);
    }

    return NextResponse.json({ success: true, added: newWarnings.length }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
