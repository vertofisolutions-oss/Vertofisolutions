import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const orgId = body.orgId || "demo-business-org";

    const expenses = serverDb.get("expenses", orgId);
    const purchases = serverDb.get("purchases", orgId);
    const issues = serverDb.get("profit_leakage_issues", orgId);

    // AI MOCK CLASSIFICATION RULES
    const newIssues = [];

    // 1. Overspending Alerts
    const softwareExpenses = expenses.filter(e => String(e.category || "").toLowerCase().includes("software") || String(e.description || "").toLowerCase().includes("software"));
    const totalSoftware = softwareExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    if (totalSoftware > 15000 && !issues.some(i => i.category === "Overspending" && i.metadata === "software")) {
       newIssues.push({
         category: "Overspending",
         title: "High Software Expenditure",
         description: `Your software expenses increased significantly. ₹${Math.floor(totalSoftware * 0.2)} may be unnecessary spend.`,
         amount: Math.floor(totalSoftware * 0.2),
         riskLevel: "Medium",
         status: "New",
         metadata: "software",
         created_at: new Date().toISOString()
       });
    }

    // 2. Duplicate Vendor Invoice Detection
    const purchaseMap: Record<string, any[]> = {};
    for (const p of purchases) {
      const vendor = String(p.vendor_name || p.vendor || "Unknown").toLowerCase();
      const amount = Number(p.total || 0);
      if (amount > 0) {
        const key = `${vendor}_${amount}`;
        if (!purchaseMap[key]) purchaseMap[key] = [];
        purchaseMap[key].push(p);
      }
    }

    for (const [key, similar] of Object.entries(purchaseMap)) {
      if (similar.length > 1) {
        const issueKey = `dup_${key}`;
        if (!issues.some(i => i.metadata === issueKey)) {
          const amt = Number(similar[0].total || 0);
          newIssues.push({
             category: "DuplicateInvoice",
             title: "Duplicate Vendor Invoice",
             description: `Invoice from ${similar[0].vendor_name || "Vendor"} appears ${similar.length} times. Potential overpayment: ₹${amt * (similar.length - 1)}.`,
             amount: amt * (similar.length - 1),
             riskLevel: "High",
             status: "New",
             metadata: issueKey,
             created_at: new Date().toISOString()
          });
        }
      }
    }

    // 3. Hidden Charges & Bank Fees
    const bankFees = expenses.filter(e => String(e.category || "").toLowerCase().includes("bank") || String(e.description || "").toLowerCase().includes("fee") || String(e.description || "").toLowerCase().includes("charge"));
    let totalBankFees = bankFees.reduce((s, e) => s + Number(e.amount || 0), 0);
    // If no real bank fees, mock one for demonstration
    if (totalBankFees === 0 && expenses.length > 0) totalBankFees = 1650;
    
    if (totalBankFees > 1000 && !issues.some(i => i.category === "HiddenFee")) {
       newIssues.push({
         category: "HiddenFee",
         title: "Avoidable Bank Charges",
         description: `Bank deducted ₹${totalBankFees} in avoidable fees this month (SMS charges, NEFT fees, etc).`,
         amount: totalBankFees,
         riskLevel: "Low",
         status: "New",
         metadata: "bank_fees",
         created_at: new Date().toISOString()
       });
    }

    // 4. Unnecessary Subscriptions
    const subExpenses = expenses.filter(e => String(e.category || "").toLowerCase().includes("subscription") || String(e.description || "").toLowerCase().includes("crm") || String(e.description || "").toLowerCase().includes("cloud"));
    if (subExpenses.length > 2 && !issues.some(i => i.category === "UnnecessarySubscription")) {
       const subAmt = subExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
       newIssues.push({
         category: "UnnecessarySubscription",
         title: "Multiple CRM / Cloud Tools",
         description: `You are paying for multiple similar tools. Estimated savings: ₹${Math.floor(subAmt * 0.3)}/month.`,
         amount: Math.floor(subAmt * 0.3),
         riskLevel: "Low",
         status: "New",
         metadata: "subs",
         created_at: new Date().toISOString()
       });
    }

    // 5. Unclaimed ITC
    const unfiledPurchases = purchases.filter(p => !p.itc_claimed || p.vendor_filed === false);
    const unclaimedAmount = unfiledPurchases.reduce((s, p) => s + (Number(p.tax || 0) > 0 ? Number(p.tax) : Number(p.total || 0) * 0.18), 0);
    if (unclaimedAmount > 0 && !issues.some(i => i.category === "UnclaimedITC")) {
       newIssues.push({
         category: "UnclaimedITC",
         title: "Unclaimed Input Tax Credit",
         description: `₹${Math.floor(unclaimedAmount)} available ITC not claimed due to mismatched vendor filing.`,
         amount: Math.floor(unclaimedAmount),
         riskLevel: "High",
         status: "New",
         metadata: "itc",
         created_at: new Date().toISOString()
       });
    }

    // 6. Missed Income Tax Deductions
    const assets = purchases.filter(p => String(p.category || p.description || "").toLowerCase().includes("laptop") || String(p.category || p.description || "").toLowerCase().includes("equipment") || String(p.category || p.description || "").toLowerCase().includes("machinery"));
    if (assets.length > 0 && !issues.some(i => i.category === "MissedDeduction")) {
       const assetAmt = assets.reduce((s, p) => s + Number(p.total || 0), 0);
       const deduction = Math.floor(assetAmt * 0.4); // 40% depreciation for laptops/comps
       newIssues.push({
         category: "MissedDeduction",
         title: "Missed Depreciation Deduction",
         description: `₹${deduction} deduction missed under depreciation of laptops/equipment.`,
         amount: deduction,
         riskLevel: "High",
         status: "New",
         metadata: "depreciation",
         created_at: new Date().toISOString()
       });
    }

    // Seed Data if no real data is found (for demo purposes)
    if (expenses.length === 0 && purchases.length === 0 && issues.length === 0 && newIssues.length === 0) {
        newIssues.push({
            category: "Overspending",
            title: "High Software Expenditure",
            description: "Your software expenses increased by 41% this month. ₹8,000 may be unnecessary spend.",
            amount: 8000,
            riskLevel: "Medium",
            status: "New",
            metadata: "demo_overspend",
            created_at: new Date().toISOString()
        });
        newIssues.push({
            category: "DuplicateInvoice",
            title: "Duplicate Vendor Invoice",
            description: "Invoice #1287 from XYZ Vendor appears twice. Potential overpayment: ₹14,500.",
            amount: 14500,
            riskLevel: "High",
            status: "New",
            metadata: "demo_dup",
            created_at: new Date().toISOString()
        });
        newIssues.push({
            category: "HiddenFee",
            title: "Avoidable Bank Charges",
            description: "Bank deducted ₹1,650 in avoidable fees this month.",
            amount: 1650,
            riskLevel: "Low",
            status: "New",
            metadata: "demo_bank",
            created_at: new Date().toISOString()
        });
        newIssues.push({
            category: "UnnecessarySubscription",
            title: "Multiple CRM Tools",
            description: "You are paying for 3 CRM tools. Estimated savings: ₹3,200/month.",
            amount: 3200,
            riskLevel: "Low",
            status: "New",
            metadata: "demo_sub",
            created_at: new Date().toISOString()
        });
        newIssues.push({
            category: "UnclaimedITC",
            title: "Unclaimed Input Tax Credit",
            description: "₹12,480 available ITC not claimed due to mismatched vendor filing.",
            amount: 12480,
            riskLevel: "High",
            status: "New",
            metadata: "demo_itc",
            created_at: new Date().toISOString()
        });
        newIssues.push({
            category: "MissedDeduction",
            title: "Missed Depreciation",
            description: "₹48,000 deduction missed under depreciation of laptops.",
            amount: 48000,
            riskLevel: "High",
            status: "New",
            metadata: "demo_deduction",
            created_at: new Date().toISOString()
        });
    }

    for (const issue of newIssues) {
      serverDb.insert("profit_leakage_issues", orgId, issue);
    }

    return NextResponse.json({ success: true, added: newIssues.length }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
