import { NextRequest, NextResponse } from "next/server";
import { createAndSendOtp, checkRateLimit } from "@/lib/otp-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { destination, email, purpose = "EMAIL_VERIFICATION" } = body;
    const targetEmail = email || destination;

    if (!targetEmail || typeof targetEmail !== "string" || !targetEmail.includes("@")) {
      return NextResponse.json(
        { code: "invalid_email", message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!checkRateLimit(`ip:${ip}`) || !checkRateLimit(`email:${targetEmail}`)) {
      return NextResponse.json(
        { code: "rate_limit_exceeded", message: "Too many OTP requests. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    const { challengeId, resendAfterSeconds, formattedTime } = await createAndSendOtp(targetEmail, purpose);

    return NextResponse.json({
      success: true,
      challengeId,
      email: targetEmail,
      resendAfterSeconds,
      formattedTime,
      message: "A new verification code has been sent to your email.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith("COOLDOWN_ACTIVE:")) {
      const remaining = msg.split(":")[1];
      return NextResponse.json(
        { code: "cooldown_active", message: `Please wait ${remaining}s before requesting a new code.` },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { code: "resend_otp_failed", message: "Could not resend verification code. Please try again." },
      { status: 500 }
    );
  }
}
