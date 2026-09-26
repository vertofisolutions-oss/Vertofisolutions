"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Building2,
  Lock,
  HelpCircle,
  Clock,
  Briefcase,
  Users,
  Layers,
  FileText,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import {
  PLANS,
  ADD_ONS,
  SPECIALIST_PRODUCTS,
  CA_PARTNER_TIERS,
  TURNOVER_MAPPING,
  FAQS,
  PlanTier,
  BillingCycle,
  subscriptionService,
} from "../../lib/plans";

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"plans" | "suite" | "specialist" | "addons" | "partners">("plans");

  const handleSelectPlan = (planId: PlanTier) => {
    if (planId === "ENTERPRISE") {
      window.location.href = "/contact?intent=enterprise";
      return;
    }
    subscriptionService.setPlan(planId, cycle);
    window.location.href = `/subscribe?plan=${planId.toLowerCase()}&cycle=${cycle.toLowerCase()}`;
  };

  const handleStartTrial = () => {
    subscriptionService.startGrowthTrial();
    window.location.href = "/dashboard?trial=started";
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white py-16 sm:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(19,120,248,0.12),rgba(255,255,255,0))]" />
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-blue-700 shadow-xs">
            <Sparkles className="h-4 w-4 text-blue-600" />
            AI Accounting • Financial Intelligence • Compliance • Business Decision Intelligence
          </div>

          <h1 className="mt-6 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950">
            Your Business. <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">One Financial Operating System.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm sm:text-base text-slate-600 leading-relaxed">
            Transparent pricing aligned with real business outcomes. From pre-revenue financial visibility to multi-branch command centers and enterprise deployments.
          </p>

          {/* ── 2. Monthly / Yearly Toggle ── */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="flex items-center rounded-2xl bg-slate-100 p-1.5 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setCycle("MONTHLY")}
                className={`rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                  cycle === "MONTHLY"
                    ? "bg-white text-slate-950 shadow-md ring-1 ring-slate-950/5"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setCycle("YEARLY")}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                  cycle === "YEARLY"
                    ? "bg-white text-slate-950 shadow-md ring-1 ring-slate-950/5"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Annual Billing
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                  Save ~17%
                </span>
              </button>
            </div>
          </div>

          {/* Founder Pricing Banner */}
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs sm:text-sm text-slate-800 shadow-xs">
            <span className="font-bold text-amber-900">🚀 Founder Program (First 1,000 Customers):</span>{" "}
            Lock in <strong className="text-slate-950">₹399/mo</strong> (Starter), <strong className="text-slate-950">₹1,199/mo</strong> (Growth), or <strong className="text-slate-950">₹2,999/mo</strong> (Scale) while continuously active.
          </div>
        </div>
      </section>

      {/* ── 3. Five Pricing Cards ── */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
            {PLANS.map((plan) => {
              const isGrowth = plan.id === "GROWTH";
              const isEnterprise = plan.id === "ENTERPRISE";
              const displayPrice = cycle === "MONTHLY" ? plan.priceDisplay : plan.annualPriceDisplay;
              const unit = plan.priceDisplay === "Custom" ? "" : cycle === "MONTHLY" ? "/mo" : "/year";

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 transition-all duration-200 ${
                    isGrowth
                      ? "border-blue-600 shadow-2xl ring-2 ring-blue-500/20 lg:-translate-y-2 bg-gradient-to-b from-blue-50/30 to-white"
                      : "border-slate-200 shadow-md hover:border-slate-300 hover:shadow-lg"
                  }`}
                >
                  {isGrowth && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md">
                      ★ Most Popular
                    </span>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                          {plan.positioning}
                        </p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        {plan.outcome}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 min-h-[38px] leading-relaxed">
                      {plan.tagline}
                    </p>

                    {/* Price Block */}
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black tracking-tight text-slate-950">
                          {displayPrice}
                        </span>
                        {unit && <span className="text-xs font-bold text-slate-500">{unit}</span>}
                      </div>

                      {cycle === "YEARLY" && plan.monthlyEquivalentDisplay !== "₹0" && plan.monthlyEquivalentDisplay !== "Custom" && (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                          ({plan.monthlyEquivalentDisplay}/mo equivalent)
                        </p>
                      )}

                      {plan.founderPriceDisplay && (
                        <div className="mt-1.5 inline-block rounded-md bg-amber-100/80 px-2 py-0.5 text-[10.5px] font-bold text-amber-900">
                          Founder: {plan.founderPriceDisplay}/mo
                        </div>
                      )}

                      {/* Quotas & Turnover */}
                      <div className="mt-4 space-y-1 rounded-xl bg-slate-50 p-2.5 text-[11px] font-medium text-slate-600 border border-slate-100">
                        <p>🎯 <strong className="text-slate-900">Turnover:</strong> {plan.turnoverGuidance}</p>
                        <p>👥 <strong className="text-slate-900">Users:</strong> {plan.users}</p>
                        <p>🏛️ <strong className="text-slate-900">GSTINs:</strong> {plan.gstins}</p>
                        <p>⚡ <strong className="text-slate-900">Txns:</strong> {plan.transactions}</p>
                        {plan.scannedBills !== "—" && (
                          <p>📸 <strong className="text-slate-900">Scanned Bills:</strong> {plan.scannedBills}</p>
                        )}
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 stroke-[3]" />
                          <span className={idx === 0 && feat.startsWith("Everything") ? "font-bold text-slate-950" : ""}>
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Action */}
                  <div className="mt-8 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold transition shadow-sm cursor-pointer ${
                        isGrowth
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                          : isEnterprise
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {isEnterprise ? "Contact Sales" : `Select ${plan.name}`} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. 14-Day Growth Trial Banner ── */}
      <section className="py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <Sparkles className="h-4 w-4 text-emerald-700" /> Official 14-Day Growth Trial
                </span>
                <h3 className="mt-3 text-xl sm:text-2xl font-black text-slate-950">
                  Experience full Growth prediction with Zero commitment.
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed">
                  • 14-day Growth experience • No credit card required • ProfitLeak, predictive insights and AI Advisor enabled • At trial end, choose a paid plan or move to Free with all historical data preserved.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartTrial}
                className="shrink-0 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 cursor-pointer flex items-center gap-2"
              >
                Start 14-Day Free Trial <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Navigation Tabs for Sections ── */}
      <section className="mt-12 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex overflow-x-auto gap-2 py-3 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveTab("plans")}
              className={`rounded-xl px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === "plans" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Plan Comparison Table
            </button>
            <button
              onClick={() => setActiveTab("suite")}
              className={`rounded-xl px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === "suite" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Complete Product Suite
            </button>
            <button
              onClick={() => setActiveTab("specialist")}
              className={`rounded-xl px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === "specialist" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Specialist Products & Services
            </button>
            <button
              onClick={() => setActiveTab("addons")}
              className={`rounded-xl px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === "addons" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Add-Ons & Capacity
            </button>
            <button
              onClick={() => setActiveTab("partners")}
              className={`rounded-xl px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === "partners" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              CA Partner & Professional
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. Tab Content: Comparison Table ── */}
      {activeTab === "plans" && (
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-md">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="p-4">Plan</th>
                    <th className="p-4">Monthly</th>
                    <th className="p-4">Yearly</th>
                    <th className="p-4">Turnover Guidance</th>
                    <th className="p-4">Users</th>
                    <th className="p-4">GSTINs</th>
                    <th className="p-4">Positioning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {PLANS.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-bold text-slate-950">
                        {p.name} {p.id === "GROWTH" && "★"}
                      </td>
                      <td className="p-4">{p.priceDisplay}</td>
                      <td className="p-4">{p.annualPriceDisplay}</td>
                      <td className="p-4">{p.turnoverGuidance}</td>
                      <td className="p-4">{p.users}</td>
                      <td className="p-4">{p.gstins}</td>
                      <td className="p-4">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {p.positioning}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Turnover Guidance Note */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h4 className="text-sm font-bold text-slate-950">Turnover Guidance Policy</h4>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Turnover ranges are guidance only and are <strong>not strict technical restrictions</strong>. A business at any stage may freely select whichever plan best matches their required transaction volumes and decision-intelligence capabilities.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 7. Tab Content: Complete Product Suite ── */}
      {activeTab === "suite" && (
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-950">Complete Vertofi Product Suite</h3>
              <p className="text-xs text-slate-600">Real capabilities and where they are placed in the commercial structure.</p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-md">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="p-4">Product</th>
                    <th className="p-4">What It Does</th>
                    <th className="p-4">Commercial Placement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">AI Accounting</td><td className="p-4">Automated capture, categorization, reconciliation and accounting workflows.</td><td className="p-4 text-blue-600 font-semibold">Core platform; depth varies by plan.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Zero-Data-Entry Accounting</td><td className="p-4">Captures bills/data from WhatsApp, email, photos, PDFs, POS and connected systems.</td><td className="p-4 text-blue-600 font-semibold">Core capability; limits apply.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Invisible Accounting</td><td className="p-4">Low-touch accounting with monitoring, alerts and escalation workflows.</td><td className="p-4 text-blue-600 font-semibold">Core capability; depth varies.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">WhatsApp Micro Accounting / WhatsApp CFO</td><td className="p-4">Accounting, questions, alerts and financial interactions through WhatsApp.</td><td className="p-4 text-blue-600 font-semibold">Progressive by plan (Starter+).</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Business Financial Health Score</td><td className="p-4">0–100 financial intelligence score across seven pillars.</td><td className="p-4 text-blue-600 font-semibold">Basic Free; Full Starter; Advanced Growth; Branch/Group Scale.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">ProfitLeak Finder</td><td className="p-4">Detects overspending, duplicate invoices and potential profit leakage.</td><td className="p-4 text-indigo-600 font-bold">Growth+</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Predictive Tax Warning / TaxShield AI</td><td className="p-4">Predicts tax/GST risks and provides advance warnings.</td><td className="p-4 text-indigo-600 font-bold">Growth+</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Money Map</td><td className="p-4">Visualizes cash inflows/outflows, drains, profit zones, receivables and seasonality.</td><td className="p-4 text-indigo-600 font-semibold">Financial intelligence capability.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Cash Flow Predictor</td><td className="p-4">Forecasts 90-day future cash position and pressure.</td><td className="p-4 text-indigo-600 font-bold">Growth+</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Vendor Trust / Risk Score</td><td className="p-4">Analyzes vendor-related financial/business risk signals.</td><td className="p-4 text-indigo-600 font-bold">Growth+</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Virtual Business Director</td><td className="p-4">AI decision support for hiring, loans, pricing, sales decline, expansion and costs.</td><td className="p-4 text-indigo-600 font-bold">Growth+</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Decision Intelligence / Scenario Planning</td><td className="p-4">Models revenue, salary, loan, branch, warehouse and hiring scenarios.</td><td className="p-4 text-purple-600 font-bold">Scale+</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Financial Black Box Recorder</td><td className="p-4">Records financial changes with cryptographic audit context for traceability.</td><td className="p-4 text-purple-600 font-semibold">Scale / Enterprise controls.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Business Lifeguard</td><td className="p-4">Emergency workflow for notices, disputes, fraud, cash-flow and accounting issues.</td><td className="p-4 text-purple-600 font-semibold">Scale+; specialist help may be separate.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Reports & Analytics</td><td className="p-4">P&L, dashboards, insights and management reporting.</td><td className="p-4 text-blue-600 font-semibold">All plans; depth varies.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Industry Benchmarks</td><td className="p-4">Peer/industry comparisons for margins, payroll, GST ratios and percentiles.</td><td className="p-4 text-amber-700 font-bold">Commercial feature / add-on configuration.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Accountant Collaboration</td><td className="p-4">Controlled collaboration between businesses and accountants/CAs.</td><td className="p-4 text-emerald-700 font-semibold">CA Partner / Professional.</td></tr>
                  <tr className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-950">Integrations & Administration</td><td className="p-4">Bank/GST/accounting integrations, roles, permissions, audit & enterprise admin.</td><td className="p-4 text-slate-900 font-semibold">Depth varies; API at Scale.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── 8. Tab Content: Specialist Products & Services ── */}
      {activeTab === "specialist" && (
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-950">Specialist Products & Services</h3>
              <p className="text-xs text-slate-600">
                Separately priced expert services. Not automatically bundled unless included by a commercial arrangement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SPECIALIST_PRODUCTS.map((prod) => (
                <div key={prod.id} className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-950">{prod.name}</h4>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-700">
                        {prod.price}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                      {prod.included}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => alert(`Purchasing ${prod.name} (${prod.price}). Specialist dispatch requested.`)}
                      className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      Book / Request Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 9. Tab Content: Add-Ons ── */}
      {activeTab === "addons" && (
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-950">Official Add-Ons</h3>
              <p className="text-xs text-slate-600">Expand capacity or unlock specific capabilities without upgrading the entire base plan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ADD_ONS.map((addon) => (
                <div key={addon.id} className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-950">{addon.name}</h4>
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                        {addon.price}
                      </span>
                    </div>
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                      {addon.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        subscriptionService.toggleAddOn(addon.id, true);
                        alert(`Add-On "${addon.name}" enabled successfully.`);
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Add to Subscription
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 10. Tab Content: CA Partner & Professional ── */}
      {activeTab === "partners" && (
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
            {/* Financial Partner Program */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 uppercase tracking-wider">
                Financial Partner Program
              </span>
              <h3 className="mt-3 text-2xl font-bold text-slate-950">
                Designed for Chartered Accountants, CFO firms & Finance Professionals
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                The CA Partner subscription is separate from each client's Vertofi software subscription. Clients pay for their respective business plans, while the CA receives an unified portfolio dashboard with 20–30% recurring commissions.
              </p>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3.5">Active Client Businesses</th>
                      <th className="p-3.5">CA Partner Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CA_PARTNER_TIERS.map((tier, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3.5 font-medium text-slate-900">{tier.range}</td>
                        <td className="p-3.5 font-bold text-blue-700">{tier.fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vertofi Professional Card */}
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="rounded-full bg-indigo-200 px-3 py-1 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Independent Practitioners
                </span>
                <h3 className="mt-3 text-2xl font-black text-slate-950">
                  Vertofi Professional — ₹2,999/month
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-700">
                  For accountants, bookkeepers and finance consultants managing client rosters.
                </p>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-800">
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Up to 20 client businesses included</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Portfolio Health Score across clients</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Cross-client alerts & dashboards</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-600" /> Additional clients: ₹149–₹249/mo</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPlan("GROWTH")}
                className="shrink-0 rounded-2xl bg-indigo-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition cursor-pointer"
              >
                Get Vertofi Professional
              </button>
            </div>

            {/* Startup Program */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-md">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Startup Program
              </span>
              <h3 className="mt-3 text-xl font-bold text-slate-950">
                Eligible Startups receive Growth Free for 3 Months
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Receive Growth tier free for 3 months, followed by 50% off for the next 6 months, subject to program eligibility and terms.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 11. Customer FAQs Section ── */}
      <section className="py-16 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider">
              FAQ
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-950">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Everything you need to know about billing, trials, usage limits, and commercial terms.
            </p>
          </div>

          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed animate-in fade-in">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 12. Commercial Terms ── */}
      <section className="py-12 border-t border-slate-200 bg-slate-50/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center text-xs text-slate-500 space-y-2">
          <p>
            • Prices in this document reflect the official Vertofi base pricing structure. Usage limits apply to the applicable monthly/annual billing period.
          </p>
          <p>
            • Displayed prices are subscription fees; applicable statutory GST (18%) is charged as required by law.
          </p>
          <p className="font-bold text-slate-700">
            VERTOFI • AI Accounting + Financial Intelligence + Business Decision Intelligence
          </p>
        </div>
      </section>
    </div>
  );
}
