"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SidebarShell } from "../../components/SidebarShell";
import { api, getOrgId, ApiError } from "@/lib/api";
import { setPlanForTesting, PlanTier } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLAN_CARDS = [
  {
    key: "FREE",
    name: "Free",
    monthlyPrice: 0,
    blurb: "Pre-revenue / testing · Know your financial health",
  },
  {
    key: "STARTER",
    name: "Starter",
    monthlyPrice: 499,
    founderPrice: 399,
    blurb: "Up to ₹40L turnover · Automate finances",
  },
  {
    key: "GROWTH",
    name: "Growth",
    popular: true,
    monthlyPrice: 1499,
    founderPrice: 1199,
    blurb: "₹40L–₹2Cr turnover · Predict risks",
  },
  {
    key: "SCALE",
    name: "Scale",
    monthlyPrice: 3999,
    founderPrice: 2999,
    blurb: "₹2Cr–₹15Cr turnover · Full command center",
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: "Custom",
    blurb: "₹15Cr+ turnover · Build Vertofi around you",
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
  const searchParams = useSearchParams();
  const queryPlan = searchParams.get("plan");

  const [orgId, setOrgId] = useState<string>("demo-business-org");
  const [access, setAccess] = useState<{ active: boolean; plan: string | null; status: string | null }>({
    active: true,
    plan: "Free",
    status: "ACTIVE",
  });
  const [selectedPlan, setSelectedPlan] = useState("STARTER");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan") || "FREE";
    const initialPlan = (queryPlan || (stored === "FREE" ? "STARTER" : stored)).toUpperCase();
    if (["FREE", "STARTER", "GROWTH", "SCALE", "ENTERPRISE", "POWER"].includes(initialPlan)) {
      setSelectedPlan(initialPlan === "POWER" ? "SCALE" : initialPlan);
    }
    setAccess({ active: true, plan: stored, status: stored === "FREE" ? "FREE" : "ACTIVE" });
  }, [queryPlan]);

  useEffect(() => {
    const oid = typeof window !== "undefined" ? (getOrgId() || "demo-business-org") : "demo-business-org";
    setOrgId(oid);
    void api.access(oid).then((a) => {
      if (a && a.plan) {
        setAccess({
          active: a.active ?? true,
          plan: a.plan,
          status: a.status || "ACTIVE",
        });
      }
    }).catch(() => {});
  }, []);

  async function pay() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setPlanForTesting(selectedPlan as PlanTier);
      const sub = await api.subscribe(orgId, selectedPlan, cycle);
      const ok = await loadRazorpay();
      if (ok && window.Razorpay && sub.keyId) {
        const rzp = new window.Razorpay({
          key: sub.keyId,
          subscription_id: sub.subscriptionId,
          name: "Vertofi",
          description: `${selectedPlan} plan · ${cycle === "YEARLY" ? "annual" : "monthly"}`,
          theme: { color: "#1378F8" },
          handler: () => {
            setNotice("Payment authorized — your plan is now active!");
            setPlanForTesting(selectedPlan as PlanTier);
            setAccess((prev) => ({ ...prev, plan: selectedPlan }));
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.open();
      } else if (sub.shortUrl) {
        window.location.href = sub.shortUrl;
      } else {
        setNotice(`Plan successfully updated to ${selectedPlan}!`);
        setAccess((prev) => ({ ...prev, plan: selectedPlan }));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "billing_failed");
    } finally {
      setBusy(false);
    }
  }

  const currentPlanName = access.plan ? (access.plan.charAt(0).toUpperCase() + access.plan.slice(1).toLowerCase()) : "Free";

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-2 py-4">
      <h1 className="text-[18px] font-semibold tracking-tight text-ink">Billing</h1>

      {/* Top card */}
      <div className="border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-muted">Current plan</p>
            <p className="mt-0.5 text-[18px] font-semibold text-ink">{currentPlanName}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
            {access.status || "TRIAL"}
          </span>
        </div>
      </div>

      {error && <p className="text-[12px] font-medium text-danger">{error.replaceAll("_", " ")}</p>}
      {notice && <p className="text-[12px] font-medium text-ink">{notice}</p>}

      {/* Main plans card */}
      <div className="border border-border bg-white p-5">
        {/* Toggle switch */}
        <div className="mb-4 flex items-center rounded-lg bg-[#F8FAFC] p-1 border border-slate-100">
          <button
            onClick={() => setCycle("MONTHLY")}
            className={`flex-1 rounded-md py-2 text-[13px] font-semibold transition ${cycle === "MONTHLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("YEARLY")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-semibold transition ${cycle === "YEARLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            Annual <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">20% OFF</span>
          </button>
        </div>

        {/* Plan Cards List */}
        <div className="space-y-3">
          {PLAN_CARDS.map((p) => {
            const isSelected = selectedPlan === p.key;
            const isCurrent = (access.plan || "Power").toUpperCase() === p.key;
            const isCustom = typeof p.monthlyPrice === "string";
            const price = isCustom ? p.monthlyPrice : (cycle === "MONTHLY" ? p.monthlyPrice : Math.round(Number(p.monthlyPrice) * 0.8 * 12));
            const founder = p.founderPrice ? (cycle === "MONTHLY" ? p.founderPrice : Math.round(p.founderPrice * 12)) : null;
            const unit = isCustom ? "" : (cycle === "MONTHLY" ? "/mo" : "/yr");
            const displayPrice = isCustom ? price : inr(price as number);

            return (
              <div
                key={p.key}
                onClick={() => setSelectedPlan(p.key)}
                className={`cursor-pointer flex items-center justify-between border-2 p-4 transition ${
                  isSelected ? "border-[#1378F8] bg-[#F4F8FF]" : "border-border bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-ink">{p.name}</p>
                    {p.popular && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        POPULAR
                      </span>
                    )}
                    {isCurrent && (
                      <span className="rounded bg-[#1378F8] px-2 py-0.5 text-[10px] font-bold text-white">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-muted">{p.blurb}</p>
                </div>

                <div className="mt-4 flex flex-col gap-1 text-right">
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-2xl font-extrabold text-slate-900">{displayPrice}</span>
                    <span className="text-xs font-semibold text-slate-400">{unit}</span>
                  </div>
                  {p.founderPrice && (
                    <p className="text-[11px] font-semibold text-amber-700/80">
                      Founder Price: {inr(founder ?? p.founderPrice)}{unit}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Change plan button */}
        <button
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
