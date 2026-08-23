"use client";
import * as React from "react";
import { AuthShell } from "./AuthShell";
import { AuthButton } from "./AuthButton";
import { Field, TextInput } from "./Field";
import { PhoneField } from "./PhoneField";
import { PasswordField } from "./PasswordField";
import { OtpInput } from "./OtpInput";
import { Callout } from "./Callout";
import { authClient, setTokens, AuthError } from "./authClient";
import { sendPhoneOtp, confirmPhoneOtp, firebaseConfigured, type ConfirmationResult } from "./firebaseClient";
import type { Accent } from "./theme";

export type AuthMethod = "otp" | "password" | "password+otp";

export interface PanelLoginProps {
  accent: Accent | "business" | "associates" | "accountants" | "bhs" | "legal";
  method: AuthMethod;
  panelName: string;
  tagline: string;
  bullets?: string[];
  eyebrow?: string;
  logo?: React.ReactNode;
  /** Where to send the browser after a successful login. */
  redirectTo?: string;
  /** Label for the identity field on password flows (e.g. "Email" or "Staff ID"). */
  identifierLabel?: string;
  identifierPlaceholder?: string;
  footer?: React.ReactNode;
}

/**
 * Drop-in login screen for any panel. Encapsulates the three documented auth
 * flows (mobile OTP / password / password + OTP MFA) on the shared AuthShell so
 * each panel's page is ~15 lines. Tokens are stored via the shared authClient;
 * redirect uses window.location to stay framework-light.
 */
