import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const status = {
    plan: "Pro Warranty",
    status: "Active",
    coverageLimit: 30000,
    coverageUsed: 2500,
    coverageRemaining: 27500,
    enrollmentDate: "2026-06-15",
    waitingPeriod: "Completed",
    subscriptionStatus: "Active",
    scorecard: {
      overall: 82,
      components: [
        { name: "Document Submission Speed", score: 90, status: "Excellent" },
        { name: "GST Consistency", score: 84, status: "Good" },
        { name: "Cash Reporting", score: 78, status: "Average" },
        { name: "TDS Compliance", score: 86, status: "Good" },
        { name: "Payroll Consistency", score: 72, status: "Needs Review" }
      ]
    },
    deadlines: [
      { doc: "Purchase/Sales Invoices", due: "05 October", status: "On Time" },
      { doc: "Bank Statements", due: "05 October", status: "Pending" },
      { doc: "GST Data", due: "05 October", status: "Missing", warning: true }
    ],
    manualInterference: [
      { log: "Ledger entry modified outside Vertofi workflow", date: "22 Sep 2026", risk: "Medium" }
    ]
  };

  return NextResponse.json({ success: true, status }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
