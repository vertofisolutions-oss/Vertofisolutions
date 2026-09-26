"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Shield,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Check,
} from "lucide-react";
import {
  subscriptionService,
  SubscriptionState,
  PlanTier,
  BillingCycle,
  PLANS,
  ADD_ONS,
  getPlanLimit,
} from "@/lib/plans";

function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryPlan = searchParams.get("plan");
  const queryCycle = searchParams.get("cycle");

  const [sub, setSub] = useState<SubscriptionState>(() =>
    subscriptionService.getSubscription()
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("STARTER");
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const current = subscriptionService.getSubscription();
    setSub(current);
    if (queryPlan) {
      const p = queryPlan.toUpperCase() as PlanTier;
      if (["FREE", "STARTER", "GROWTH", "SCALE", "ENTERPRISE"].includes(p)) {
        setSelectedPlan(p);
      }
    } else {
      setSelectedPlan(current.plan === "FREE" ? "GROWTH" : current.plan);
    }

    if (queryCycle && (queryCycle.toUpperCase() === "YEARLY" || queryCycle.toUpperCase() === "MONTHLY")) {
      setCycle(queryCycle.toUpperCase() as BillingCycle);
    } else {
      setCycle(current.billingCycle || "MONTHLY");
    }

    const handler = () => setSub(subscriptionService.getSubscription());
    window.addEventListener("vertofi:subscription-changed", handler);
    return () => window.removeEventListener("vertofi:subscription-changed", handler);
  }, [queryPlan, queryCycle]);

  const currentPlanMeta = PLANS.find((p) => p.id === sub.plan) || PLANS[0];
  const selectedPlanMeta = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];

  const handleApplyPlan = (planTier: PlanTier) => {
    if (planTier === "ENTERPRISE") {
      router.push("/contact?intent=enterprise");
      return;
    }
    const updated = subscriptionService.setPlan(planTier, cycle);
    setSub(updated);
    setNotice(`Successfully switched subscription to ${planTier} (${cycle.toLowerCase()})!`);
  };

  const handleStartTrial = () => {
    const updated = subscriptionService.startGrowthTrial();
    setSub(updated);
    setNotice("14-Day Growth Trial activated! ProfitLeak, predictive insights, and AI Advisor are now unlocked.");
  };

  const handleToggleAddOn = (addonId: string) => {
    const isEnabled = sub.addons?.includes(addonId);
    const updated = subscriptionService.toggleAddOn(addonId, !isEnabled);
    setSub(updated);
    setNotice(`Add-On "${addonId}" ${!isEnabled ? "activated" : "deactivated"}.`);
  };

  const limitTxns = getPlanLimit("transactions", sub);
  const limitBills = getPlanLimit("scannedBills", sub);
  const limitUsers = getPlanLimit("users", sub);
  const limitGstins = getPlanLimit("gstins", sub);
  const limitPayroll = getPlanLimit("payrollEmployees", sub);

  const formatLimit = (n: number) => (n >= 999999 || n === Infinity ? "Unlimited" : n.toLocaleString("en-IN"));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Account Subscription & Billing
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Real-time entitlements, usage meters, add-ons and subscription lifecycle.
          </p>
        </div>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
        >
          View Full Pricing Comparison <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 1. Current Plan & Status Card ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-800">
                  Current Active Plan
                </span>
                {sub.status === "trial" && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    14-Day Growth Trial
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-3xl font-black text-slate-950">
                {currentPlanMeta.name}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Positioning: {currentPlanMeta.positioning} • {currentPlanMeta.tagline}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-3xl font-black text-slate-950">
                {sub.billingCycle === "YEARLY" ? currentPlanMeta.annualPriceDisplay : currentPlanMeta.priceDisplay}
              </span>
              {currentPlanMeta.priceDisplay !== "Custom" && (
                <span className="text-xs font-bold text-slate-500">
                  {sub.billingCycle === "YEARLY" ? "/yr" : "/mo"}
                </span>
              )}
              <p className="mt-1 text-[11px] font-medium text-slate-500 capitalize">
                Billing Cycle: {sub.billingCycle.toLowerCase()}
              </p>
            </div>
          </div>

          {/* Trial & Expiry Information */}
          {sub.status === "trial" && sub.trialEndDate && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-700" /> Active 14-Day Growth Experience
              </p>
              <p>
                Trial ends on <strong>{new Date(sub.trialEndDate).toLocaleDateString()}</strong>. At the end of the trial, you can choose a paid plan or move seamlessly to Free. <em>No automatic paid charges.</em>
              </p>
            </div>
          )}

          {sub.plan === "FREE" && sub.status !== "trial" && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-blue-950">Want to test Growth prediction?</h4>
                <p className="text-[11px] text-blue-800">Start your 14-day free trial now without entering a credit card.</p>
              </div>
              <button
                type="button"
                onClick={handleStartTrial}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shrink-0 cursor-pointer"
              >
                Start Growth Trial
              </button>
            </div>
          )}
        </div>

        {/* Quick Lifecycle Actions */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-950">Subscription Lifecycle</h3>
            <p className="mt-1 text-xs text-slate-600">
              Change tiers anytime. Downgrades preserve all historical books & data.
            </p>
          </div>

          <div className="space-y-2">
            {sub.plan !== "GROWTH" && (
              <button
                type="button"
                onClick={() => handleApplyPlan("GROWTH")}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs cursor-pointer"
              >
                Upgrade to Growth (₹1,499/mo)
              </button>
            )}
            {sub.plan !== "SCALE" && (
              <button
                type="button"
                onClick={() => handleApplyPlan("SCALE")}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
              >
                Upgrade to Scale (₹3,999/mo)
              </button>
            )}
            {sub.plan !== "STARTER" && sub.plan !== "FREE" && (
              <button
                type="button"
                onClick={() => handleApplyPlan("STARTER")}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Switch to Starter (₹499/mo)
              </button>
            )}
            {sub.plan !== "FREE" && (
              <button
                type="button"
                onClick={() => handleApplyPlan("FREE")}
                className="w-full rounded-xl border border-slate-200 bg-transparent py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Downgrade to Free (Keep Data)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Real Usage Meters ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Current Period Usage Meters</h3>
          <p className="text-xs text-slate-500">
            Real usage tracked against plan and active capacity add-ons.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Transactions Meter */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Monthly Transactions</span>
              <span className="font-black text-slate-950">
                {sub.usage.transactions.toLocaleString("en-IN")} / {formatLimit(limitTxns)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${Math.min(100, (sub.usage.transactions / (limitTxns === Infinity ? 100000 : limitTxns)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Scanned Bills Meter */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Scanned Bills OCR</span>
              <span className="font-black text-slate-950">
                {sub.usage.scannedBills} / {formatLimit(limitBills)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{ width: `${limitBills === 0 ? 0 : Math.min(100, (sub.usage.scannedBills / limitBills) * 100)}%` }}
              />
            </div>
          </div>

          {/* Users Seat Meter */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">User Seats</span>
              <span className="font-black text-slate-950">
                {sub.usage.users} / {formatLimit(limitUsers)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${Math.min(100, (sub.usage.users / (limitUsers === Infinity ? 100 : limitUsers)) * 100)}%` }}
              />
            </div>
          </div>

          {/* GSTIN Entities Meter */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Registered GSTINs</span>
              <span className="font-black text-slate-950">
                {sub.usage.gstins} / {formatLimit(limitGstins)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-purple-600 transition-all"
                style={{ width: `${Math.min(100, (sub.usage.gstins / (limitGstins === Infinity ? 100 : limitGstins)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Payroll Employees Meter */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Payroll Employees</span>
              <span className="font-black text-slate-950">
                {sub.usage.payrollEmployees} / {formatLimit(limitPayroll)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${limitPayroll === 0 ? 0 : Math.min(100, (sub.usage.payrollEmployees / (limitPayroll === Infinity ? 100 : limitPayroll)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Branches Meter */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Branches</span>
              <span className="font-black text-slate-950">
                {sub.usage.branches} / {sub.plan === "SCALE" || sub.plan === "ENTERPRISE" ? "Multi-Branch" : "1"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-teal-600 transition-all" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Manage Add-Ons Section ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-950">Add-Ons & Modular Features</h3>
          <p className="text-xs text-slate-500">
            Activate or deactivate capacity expansions and commercial add-ons.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADD_ONS.map((addon) => {
            const active = sub.addons?.includes(addon.id);
            return (
              <div
                key={addon.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                  active ? "border-blue-500 bg-blue-50/40" : "border-slate-200 bg-slate-50/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-950">{addon.name}</h4>
                    <span className="text-[11px] font-black text-emerald-700">{addon.price}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 leading-tight">{addon.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">
                    Status: {active ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleAddOn(addon.id)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      active
                        ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {active ? "Remove" : "Enable"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-500">Loading subscription details...</div>}>
      <BillingContent />
    </Suspense>
  );
}