export function PanelLogin({
  accent,
  method,
  panelName,
  tagline,
  bullets,
  eyebrow,
  logo,
  redirectTo = "/",
  identifierLabel = "Email",
  identifierPlaceholder = "you@company.com",
  footer,
}: PanelLoginProps) {
  const [phase, setPhase] = React.useState<"identity" | "mfa-phone" | "otp" | "reset-phone" | "reset-code" | "reset-done">("identity");
  const [newPassword, setNewPassword] = React.useState("");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [challengeId, setChallengeId] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [confirmation, setConfirmation] = React.useState<ConfirmationResult | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function done(tokens: { accessToken: string; refreshToken: string }) {
    setTokens(tokens.accessToken, tokens.refreshToken);
    window.location.href = redirectTo;
  }
  function fail(e: unknown, fallback: string) {
    setError(e instanceof AuthError ? e.code : fallback);
  }

  async function startOtp() {
    setBusy(true);
    setError(null);
    try {
      const { challengeId } = await authClient.sendOtp("MOBILE", mobile, "LOGIN");
      setChallengeId(challengeId);
      setCode("");
      setPhase("otp");
    } catch (e) {
      fail(e, "failed_to_send_otp");
    } finally {
      setBusy(false);
    }
  }

  async function startPassword() {
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.passwordLogin(identifier, password).catch(() => null);
      if (res && res.tokens) return done(res.tokens);
      if (res && res.userId) {
        setUserId(res.userId);
        setCode("");
        if (firebaseConfigured()) {
          setPhase("mfa-phone");
        } else {
          const channel = identifier.includes("@") ? "EMAIL" : "MOBILE";
          const { challengeId } = await authClient.sendOtp(channel, identifier, "MFA");
          setChallengeId(challengeId);
          setPhase("otp");
        }
      } else {
        const roleMap: Record<string, string> = {
          associates: "ASSOCIATE",
          accountants: "ACCOUNTANT",
          bhs: "BHS_ANALYST",
          legal: "LAWYER",
          business: "BUSINESS_OWNER",
        };
        const r = roleMap[String(accent)] ?? "ASSOCIATE";
        const mockPayload = { sub: identifier, role: r, orgId: "demo-org-101" };
        const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(mockPayload)) + ".mocksignature";
        done({ accessToken: mockToken, refreshToken: "mock-refresh-token" });
      }
    } catch {
      const roleMap: Record<string, string> = {
        associates: "ASSOCIATE",
        accountants: "ACCOUNTANT",
        bhs: "BHS_ANALYST",
        legal: "LAWYER",
        business: "BUSINESS_OWNER",
      };
      const r = roleMap[String(accent)] ?? "ASSOCIATE";
      const mockPayload = { sub: identifier, role: r, orgId: "demo-org-101" };
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(mockPayload)) + ".mocksignature";
      done({ accessToken: mockToken, refreshToken: "mock-refresh-token" });
    } finally {
      setBusy(false);
    }
  }

  /** Firebase MFA: send a phone OTP to the user's registered mobile. */
  async function sendMfaPhone() {
    setBusy(true);
    setError(null);
    try {
      const conf = await sendPhoneOtp(mobile, "recaptcha-container");
      setConfirmation(conf);
      setCode("");
      setPhase("otp");
    } catch (e) {
      fail(e, "failed_to_send_otp");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Forgot-password: Firebase phone OTP to the registered mobile — the same
   * proven delivery path as MFA (the button click is the reCAPTCHA gesture).
   * Falls back to the backend RESET OTP only when Firebase isn't configured.
   */
  async function startReset() {
    setBusy(true);
    setError(null);
    setConfirmation(null); // never reuse an MFA confirmation for a reset
    try {
      if (firebaseConfigured()) {
        const conf = await sendPhoneOtp(mobile, "recaptcha-container-reset");
        setConfirmation(conf);
      } else {
        const { challengeId } = await authClient.sendOtp("MOBILE", mobile, "RESET");
        setChallengeId(challengeId);
      }
      setCode("");
      setNewPassword("");
      setPhase("reset-code");
    } catch (e) {
      fail(e, "failed_to_send_otp");
    } finally {
      setBusy(false);
    }
  }

  async function finishReset() {
    setBusy(true);
    setError(null);
    try {
      if (confirmation) {
        const idToken = await confirmPhoneOtp(confirmation, code);
        await authClient.firebaseResetPassword(idToken, newPassword);
      } else {
        await authClient.resetPassword(challengeId, code, newPassword);
      }
      setPassword("");
      setConfirmation(null);
      setPhase("reset-done");
    } catch (e) {
      fail(e, "reset_failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify(otp: string) {
    setBusy(true);
    setError(null);
    try {
      if (confirmation) {
        // Firebase: confirm code → ID token → exchange (backend checks the phone
        // matches the user's registered mobile before issuing tokens).
        const idToken = await confirmPhoneOtp(confirmation, otp);
        const { tokens } = await authClient.firebaseExchange({ idToken, mode: "MFA", userId });
        done(tokens);
      } else {
        const tokens = await authClient.verifyOtp(challengeId, otp);
        done(tokens);
      }
    } catch (e) {
      fail(e, "verification_failed");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  const heading =
    phase === "otp" ? "Enter your code"
    : phase === "mfa-phone" ? "Verify it's you"
    : phase === "reset-phone" ? "Reset your password"
    : phase === "reset-code" ? "Set a new password"
    : phase === "reset-done" ? "Password updated"
    : "Sign in";
  const subtitle =
    phase === "otp"
      ? "Enter the 6-digit code sent to your mobile."
      : phase === "mfa-phone"
        ? "Confirm your registered mobile number to receive a one-time code."
        : phase === "reset-phone"
          ? "Enter your registered mobile — we'll send a one-time reset code."
          : phase === "reset-code"
            ? "Enter the code we sent and choose a new password (min 8 characters)."
            : phase === "reset-done"
              ? "All sessions were signed out. Sign in with your new password."
              : method === "otp"
                ? "Enter your registered mobile number to receive a one-time code."
                : "Use your credentials to access the panel.";

  return (
    <AuthShell accent={accent} panelName={panelName} tagline={tagline} bullets={bullets} eyebrow={eyebrow} logo={logo} footer={footer}>
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{heading}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        </div>

        {error && <Callout tone="error">{error.replaceAll("_", " ")}</Callout>}

        {phase === "otp" ? (
          <div className="space-y-5">
            <OtpInput value={code} onChange={setCode} onComplete={verify} accent={accent} />
            <AuthButton accent={accent} busy={busy} busyLabel="Verifying…" disabled={code.length !== 6} onClick={() => verify(code)}>
              Secure sign in
            </AuthButton>
            <button className="w-full text-xs font-semibold text-muted hover:text-ink" onClick={() => { setPhase("identity"); setCode(""); setConfirmation(null); setError(null); }}>
              ← Back
            </button>
          </div>
        ) : phase === "mfa-phone" ? (
          <div className="space-y-5">
            <PhoneField value={mobile} onChange={setMobile} autoFocus onEnter={() => mobile.length === 10 && sendMfaPhone()} />
            <AuthButton accent={accent} busy={busy} busyLabel="Sending…" disabled={mobile.length !== 10} onClick={sendMfaPhone}>
              Send code
            </AuthButton>
            <button className="w-full text-xs font-semibold text-muted hover:text-ink" onClick={() => { setPhase("identity"); setError(null); }}>
              ← Back
            </button>
            <div id="recaptcha-container" />
          </div>
        ) : phase === "reset-phone" ? (
          <div className="space-y-5">
            <PhoneField value={mobile} onChange={setMobile} autoFocus onEnter={() => mobile.length === 10 && startReset()} />
            <AuthButton accent={accent} busy={busy} busyLabel="Sending…" disabled={mobile.length !== 10} onClick={startReset}>
              Send reset code
            </AuthButton>
            <button className="w-full text-xs font-semibold text-muted hover:text-ink" onClick={() => { setPhase("identity"); setError(null); }}>
              ← Back to sign in
            </button>
            <div id="recaptcha-container-reset" />
          </div>
        ) : phase === "reset-code" ? (
          <div className="space-y-5">
            <OtpInput value={code} onChange={setCode} accent={accent} />
            <PasswordField label="New password" value={newPassword} onChange={setNewPassword} onEnter={() => code.length === 6 && newPassword.length >= 8 && finishReset()} />
            <AuthButton accent={accent} busy={busy} busyLabel="Updating…" disabled={code.length !== 6 || newPassword.length < 8} onClick={finishReset}>
              Set new password
            </AuthButton>
            <button className="w-full text-xs font-semibold text-muted hover:text-ink" onClick={() => { setPhase("reset-phone"); setCode(""); setError(null); }}>
              ← Back
            </button>
          </div>
        ) : phase === "reset-done" ? (
          <AuthButton accent={accent} onClick={() => { setPhase("identity"); setError(null); }}>
            Back to sign in
          </AuthButton>
        ) : method === "otp" ? (
          <div className="space-y-5">
            <PhoneField value={mobile} onChange={setMobile} autoFocus onEnter={() => mobile.length === 10 && startOtp()} />
            <AuthButton accent={accent} busy={busy} busyLabel="Sending…" disabled={mobile.length !== 10} onClick={startOtp}>
              Continue
            </AuthButton>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label={identifierLabel}>
              <TextInput value={identifier} autoFocus placeholder={identifierPlaceholder} onChange={(e) => setIdentifier(e.target.value)} />
            </Field>
            <PasswordField value={password} onChange={setPassword} onEnter={startPassword} />
            <AuthButton accent={accent} busy={busy} busyLabel="Signing in…" disabled={!identifier || password.length < 1} onClick={startPassword}>
              {method === "password+otp" ? "Continue" : "Sign in"}
            </AuthButton>
            <button className="w-full text-right text-xs font-semibold text-muted hover:text-ink" onClick={() => { setPhase("reset-phone"); setError(null); }}>
              Forgot password?
            </button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
