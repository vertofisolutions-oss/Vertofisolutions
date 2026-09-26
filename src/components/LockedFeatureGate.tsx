"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Zap,
  X,
  Check,
  Shield,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import {
  FeatureKey,
  isFeatureLocked,
  getFeatureGateInfo,
  normalizePlan,
  getUserActivePlan,
  subscriptionService,
  SubscriptionState,
  PlanTier,
  PLANS,
  ADD_ONS,
  checkUsageLimit,
  SubscriptionUsage,
} from "@/lib/plans";

interface LockedFeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** When true, renders children with a blurred backdrop and an overlay lock card */
  inlineOverlay?: boolean;
}

export function LockedFeatureGate({
  feature,
  children,
  inlineOverlay = false,
}: LockedFeatureGateProps) {
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionState>(() =>
    subscriptionService.getSubscription()
  );
  const [mounted, setMounted] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalCycle, setModalCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  useEffect(() => {
    setMounted(true);
    const read = () => {
      setSub(subscriptionService.getSubscription());
    };
    read();
    window.addEventListener("vertofi:subscription-changed", read);
    window.addEventListener("vertofi:plan-changed", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("vertofi:subscription-changed", read);
      window.removeEventListener("vertofi:plan-changed", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (!mounted) {
    // Prevent hydration flicker
    return <>{children}</>;
  }

  const locked = isFeatureLocked(feature, sub);

  if (!locked) {
    return <>{children}</>;
  }

  const gate = getFeatureGateInfo(feature);
  const currentPlanName = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1).toLowerCase();
  const requiredPlanName = gate.minPlan.charAt(0).toUpperCase() + gate.minPlan.slice(1).toLowerCase();

  const handleInstantUpgrade = (targetPlan: PlanTier) => {
    subscriptionService.setPlan(targetPlan, modalCycle);
    setShowUpgradeModal(false);
  };

  const handleStartTrial = () => {
    subscriptionService.startGrowthTrial();
    setShowUpgradeModal(false);
  };

  const handleUnlockCommercial = () => {
    subscriptionService.toggleCommercialFeature(feature, true);
    setShowUpgradeModal(false);
  };

  return (
    <>
      {inlineOverlay ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200">
          <div className="pointer-events-none select-none opacity-15 blur-[3px]">
            {children}
          </div>
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 p-6 backdrop-blur-sm text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 shadow-xl">
              <Lock className="h-7 w-7" />
            </div>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300">
              Upgrade Required
            </span>
            <h3 className="mt-2 text-lg font-bold text-white tracking-tight">
              {gate.headline}
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-200 leading-relaxed">
              {gate.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-amber-600 hover:to-amber-700 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" /> Upgrade to Unlock
              </button>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto my-8 max-w-3xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl transition-all">
          {/* Top Lock Banner */}
          <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      <ShieldAlert className="h-3 w-3" /> Current Plan: {currentPlanName}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Required Plan: {requiredPlanName}
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    {gate.label}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 cursor-pointer"
                >
                  Upgrade Now <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View Plans
                </Link>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium text-slate-700 leading-relaxed">
              {gate.isCommercialAddon
                ? `${gate.label} is a commercial feature/add-on and is not included in your current subscription configuration.`
                : `${gate.label} is available with ${requiredPlanName} and above.`}
            </p>
          </div>

          {/* Value Proposition bullets */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  What you unlock with {gate.outcomeNeeded}:
                </h4>
                {sub.plan === "FREE" && sub.status !== "trial" && (
                  <button
                    type="button"
                    onClick={handleStartTrial}
                    className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Try 14 Days Free
                  </button>
                )}
              </div>
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gate.bulletPoints.map((bp, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs font-medium text-slate-700"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trial callout */}
            {sub.plan === "FREE" && sub.status !== "trial" && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950">14-Day Growth Trial Available</h5>
                    <p className="text-[11px] text-emerald-800">Experience Growth prediction, ProfitLeak & AI Advisor. No credit card required.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartTrial}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer shrink-0"
                >
                  Start 14-Day Free Trial
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Official Upgrade Modal ── */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                    Upgrade Your Plan to Unlock This Feature
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                  <span>Current Plan: <strong className="text-slate-900">{currentPlanName}</strong></span>
                  <span>•</span>
                  <span>Required Plan: <strong className="text-blue-600">{requiredPlanName}</strong></span>
                  <span>•</span>
                  <span>Feature: <strong className="text-slate-900">{gate.label}</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Commercial Add-On Quick Action */}
            {gate.isCommercialAddon && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-blue-950">{gate.label} Commercial Configuration</h4>
                  <p className="text-[11px] text-blue-800">Unlock {gate.label} as a standalone commercial add-on for ₹499/month without changing your base plan.</p>
                </div>
                <button
                  type="button"
                  onClick={handleUnlockCommercial}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 shrink-0 cursor-pointer"
                >
                  Enable Add-On (₹499/mo)
                </button>
              </div>
            )}

            {/* Billing Toggle (Monthly / Annual) */}
            <div className="flex items-center justify-center">
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalCycle("MONTHLY")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                    modalCycle === "MONTHLY" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setModalCycle("YEARLY")}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                    modalCycle === "YEARLY" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Annual Billing <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">Save up to 17%</span>
                </button>
              </div>
            </div>

            {/* 4 Paid Pricing Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.filter((p) => p.id !== "FREE").map((p) => {
                const isTargetMin = p.id === gate.minPlan;
                const isGrowth = p.id === "GROWTH";
                const displayPrice = modalCycle === "MONTHLY" ? p.priceDisplay : p.annualPriceDisplay;
                const unit = modalCycle === "MONTHLY" ? "/mo" : "/yr";

                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-5 transition ${
                      isTargetMin
                        ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md"
                        : isGrowth
                        ? "border-amber-400 bg-white shadow-sm"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {isTargetMin && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Required Plan
                      </span>
                    )}
                    {isGrowth && !isTargetMin && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        ★ Most Popular
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                          {p.outcome}
                        </span>
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold text-slate-900">{displayPrice}</span>
                          {p.priceDisplay !== "Custom" && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
                        </div>
                        {p.founderPriceDisplay && (
                          <p className="mt-1 text-[10.5px] font-semibold text-amber-700">
                            Founder: {p.founderPriceDisplay}/mo
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">
                          {p.users} · {p.gstins}
                        </p>
                      </div>

                      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-700">
                        {p.features.slice(0, 4).map((f, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-[11px] leading-tight">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleInstantUpgrade(p.id)}
                        className={`w-full rounded-xl py-2.5 text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                          isTargetMin
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Upgrade to {p.name}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <Link
                  href="/pricing"
                  onClick={() => setShowUpgradeModal(false)}
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
                >
                  View All Plans & Add-Ons <ArrowRight className="h-3 w-3" />
                </Link>
                <span>•</span>
                <Link
                  href="/subscribe"
                  onClick={() => setShowUpgradeModal(false)}
                  className="font-semibold text-slate-600 hover:underline"
                >
                  Manage Billing Settings
                </Link>
              </div>

              {sub.plan === "FREE" && sub.status !== "trial" && (
                <button
                  type="button"
                  onClick={handleStartTrial}
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Or Start 14-Day Growth Trial Free
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Reusable Usage Limit Warning Component
 * Shows when transactions, scanned bills, users, or GSTINs limits are exceeded.
 */
export function UsageLimitBanner({
  metric,
  current,
}: {
  metric: keyof SubscriptionUsage;
  current?: number;
}) {
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionState>(() => subscriptionService.getSubscription());

  useEffect(() => {
    const read = () => setSub(subscriptionService.getSubscription());
    window.addEventListener("vertofi:subscription-changed", read);
    return () => window.removeEventListener("vertofi:subscription-changed", read);
  }, []);

  const check = checkUsageLimit(metric, 1, sub);

  if (check.allowed) return null;

  return (
    <div className="my-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-red-950">Limit Reached</h4>
            <p className="text-xs text-red-800 leading-relaxed mt-0.5">
              {check.message || `You have reached your ${metric} limit for this billing period.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/pricing"
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition"
          >
            Upgrade Plan
          </Link>
          <Link
            href="/subscribe"
            className="rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-900 hover:bg-red-100 transition"
          >
            View Usage
          </Link>
        </div>
      </div>
    </div>
  );
}
