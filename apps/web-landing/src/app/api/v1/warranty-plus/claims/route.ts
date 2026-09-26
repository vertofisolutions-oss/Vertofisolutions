import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Generate robust mock data for Claims
  const claims = [
    {
      id: "CLM-00432",
      penaltyType: "GST Late Filing",
      amount: "₹8,500",
      noticeDate: "20 Sep 2026",
      status: "Under Review",
      eligibility: {
        subscription: true,
        waitingPeriod: true,
        coveredByPlan: true,
        docsOnTime: true,
        coverageRemaining: true,
        status: "Eligible for Review"
      },
      evidence: {
        vertotiDeadline: "10 September",
        actualFiling: "12 September",
        clientDocsReceived: "02 September",
        responsibility: "Vertofi delay detected"
      }
    }
  ];

  return NextResponse.json({ success: true, claims }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
