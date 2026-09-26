import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Generate robust mock data for the continuous timeline
  const events = [
    {
      id: "EVT-8921",
      timestamp: "Today, 10:04 AM",
      type: "Invoice Edited",
      user: "Staff",
      role: "Sales Executive",
      ip: "192.168.1.104",
      device: "Windows Desktop",
      oldValue: "Discount 18%",
      newValue: "Discount 5%",
      description: "Invoice V-943 value changed manually after approval.",
      tag: "Adjustment Event",
      severity: "Medium"
    },
    {
      id: "EVT-8922",
      timestamp: "Today, 01:32 PM",
      type: "Vendor Status Changed",
      user: "Manager",
      role: "Operations Manager",
      ip: "192.168.1.45",
      device: "MacBook Pro",
      oldValue: "GSTIN Active",
      newValue: "GSTIN Inactive",
      description: "Vendor flagged due to GST non-compliance warning.",
      tag: "Compliance-Risk Event",
      severity: "High"
    },
    {
      id: "EVT-8923",
      timestamp: "Today, 03:11 PM",
      type: "ITC Auto-Adjusted",
      user: "System",
      role: "AI Core",
      ip: "internal-service",
      device: "Server",
      oldValue: "ITC Claimable: ₹1,50,000",
      newValue: "ITC Claimable: ₹96,000",
      description: "Auto-adjusted due to vendor GST mismatch detection in GSTR-2B.",
      tag: "Tax Event",
      severity: "Low"
    },
    {
      id: "EVT-8924",
      timestamp: "Today, 05:12 PM",
      type: "Ledger Adjusted",
      user: "Accountant",
      role: "Chartered Accountant",
      ip: "203.0.113.8",
      device: "iPad Pro",
      oldValue: "Expense: ₹20,000",
      newValue: "Expense: ₹74,000",
      description: "Journal entry created to reconcile missing purchase entries.",
      tag: "Adjustment Event",
      severity: "Medium"
    },
    {
      id: "EVT-8925",
      timestamp: "Today, 05:43 PM",
      type: "Incident Detected",
      user: "System",
      role: "Crash Detection Engine",
      ip: "internal-service",
      device: "Server",
      oldValue: "-",
      newValue: "-",
      description: "GST discrepancy threshold exceeded. Crash mode activated.",
      tag: "Fraud-Risk Event",
      severity: "Critical"
    }
  ];

  return NextResponse.json(events.reverse(), { status: 200, headers: { "Cache-Control": "no-store" } });
}
