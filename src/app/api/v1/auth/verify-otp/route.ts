import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/otp-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { challengeId, email, otp, code, purpose = "EMAIL_VERIFICATION" } = body;
    const targetChallenge = challengeId || email;
    const submittedCode = otp || code;

    if (!targetChallenge || typeof targetChallenge !== "string") {
      return NextResponse.json(
        { code: "invalid_challenge", message: "Invalid request payload." },
        { status: 400 }
      );
    }

    if (!submittedCode || typeof submittedCode !== "string" || submittedCode.trim().length !== 6) {
      return NextResponse.json(
        { code: "invalid_otp_format", message: "Please enter the 6-digit code." },
        { status: 400 }
      );
    }

    const result = verifyOtpCode(targetChallenge, submittedCode, purpose);

    if (!result.valid) {
      return NextResponse.json(
        { code: "verification_failed", message: result.reason || "The verification code is incorrect." },
        { status: 400 }
      );
    }

    // Generate JWT access & refresh token for verified session
    const mockHeader = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const mockPayload = btoa(
      JSON.stringify({
        sub: result.email,
        email: result.email,
        emailVerified: true,
        role: "BUSINESS_OWNER",
        orgId: "demo-business-org",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      })
    );
    const accessToken = `${mockHeader}.${mockPayload}.vertofi_verified_sig`;
    const refreshToken = `ref_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    return NextResponse.json({
      success: true,
      verified: true,
      email: result.email,
      accessToken,
      refreshToken,
      tokens: { accessToken, refreshToken },
      message: "Email verified successfully!",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { code: "verify_error", message: error instanceof Error ? error.message : "Verification failed." },
      { status: 500 }
    );
  }
}
