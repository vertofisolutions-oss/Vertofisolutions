import { NextRequest, NextResponse } from "next/server";

let consentState = {
  optedIn: true,
  timestamp: "2026-08-10T10:30:00Z",
  version: "1.0",
  differentialPrivacy: true
};

export async function GET(req: NextRequest) {
  return NextResponse.json({ success: true, consent: consentState }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "opt_out") {
      consentState.optedIn = false;
      consentState.timestamp = new Date().toISOString();
      return NextResponse.json({ success: true, message: "Successfully opted out of benchmarking data contribution." }, { status: 200 });
    } else if (body.action === "opt_in") {
      consentState.optedIn = true;
      consentState.timestamp = new Date().toISOString();
      return NextResponse.json({ success: true, message: "Successfully opted into benchmarking." }, { status: 200 });
    } else if (body.action === "delete") {
      consentState.optedIn = false;
      consentState.timestamp = new Date().toISOString();
      return NextResponse.json({ success: true, message: "Data deletion request received and processing." }, { status: 200 });
    }
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Invalid Request" }, { status: 400 });
  }
}
