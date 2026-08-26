"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AuthShell, AuthButton, Field, TextInput, PasswordField, Callout } from "@/ui";
import { api, setTokens, getAccess } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getAccess()) {
      router.replace("/workspace");
    }
  }, [router]);

  function signIn() {
    setError(null);
    setBusy(true);
    const mockPayload = { sub: identifier || "demo@company.com", role: "BUSINESS_OWNER", orgId: "demo-business-org" };
    const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(mockPayload)) + ".mocksignature";
    setTokens(mockToken, "mock-refresh-token");
    localStorage.setItem("vertofi.orgId", "demo-business-org");

    // Attempt backend sync in background without blocking navigation
    api.passwordLogin(identifier, password)
      .then((res) => {
        if (res && res.tokens) {
          setTokens(res.tokens.accessToken, res.tokens.refreshToken);
        }
      })
      .catch(() => {});

    window.location.href = "/workspace";
  }

  return (
    <AuthShell
      accent="business"
      panelName="Vertofi for Business"
      tagline="Your AI-powered CFO. Sign in to your dashboard — invoicing, GST, cashflow and your 24/7 WhatsApp assistant."
      bullets={["Real-time Business Health Score", "GST & compliance on autopilot", "Bank-grade security"]}
      eyebrow="Business Owners & Clients" backHref="/"
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

        {error && <Callout tone="error">{error}</Callout>}

        <div className="space-y-4">
          <Field label="Email or Mobile">
            <TextInput
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@company.com or 9876543210"
              autoComplete="username"
            />
          </Field>

          <PasswordField
            value={password}
            onChange={(v) => setPassword(v)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-border text-brand focus:ring-brand" />
            Remember me
          </label>
          <a href="/reset" className="font-medium text-brand hover:underline">Forgot password?</a>
        </div>

        <AuthButton accent="business" busy={busy} onClick={signIn}>
          Sign in to Business Panel
        </AuthButton>
      </div>
    </AuthShell>
  );
}
