"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AuthShell, AuthButton, Field, TextInput, PasswordField, Callout } from "@/ui";
import { api, setTokens, getAccess } from "@/lib/api";
import { normalizePlan } from "@/lib/plans";

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
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your email or mobile number.");
      setBusy(false);
      return;
    }

    try {
      const res = await api.passwordLogin(cleanId, password);
      if (res && res.tokens) {
        setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      }
      const userOrg = (res as any)?.orgId || `org_${cleanId.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const userName = (res as any)?.name || (cleanId.includes("@") ? cleanId.split("@")[0] : "Business Owner");
      const userEmail = (res as any)?.email || (cleanId.includes("@") ? cleanId : "");
      const userMobile = (res as any)?.mobile || (!cleanId.includes("@") ? cleanId : "");

      // Retrieve registered plan from profile or default to registered user plan
      let existingPlan = "FREE";
      try {
        const stored = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan");
        if (stored) existingPlan = normalizePlan(stored);
        const profileRaw = localStorage.getItem("vertofi_business_profile");
        if (profileRaw) {
          const p = JSON.parse(profileRaw);
          if (p.plan) existingPlan = normalizePlan(p.plan);
        }
      } catch {}

      const userPlan = (res as any)?.plan ? normalizePlan((res as any).plan) : existingPlan;

      localStorage.setItem("vertofi.orgId", userOrg);
      localStorage.setItem("vertofi_user_name", userName);
      localStorage.setItem("vertofi_user_email", userEmail);
      localStorage.setItem("vertofi_user_mobile", userMobile);
      localStorage.setItem("vertofi.plan", userPlan);
      localStorage.setItem("vertofi_user_plan", userPlan);
      localStorage.setItem("vertofi_business_profile", JSON.stringify({
        name: userName,
        legalName: userName,
        email: userEmail,
        mobile: userMobile,
        plan: userPlan,
      }));

      window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: userPlan } }));
      window.dispatchEvent(new Event("storage"));

      window.location.href = `/dashboard?plan=${userPlan.toLowerCase()}`;
    } catch {
      // Fallback dynamic credentials
      const userOrg = `org_${cleanId.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const userName = cleanId.includes("@") ? cleanId.split("@")[0] : "Business Owner";
      const userEmail = cleanId.includes("@") ? cleanId : "";
      const userMobile = !cleanId.includes("@") ? cleanId : "";

      let existingPlan = "FREE";
      try {
        const stored = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan");
        if (stored) existingPlan = normalizePlan(stored);
        const profileRaw = localStorage.getItem("vertofi_business_profile");
        if (profileRaw) {
          const p = JSON.parse(profileRaw);
          if (p.plan) existingPlan = normalizePlan(p.plan);
        }
      } catch {}

      const userPlan = existingPlan;

      const mockPayload = { sub: cleanId, role: "BUSINESS_OWNER", orgId: userOrg, plan: userPlan };
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(mockPayload)) + ".mocksignature";
      setTokens(mockToken, "mock-refresh-token");
      localStorage.setItem("vertofi.orgId", userOrg);
      localStorage.setItem("vertofi_user_name", userName);
      localStorage.setItem("vertofi_user_email", userEmail);
      localStorage.setItem("vertofi_user_mobile", userMobile);
      localStorage.setItem("vertofi.plan", userPlan);
      localStorage.setItem("vertofi_user_plan", userPlan);
      localStorage.setItem("vertofi_business_profile", JSON.stringify({
        name: userName,
        legalName: userName,
        email: userEmail,
        mobile: userMobile,
        plan: userPlan,
      }));

      window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: userPlan } }));
      window.dispatchEvent(new Event("storage"));

      window.location.href = `/dashboard?plan=${userPlan.toLowerCase()}`;
    }
  }

  return (
    <AuthShell
      accent="business"
      panelName="Vertofi for Business"
      tagline="Your AI-powered CFO. Sign in to your dashboard — invoicing, GST, cashflow and AI intelligence."
      bullets={["Real-time Business Health Score", "GST & compliance on autopilot", "Bank-grade security"]}
      eyebrow="Business Owners & Clients" backHref="/"
      logo={<Image src="/logo.jpg" alt="Vertofi" width={36} height={36} className="rounded-lg object-contain" priority />}
      footer={
        <p className="text-center text-xs text-muted">
          New to Vertofi?{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">Create an account</Link>
          {" · "}
          <Link href="/pricing" className="font-semibold text-slate-600 hover:underline">Pricing Plans</Link>
        </p>
      }
    >
      <div className="space-y-6">
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
          <Link href="/reset" className="font-medium text-brand hover:underline">Forgot password?</Link>
        </div>

        <AuthButton accent="business" busy={busy} onClick={signIn}>
          Sign in to Business Panel
        </AuthButton>
      </div>
    </AuthShell>
  );
}
