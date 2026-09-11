"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AuthShell,
  AuthButton,
  Field,
  TextInput,
  PasswordField,
  OtpInput,
  Callout,
} from "@/ui";
import { api, ApiError } from "@/lib/api";

export default function ResetPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "verify" | "done">("email");
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function fail(e: unknown, fallback: string) {
    setError(e instanceof ApiError ? e.code : e instanceof Error ? e.message : fallback);
  }

  async function sendCode() {
    if (!email || !email.includes("@")) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.sendOtp("EMAIL", email, "PASSWORD_RESET");
      if (res && res.challengeId) setChallengeId(res.challengeId);
      setResendCooldown(res?.resendAfterSeconds || 60);
      setCode("");
      setStage("verify");
    } catch (e) {
      fail(e, "Could not send reset code. Please check your email.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0 || !email) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.resendOtp(email, "PASSWORD_RESET");
      if (res && res.challengeId) setChallengeId(res.challengeId);
      setResendCooldown(res?.resendAfterSeconds || 60);
      setCode("");
    } catch (e) {
      fail(e, "Could not resend verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    if (!code || code.length !== 6 || newPassword.length < 8) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.verifyOtp(challengeId || email, code, "PASSWORD_RESET");
      if (!res || !res.verified) {
        throw new Error("Invalid code");
      }
      setStage("done");
    } catch (e) {
      fail(e, "Verification failed. Code may be invalid or expired.");
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
            {stage === "email" && "Enter your registered work email — we'll send a 6-digit verification code."}
            {stage === "verify" && `Enter the 6-digit code sent to ${email} and choose a new password.`}
            {stage === "done" && "Your password has been updated. You can now sign in."}
          </p>
        </div>

        {error && <Callout tone="error">{String(error).replaceAll("_", " ")}</Callout>}

        {stage === "email" && (
          <div className="space-y-5">
            <Field label="Work email">
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </Field>
            <AuthButton accent="business" busy={busy} busyLabel="Sending code…" disabled={!email.includes("@")} onClick={sendCode}>
              Send verification code
            </AuthButton>
          </div>
        )}

        {stage === "verify" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-slate-50 p-3 text-center">
              <p className="text-xs text-muted">Verification code sent to</p>
              <p className="text-sm font-bold text-ink">{email}</p>
            </div>

            <OtpInput value={code} onChange={setCode} accent="business" />

            <PasswordField
              label="New password"
              hint="At least 8 characters."
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              strength
            />

            <AuthButton
              accent="business"
              busy={busy}
              busyLabel="Updating password…"
              disabled={code.length !== 6 || newPassword.length < 8}
              onClick={submitReset}
            >
              Reset password
            </AuthButton>

            <div className="flex flex-col items-center gap-2 pt-2 border-t border-border">
              <p className="text-xs text-muted">Didn't receive the code?</p>
              {resendCooldown > 0 ? (
                <span className="text-xs font-medium text-slate-500">
                  Resend OTP in <strong className="text-ink">{resendCooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleResendCode}
                  className="text-xs font-bold text-brand hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-muted hover:text-ink"
                onClick={() => { setError(null); setCode(""); setStage("email"); }}
              >
                ← Change email address
              </button>
            </div>
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
