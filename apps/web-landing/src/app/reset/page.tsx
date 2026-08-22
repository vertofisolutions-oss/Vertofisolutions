"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AuthShell,
  AuthButton,
  PhoneField,
  PasswordField,
  OtpInput,
  Callout,
  sendPhoneOtp,
  confirmPhoneOtp,
  type ConfirmationResult,
} from "@/ui";
import { api, ApiError } from "@/lib/api";

/**
 * Forgot-password recovery (the /login "Reset via OTP" link). Uses Firebase
 * phone OTP — the same verified-phone channel as signup, so it needs no SMTP/
 * SMS provider:
 *   1. Enter the registered mobile → Firebase sends a 6-digit OTP.
 *   2. Enter the OTP + a new password → we confirm the code with Firebase, get
 *      an ID token, and post it with the new password. The backend matches the
 *      phone to the account, sets the password and revokes existing sessions.
 *
 * This is the recovery path for owners with no password on file (legacy
 * accounts created before signup persisted the password).
 */
export default function ResetPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"phone" | "verify" | "done">("phone");
  const [mobile, setMobile] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function fail(e: unknown, fallback: string) {
    setError(e instanceof ApiError ? e.code : e instanceof Error ? e.message : fallback);
  }

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      const conf = await sendPhoneOtp(mobile, "recaptcha-container");
      setConfirmation(conf);
      setCode("");
      setStage("verify");
    } catch (e) {
      fail(e, "could_not_send_code");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (!confirmation) return;
    setError(null);
    setBusy(true);
    try {
      const idToken = await confirmPhoneOtp(confirmation, code);
      await api.firebaseResetPassword(idToken, newPassword);
      setStage("done");
    } catch (e) {
      fail(e, "reset_failed");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      accent="business"
      panelName="Vertofi for Business"
      tagline="Reset your password and get back to your dashboard — invoicing, GST, cashflow and your 24/7 WhatsApp assistant."
      bullets={["Bank-grade security", "Real-time Business Health Score", "GST & compliance on autopilot"]}
      eyebrow="Account recovery"
      logo={<Image src="/logo.jpg" alt="Vertofi" width={36} height={36} className="rounded-lg object-contain" priority />}
      footer={
        <p className="text-center text-xs text-muted">
          Remembered it?{" "}
          <a href="/login" className="font-semibold text-brand hover:underline">Sign in</a>
        </p>
      }
    >
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {stage === "done" ? "Password updated" : "Reset your password"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {stage === "phone" && "Enter your registered mobile — we'll send a 6-digit code."}
            {stage === "verify" && `Enter the code sent to +91 ${mobile} and choose a new password.`}
            {stage === "done" && "You can now sign in with your new password."}
          </p>
        </div>

        {error && <Callout tone="error">{String(error).replaceAll("_", " ")}</Callout>}

        {stage === "phone" && (
          <div className="space-y-5">
            <PhoneField value={mobile} onChange={setMobile} autoFocus />
            <AuthButton accent="business" busy={busy} busyLabel="Sending code…" disabled={mobile.length !== 10} onClick={sendCode}>
              Send reset code
            </AuthButton>
            {/* Firebase invisible reCAPTCHA mounts here (required for phone auth) */}
            <div id="recaptcha-container" />
          </div>
        )}

        {stage === "verify" && (
          <div className="space-y-5">
            <OtpInput value={code} onChange={setCode} accent="business" />
            <PasswordField
              label="New password"
              hint="At least 8 characters. You'll use this to sign in."
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              strength
            />
            <AuthButton
              accent="business"
              busy={busy}
              busyLabel="Updating…"
              disabled={code.length !== 6 || newPassword.length < 8}
              onClick={submitReset}
            >
              Reset password
            </AuthButton>
            <button
              className="w-full text-xs font-semibold text-muted hover:text-ink"
              onClick={() => { setError(null); setCode(""); setStage("phone"); }}
            >
              ← Change mobile number
            </button>
          </div>
        )}

        {stage === "done" && (
          <AuthButton accent="business" onClick={() => router.push("/login")}>
            Back to sign in
          </AuthButton>
        )}
      </div>
    </AuthShell>
  );
}
