"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, ArrowRight, CheckCircle2, ShieldAlert, Zap, X, Check, Shield } from "lucide-react";
import {
  FeatureKey,
  isFeatureLocked,
  getFeatureGateInfo,
  normalizePlan,
  PlanTier,
  PLANS,
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
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("FREE");
  const [mounted, setMounted] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [modalCycle, setModalCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  useEffect(() => {
    setMounted(true);
    const read = () => {
      const p = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan") || "FREE";
      setCurrentPlan(normalizePlan(p));
    };
    read();
    window.addEventListener("vertofi:plan-changed", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("vertofi:plan-changed", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (!mounted) {
    // Avoid SSR hydration flicker
    return <>{children}</>;
  }

  const locked = isFeatureLocked(feature, currentPlan);

  if (!locked) {
    return <>{children}</>;
  }

  const gate = getFeatureGateInfo(feature);

  const plansList: { tier: PlanTier; label: string; price: string }[] = [
    { tier: "FREE", label: "Free", price: "₹0" },
    { tier: "STARTER", label: "Starter", price: "₹499" },
    { tier: "GROWTH", label: "Growth ★", price: "₹1,499" },
    { tier: "SCALE", label: "Scale", price: "₹3,999" },
    { tier: "ENTERPRISE", label: "Enterprise", price: "Custom" },
  ];

  return (
    <>
      {inlineOverlay ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200">
          <div className="pointer-events-none select-none opacity-20 blur-[2px]">
            {children}
          </div>
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/40 p-6 backdrop-blur-sm text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 shadow-lg">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-white tracking-tight">
              {gate.headline}
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-200 leading-relaxed">
              {gate.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:from-amber-600 hover:to-amber-700 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" /> Unlock on {gate.outcomeNeeded}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto my-6 max-w-3xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl transition-all">
          {/* Top Banner */}
          <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      <ShieldAlert className="h-3 w-3" /> Locked on {currentPlan} Plan
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Requires {gate.minPlan}
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    {gate.label}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPricingModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 cursor-pointer"
              >
                Upgrade to {gate.minPlan} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-4 text-sm font-medium text-slate-700 leading-relaxed">
              {gate.description}
            </p>
          </div>

          {/* Feature Value Proposition */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  What you unlock with {gate.outcomeNeeded}:
                </h4>
                <button
                  type="button"
                  onClick={() => setShowPricingModal(true)}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" /> View Upgrade Pricing
                </button>
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
          </div>
        </div>
      )}

      {/* ── Interactive Upgrade Pricing Modal ── */}
      {showPricingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowPricingModal(false)}
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
                    Upgrade Pricing Reference
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    Required: {gate.minPlan}
                  </span>
                </div>
                <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Unlock {gate.label}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Select your tier to unlock automated workflows, financial intelligence, and multi-user access.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPricingModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Billing Toggle (Monthly / Annual 20% OFF) */}
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
                  Annual Billing <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">20% OFF</span>
                </button>
              </div>
            </div>

            {/* Pricing Cards Grid (From Pricing PDF) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.filter((p) => p.id !== "FREE").map((p) => {
                const isTargetMin = p.id === gate.minPlan;
                const isGrowth = p.id === "GROWTH";
                const displayPrice = modalCycle === "MONTHLY" ? p.price : p.annualPrice;
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
                        Required Tier
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
                          {p.price !== "Custom" && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
                        </div>
                        {p.founderPrice && (
                          <p className="mt-1 text-[10.5px] font-semibold text-amber-700">
                            Founder: {p.founderPrice}/mo
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

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          router.push(`/subscribe?plan=${p.id.toLowerCase()}`);
                          setShowPricingModal(false);
                        }}
                        className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Upgrade to {p.name}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <p>
                * Founder Price valid while subscription remains active. 14-day free trial on Growth plan.
              </p>
              <Link
                href="/pricing"
                onClick={() => setShowPricingModal(false)}
                className="font-bold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
              >
                View Full Pricing Page <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
