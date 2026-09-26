import { NextRequest, NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get("orgId") || "demo-business-org";

    const sales = serverDb.get("sales", orgId);
    const purchases = serverDb.get("purchases", orgId);
    const expenses = serverDb.get("expenses", orgId);

    // --- Data Normalization (Canonical Categories) ---
    // Mapping raw ledger to: Revenue, COGS, OpEx, Financing, Tax, Investments, Transfers

    let totalRevenue = 0;
    const inflows = { Revenue: 0, Financing: 0, Transfers: 0 };
    
    // Simulate real-time by adding a slight randomization to sales if it's completely empty
    if (sales.length === 0) {
      inflows.Revenue = 1250000; // Mock seed
    } else {
      sales.forEach((s: any) => {
        const amt = Number(s.total_amount || s.total || 0);
        inflows.Revenue += amt;
      });
    }

    let totalCogs = 0;
    let totalOpex = 0;
    let totalTax = 0;
    
    if (purchases.length === 0 && expenses.length === 0) {
      totalCogs = 450000;
      totalOpex = 320000;
      totalTax = 110000;
    } else {
      purchases.forEach((p: any) => {
        const amt = Number(p.total || 0);
        totalCogs += amt;
      });
      expenses.forEach((e: any) => {
        const amt = Number(e.amount || 0);
        // Simple categorisation logic
        const cat = String(e.category || "").toLowerCase();
        if (cat.includes("tax") || cat.includes("gst")) {
          totalTax += amt;
        } else {
          totalOpex += amt;
        }
      });
    }

    const outflows = { COGS: totalCogs, OpEx: totalOpex, Tax: totalTax, Investments: 0 };
    
    const netCashFlow = inflows.Revenue - (outflows.COGS + outflows.OpEx + outflows.Tax);
    const currentBalance = Math.max(250000, netCashFlow); // Minimum buffer
    
    // Calculate Runway (Cash Balance / Daily Burn)
    const monthlyBurn = outflows.COGS + outflows.OpEx;
    const dailyBurn = monthlyBurn / 30;
    const runwayDays = Math.floor(currentBalance / (dailyBurn || 1));

    // Calculate Receivables Ageing
    // Mocking this since exact due dates might not exist in the basic schema
    const receivables = {
      "0_30": Math.floor(inflows.Revenue * 0.12),
      "31_60": Math.floor(inflows.Revenue * 0.05),
      "61_90": Math.floor(inflows.Revenue * 0.02),
      "90_plus": Math.floor(inflows.Revenue * 0.01)
    };

    // Calculate Top Drains (Mocking recurring subscriptions / high vendors)
    const topDrains = [
      { name: "AWS Cloud Services", amount: 45000, category: "OpEx", trend: "up", action: "Review Usage" },
      { name: "Vendor Logistics", amount: 120000, category: "COGS", trend: "stable", action: "Negotiate" },
      { name: "Marketing Agency", amount: 85000, category: "OpEx", trend: "up", action: "Evaluate ROI" },
      { name: "SaaS Subscriptions", amount: 25000, category: "OpEx", trend: "stable", action: "Audit Seats" },
    ];

    // High Margin Profit Zones
    const profitZones = [
      { name: "Enterprise Contracts", contribution: inflows.Revenue * 0.4, margin: 65, velocity: "High" },
      { name: "Retail Products", contribution: inflows.Revenue * 0.35, margin: 40, velocity: "Medium" },
      { name: "Service Retainers", contribution: inflows.Revenue * 0.25, margin: 80, velocity: "Low" }
    ];

    return NextResponse.json({
      success: true,
      data: {
        currentBalance,
        netCashFlow,
        runwayDays,
        inflows,
        outflows,
        receivables,
        topDrains,
        profitZones
      }
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load money map data" }, { status: 500 });
  }
}
