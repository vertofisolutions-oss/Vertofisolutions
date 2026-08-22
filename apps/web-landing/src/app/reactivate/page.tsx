"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthButton, Callout } from "@/ui";
import { api, getAccess, getOrgId, ApiError } from "@/lib/api";
import { Celebration } from "../../components/Celebration";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLAN_CARDS = [
  { key: "STARTER", name: "Starter", monthly: 699, blurb: "Solo founders & small businesses" },
  { key: "GROWTH", name: "Growth", monthly: 1999, blurb: "Growing companies & SMEs", popular: true },
  { key: "PRO", name: "Pro", monthly: 4999, blurb: "High-volume operations & firms" },
];
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Reactivation / payment-required screen. Business users land here (via the
 * gateway 402 gate) when their subscription is PAST_DUE or the trial expired
 * without payment. They re-authorize autopay → services unlock again.
 */
export default function ReactivatePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [plan, setPlan] = useState("GROWTH");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!getAccess()) {
      router.replace("/login");
      return;
    }
    const oid = getOrgId();
    setOrgId(oid);
    setReady(true);
    // If they're already active (e.g. webhook landed), send them home.
    if (oid) {
      void api
        .access(oid)
        .then((a) => {
          if (a.active) router.replace("/dashboard");
        })
        .catch(() => {});
    }
  }, [router]);

  async function pay() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const sub = await api.subscribe(orgId, plan, cycle);
      const ok = await loadRazorpay();
      const finalize = () => {
        // Mandate re-authorized; the webhook flips status → ACTIVE. Show success.
        setDone(true);
      };
      if (ok && window.Razorpay && sub.keyId) {
        const rzp = new window.Razorpay({
          key: sub.keyId,
          subscription_id: sub.subscriptionId,
          name: "Vertofi",
          description: `${plan} plan · ${cycle === "YEARLY" ? "annual" : "monthly"}`,
          theme: { color: "#1378F8" },
          handler: () => finalize(),
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.open();
      } else if (sub.shortUrl) {
        window.location.href = sub.shortUrl;
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "reactivation_failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (done) {
    return (
      <Celebration
        title="You're back in business 🎉"
        subtitle="Payment received and autopay re-authorized. Every feature is unlocked again — welcome back to Vertofi."
        cta="Return to dashboard"
        onCta={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <AuthShell
      accent="business"
      panelName="Vertofi"
      tagline="Reactivate your account"
      bullets={["Your data is safe and waiting", "Unlock every feature instantly", "Cancel anytime"]}
    >
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Payment required to continue</h1>
          <p className="mt-1 text-sm text-muted">
            Your trial ended or an autopay charge didn&apos;t go through, so features are paused. Your account and data are
            completely safe — re-authorize payment to unlock everything again.
          </p>
        </div>

        {error && <Callout tone="error">{error.replaceAll("_", " ")}</Callout>}

        {/* Monthly / Annual toggle */}
        <div className="flex items-center justify-center gap-1 rounded-xl bg-bg2 p-1">
          <button onClick={() => setCycle("MONTHLY")} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${cycle === "MONTHLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            Monthly
          </button>
          <button onClick={() => setCycle("YEARLY")} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${cycle === "YEARLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            Annual <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">2 MONTHS FREE</span>
          </button>
        </div>

        <div className="grid gap-3">
          {PLAN_CARDS.map((p) => {
            const yearly = p.monthly * 10;
            return (
              <button key={p.key} onClick={() => setPlan(p.key)} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${plan === p.key ? "border-brand bg-brand-50" : "border-border hover:border-brand/40"}`}>
                <div>
                  <p className="text-sm font-semibold text-ink">{p.name}{p.popular && <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold text-gold">POPULAR</span>}</p>
                  <p className="text-xs text-muted">{p.blurb}</p>
                </div>
                <p className="text-lg font-bold text-ink">
                  {cycle === "MONTHLY" ? <>{inr(p.monthly)}<span className="text-xs font-normal text-muted">/mo</span></> : <>{inr(yearly)}<span className="text-xs font-normal text-muted">/yr</span></>}
                </p>
              </button>
            );
          })}
        </div>

        <AuthButton accent="business" busy={busy} busyLabel="Opening secure checkout…" onClick={pay}>
          Pay & restore access
        </AuthButton>
        <p className="text-center text-[11px] leading-relaxed text-muted">
          Secured by Razorpay. Per RBI rules you get a 24-hour notice before each renewal. Cancel anytime.
        </p>
      </div>
    </AuthShell>
  );
}
