"use client";
import { useEffect, useState, Suspense } from "react";
import { SidebarShell } from "../../components/SidebarShell";
import { api, getOrgId, ApiError } from "@/lib/api";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLAN_CARDS = [
  {
    key: "STARTER",
    name: "Starter",
    monthlyPrice: 499,
    originalMonthly: 699,
    blurb: "Solo founders & small businesses",
  },
  {
    key: "GROWTH",
    name: "Growth",
    popular: true,
    monthlyPrice: 1499,
    originalMonthly: 1999,
    blurb: "Growing companies & SMEs",
  },
  {
    key: "POWER",
    name: "Power",
    monthlyPrice: 3499,
    originalMonthly: 4999,
    blurb: "High-volume operations & firms",
  },
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

function BillingContent() {
  const [orgId, setOrgId] = useState<string>("demo-business-org");
  const [access, setAccess] = useState<{ active: boolean; plan: string | null; status: string | null }>({
    active: true,
    plan: "Power",
    status: "TRIAL",
  });
  const [selectedPlan, setSelectedPlan] = useState("POWER");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const oid = getOrgId() || "demo-business-org";
    setOrgId(oid);
    void api.access(oid).then(setAccess).catch(() => null);
  }, []);

  async function pay() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        setError("Could not load Razorpay SDK. Check connection.");
        setBusy(false);
        return;
      }
      const res = await api.createSubscription(orgId, selectedPlan, cycle);
      const options = {
        key: res.keyId,
        subscription_id: res.subscriptionId,
        name: "Vertofi",
        description: `Plan: ${selectedPlan} (${cycle})`,
        image: "/logo.jpg",
        handler: () => {
          setNotice("Payment authorized! Your plan features are unlocked.");
          void api.access(orgId).then(setAccess).catch(() => null);
        },
        prefill: { email: "", contact: "" },
        theme: { color: "#1378F8" },
      };
      const rzp = new window.Razorpay!(options);
      rzp.open();
    } catch (e) {
      if (e instanceof ApiError) setError(`Failed to start subscription: ${e.message}`);
      else setError("Unexpected error initiating checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Billing</h1>
      </div>

      {/* Top Banner - Current Plan */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current plan</p>
          <p className="text-2xl font-bold text-slate-900">{access.plan || "Power"}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
          {access.status || "TRIAL"}
        </span>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Billing Cycle Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCycle("MONTHLY")}
            className={`rounded-lg px-5 py-2 transition ${
              cycle === "MONTHLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("YEARLY")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 transition ${
              cycle === "YEARLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Annual
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              20% OFF
            </span>
          </button>
        </div>
      </div>

      {/* 3 Tier Plan Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLAN_CARDS.map((p) => {
          const isCurrent = (access.plan || "Power").toUpperCase() === p.key;
          const isSelected = selectedPlan === p.key;
          const price = cycle === "YEARLY" ? Math.round(p.monthlyPrice * 0.8) : p.monthlyPrice;

          return (
            <div
              key={p.key}
              onClick={() => setSelectedPlan(p.key)}
              className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-6 transition ${
                isSelected
                  ? "border-[#1378F8] bg-[#F4F8FF] shadow-md ring-1 ring-[#1378F8]"
                  : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  {p.popular ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      POPULAR
                    </span>
                  ) : isCurrent ? (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      CURRENT
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs text-slate-500">{p.blurb}</p>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">{inr(price)}</span>
                  <span className="text-xs font-semibold text-slate-400">/mo</span>
                  <span className="text-xs text-slate-400 line-through">{inr(p.originalMonthly)}/mo</span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                  LOCKED FOR LIFE
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Autopay Action Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={pay}
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-[#1378F8] py-3 text-[14px] font-semibold text-white transition hover:bg-[#0f67d4] active:bg-[#0b53ad] disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Opening secure checkout…" : "Change plan / re-authorize autopay"}
        </button>

        <p className="mt-3 text-center text-[11px] text-muted">
          Secured by Razorpay. Per RBI rules you get a 24-hour notice before each renewal. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <SidebarShell>
        <BillingContent />
      </SidebarShell>
    </Suspense>
  );
}
