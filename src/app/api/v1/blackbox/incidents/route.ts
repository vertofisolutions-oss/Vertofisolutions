import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Generate robust mock data for Incident Reconstruction
  const incidents = [
    {
      id: "INC-GST-0432",
      type: "GST Mismatch",
      severity: "High",
      detectedAt: "Today, 05:43 PM",
      trigger: "GSTR-1 vs GSTR-3B variance > ₹50,000 threshold",
      financialImpact: "₹54,000 Liability Risk",
      status: "Active",
      snapshots: {
        before: { bank: "₹12.4L", vendor: "₹3.2L", gst: "₹52K", profit: "₹2.8L" },
        after: { bank: "₹10.9L", vendor: "₹4.1L", gst: "₹1.06L", profit: "₹1.9L" }
      },
      reconstructionTimeline: [
        { time: "10:04 AM", event: "Invoice V-943 edited", user: "Staff", change: "Discount 18% → 5%", note: "Value changed" },
        { time: "01:32 PM", event: "Vendor GST disabled", user: "Manager", change: "GST active → inactive", note: "GST issue" },
        { time: "03:11 PM", event: "ITC auto-adjusted", user: "System", change: "Auto adjustment", note: "Mismatch detected" },
        { time: "05:12 PM", event: "Ledger adjusted", user: "Accountant", change: "Journal entry created", note: "Adjustment" },
        { time: "05:43 PM", event: "Incident detected", user: "System", change: "—", note: "Crash mode activated" }
      ]
    }
  ];

  return NextResponse.json(incidents, { status: 200, headers: { "Cache-Control": "no-store" } });
}
