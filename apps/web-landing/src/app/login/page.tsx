"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AuthShell, AuthButton, Field, TextInput, PasswordField, Callout } from "@/ui";
import { api, setTokens, ApiError, getAccess } from "@/lib/api";

/**
 * Business owner login: email/mobile + password. OTP is only used once, at
 * first-time registration (Firebase phone verification). Returning owners sign
 * in with the password they set at signup — no repeat OTP.
 */
export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getAccess()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function signIn() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.passwordLogin(identifier, password);
      if (res.tokens) {
        setTokens(res.tokens.accessToken, res.tokens.refreshToken);
        router.push("/dashboard");
      } else {
        // Business owners never require MFA; this is defensive.
        setError("unexpected_mfa_required");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.code);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("invalid_credentials");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      accent="business"
      panelName="Vertofi for Business"
      tagline="Your AI-powered CFO. Sign in to your dashboard — invoicing, GST, cashflow and your 24/7 WhatsApp assistant."
      bullets={["Real-time Business Health Score", "GST & compliance on autopilot", "Bank-grade security"]}
      eyebrow="Business Owners & Clients" backHref="http://localhost:3000"
      logo={<Image src="/logo.jpg" alt="Vertofi" width={36} height={36} className="rounded-lg object-contain" priority />}
      footer={
        <p className="text-center text-xs text-muted">
          New to Vertofi?{" "}
          <a href="/register" className="font-semibold text-brand hover:underline">Create an account</a>
        </p>
      }
    >
      <div className="space-y-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in with your email or mobile and password.</p>
        </div>

        {error && <Callout tone="error">{error.replaceAll("_", " ")}</Callout>}

        <div className="space-y-5">
          <Field label="Email or mobile">
            <TextInput autoFocus autoComplete="username" placeholder="you@company.com or 98765 43210" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </Field>
          <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" onEnter={signIn} />
          <AuthButton accent="business" busy={busy} busyLabel="Signing in…" disabled={identifier.trim().length < 3 || password.length < 1} onClick={signIn}>
            Sign in
          </AuthButton>
          <p className="text-center text-xs text-muted">
            Forgot your password? <a href="/reset" className="font-semibold text-brand hover:underline">Reset via OTP</a>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
