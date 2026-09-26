"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AuthShell, AuthButton, Field, TextInput, PasswordField, Callout } from "@/ui";
import { authenticateUser, clearTokens, isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("logout") === "1") {
        clearTokens();
      } else if (isAuthenticated()) {
        router.replace("/dashboard");
      }
    }
  }, [router]);

  async function handleSignIn(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your email or mobile number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);

    try {
      // Simulate slight processing tick for crisp loading feedback
      await new Promise((resolve) => setTimeout(resolve, 350));

      const authResult = authenticateUser(cleanId, password, rememberMe);

      if (!authResult.success || !authResult.user) {
        // STOP LOGIN + SHOW ERROR + REMAIN ON LOGIN PAGE
        setError(authResult.error || "Authentication failed. Please check your credentials.");
        setBusy(false);
        return;
      }

      // Successful authentication
      const user = authResult.user;
      const userPlan = (user.plan || "FREE").toLowerCase();
      router.push(`/dashboard?plan=${userPlan}`);
    } catch (err: unknown) {
      setError("Authentication error. Please check your credentials and try again.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      accent="business"
      panelName="Vertofi for Business"
      tagline="Your AI-powered CFO. Sign in to your dashboard — invoicing, GST, cashflow and AI intelligence."
      bullets={["Real-time Business Health Score", "GST & compliance on autopilot", "Bank-grade security"]}
      eyebrow="Business Owners & Clients"
      backHref="/"
      logo={<Image src="/logo.jpg" alt="Vertofi" width={36} height={36} className="rounded-lg object-contain" priority />}
      footer={
        <p className="text-center text-xs text-muted">
          New to Vertofi?{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
          {" · "}
          <Link href="/pricing" className="font-semibold text-slate-600 hover:underline">
            Pricing Plans
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignIn} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in with your email or mobile and password.</p>
        </div>

        {error && <Callout tone="error">{error}</Callout>}

        <div className="space-y-4">
          <Field label="Email or Mobile">
            <TextInput
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              placeholder="you@company.com or 9876543210"
              autoComplete="username"
              disabled={busy}
            />
          </Field>

          <PasswordField
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={busy}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={busy}
              className="rounded border-border text-brand focus:ring-brand"
            />
            Remember me
          </label>
          <Link href="/reset" className="font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>

        <AuthButton
          type="submit"
          accent="business"
          busy={busy}
          busyLabel="Signing in..."
          disabled={busy}
        >
          Sign in to Business Panel
        </AuthButton>
      </form>
    </AuthShell>
  );
}
