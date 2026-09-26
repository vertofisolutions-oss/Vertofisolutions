import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Generate mock stream of incoming WhatsApp messages that have been run through the "AI Processing Engine"
  const inbox = [
    {
      id: "MSG-001",
      timestamp: "10:45 AM",
      client: "Ramesh Traders",
      type: "Photo",
      rawInput: "supplier_bill_fuel.jpg",
      status: "Processed",
      aiExtraction: {
        vendorName: "Indian Oil",
        amount: "₹4,000",
        gstBreakdown: "₹0 (Exempt)",
        category: "Fuel",
        date: "17 Nov 2026",
        paymentMode: "Cash"
      },
      ledgerUpdates: ["Expense ledger", "Cash book"],
      alerts: []
    },
    {
      id: "MSG-002",
      timestamp: "11:15 AM",
      client: "Acme Corp",
      type: "Voice Note",
      rawInput: "Audio (0:12s)",
      status: "Processed",
      transcription: "Salary paid 1,20,000 to staff for November.",
      aiExtraction: {
        vendorName: "Staff",
        amount: "₹1,20,000",
        gstBreakdown: "N/A",
        category: "Payroll",
        date: "Today",
        paymentMode: "Bank Transfer"
      },
      ledgerUpdates: ["Expense ledger", "Bank book"],
      alerts: []
    },
    {
      id: "MSG-003",
      timestamp: "02:30 PM",
      client: "Global Tech",
      type: "Text",
      rawInput: "Bought materials ₹8,500. Bill attached.",
      status: "Needs Approval",
      aiExtraction: {
        vendorName: "Unknown",
        amount: "₹8,500",
        gstBreakdown: "Pending OCR",
        category: "Materials",
        date: "Today",
        paymentMode: "Unknown"
      },
      ledgerUpdates: [],
      alerts: [{ type: "Fraud Prevention", message: "Possible duplicate bill detected based on amount." }]
    }
  ];

  return NextResponse.json({ success: true, messages: inbox }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
