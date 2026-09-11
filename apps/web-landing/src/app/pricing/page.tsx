import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Sparkles, Zap, Shield, Building2 } from "lucide-react";
import { Container, SectionHeading } from "../../components/primitives";
import { PLANS, PRICING_TABLE, ADD_ONS, TURNOVER_MAPPING } from "../../lib/plans";
import { links } from "../../lib/site";

export const metadata: Metadata = {
  title: "Pricing — Vertofi (AI-FOS)",
  description: "AI Financial Operating System pricing plans for Indian MSMEs. Transparent, scalable tiers built for pre-revenue to enterprise.",
};

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border bg-bg2 py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Vertofi Pricing"
            title="AI Financial Operating System for Indian MSMEs"
            subtitle="Transparent pricing built to align with your business outcomes. From pre-revenue curiosity to full enterprise scale, choose the plan that fits your stage."
          />
        </Container>
      </section>

      {/* Plan cards */}
      <section className="py-16 sm:py-20">
        <Container>
          {/* Launch Offer Banner */}
          <div className="mx-auto mb-12 max-w-5xl rounded-2xl border border-amber-200/90 bg-amber-50/80 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
                <Sparkles className="h-4 w-4 text-amber-700" /> Launch Offer — First 1,000 Customers
              </span>
              <p className="mt-3 max-w-3xl text-sm sm:text-base font-medium leading-relaxed text-slate-800">
                Lock in Founder Prices: <strong className="font-bold text-slate-900">₹399/mo</strong> (Starter), <strong className="font-bold text-slate-900">₹1,199/mo</strong> (Growth), or <strong className="font-bold text-slate-900">₹2,999/mo</strong> (Scale).
              </p>
              <p className="mt-1 text-xs text-slate-600">
                * Founder Price remains valid while subscription stays continuously active and subject to fair-use limits.
              </p>
            </div>
          </div>

          {/* 5 Pricing Tier Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 transition-all duration-200 ${
                  plan.popular
                    ? "border-brand shadow-lg ring-2 ring-brand/20 -translate-y-1 lg:-translate-y-2"
                    : "border-borderCard shadow-card hover:border-brand/40"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                    ★ Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {plan.outcome}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-muted min-h-[36px]">{plan.tagline}</p>

                  <div className="mt-5 border-t border-borderCard pt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight text-ink">{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-xs font-semibold text-muted">/mo</span>}
                    </div>

                    {plan.annualPrice !== "₹0" && plan.annualPrice !== "Custom" && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-700">
                        {plan.annualPrice}/yr <span className="text-muted">({plan.monthlyEquivalent}/mo equivalent)</span>
                      </p>
                    )}

                    {plan.founderPrice && (
                      <p className="mt-1 text-[11px] font-semibold text-amber-700">
                        Founder Price: {plan.founderPrice}/mo
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-[11px] text-slate-500 font-medium">
                      <p>🎯 Turnover: {plan.audience}</p>
                      <p>👥 Users: {plan.users}</p>
                      <p>🏛️ GSTINs: {plan.gstins}</p>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2.5 border-t border-borderCard pt-4">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-xs ${idx === 0 && f.startsWith("Everything") ? "font-bold text-brand" : "text-ink"}`}>
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-borderCard">
                  <a
                    href={plan.price === "Custom" ? "/subscribe?upgrade=ENTERPRISE" : `/dashboard?plan=${plan.id.toLowerCase()}`}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                      plan.popular
                        ? "bg-brand text-white shadow-md hover:bg-brand-600"
                        : "border border-border bg-white text-ink hover:bg-bg2"
                    }`}
                  >
                    {plan.price === "Custom" ? "Talk to Sales" : "Get Started"} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Plan Overview & Comparison Table */}
      <section className="border-t border-border bg-bg2 py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand">
              <Zap className="h-3.5 w-3.5" /> Plan Overview
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Compare Tiers & Business Outcomes
            </h2>
            <p className="mt-2 text-sm text-muted">
              Every pricing tier represents a business outcome, not merely more features.
            </p>
          </div>

          {/* Overview Table */}
          <div className="mx-auto mt-10 max-w-5xl overflow-x-auto rounded-2xl border border-border bg-white shadow-card">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-bg2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Monthly</th>
                  <th className="px-4 py-3.5">Annual</th>
                  <th className="px-4 py-3.5">Best For (Turnover)</th>
                  <th className="px-4 py-3.5">Users</th>
                  <th className="px-4 py-3.5">GSTINs</th>
                  <th className="px-4 py-3.5">Main Outcome</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TABLE.map((row) => (
                  <tr key={row.plan} className="border-b border-borderCard last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-bold text-ink">{row.plan}</td>
                    <td className="px-4 py-3.5 font-semibold text-ink">{row.monthly}</td>
                    <td className="px-4 py-3.5 text-muted">{row.annual}</td>
                    <td className="px-4 py-3.5 text-muted">{row.turnover}</td>
                    <td className="px-4 py-3.5 text-muted">{row.users}</td>
                    <td className="px-4 py-3.5 text-muted">{row.gstins}</td>
                    <td className="px-4 py-3.5 font-semibold text-brand">{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* Recommended Turnover Mapping */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-brand" /> Turnover Mapping Guide
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Recommended Plan for Your Business Turnover
            </h2>
            <p className="mt-2 text-sm text-muted">
              Select your annual turnover range to find your recommended Vertofi plan.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-bg2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3.5">Annual Turnover</th>
                  <th className="px-5 py-3.5">Recommended Vertofi Plan</th>
                  <th className="px-5 py-3.5">Target Outcome</th>
                </tr>
              </thead>
              <tbody>
                {TURNOVER_MAPPING.map((m) => (
                  <tr key={m.turnover} className="border-b border-borderCard last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-800">{m.turnover}</td>
                    <td className="px-5 py-4 font-bold text-ink">{m.plan}</td>
                    <td className="px-5 py-4 text-muted">{m.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            * Turnover serves as a guideline. Business complexity (GSTIN count, high transaction volume) may warrant a higher tier.
          </p>
        </Container>
      </section>

      {/* Add-ons & Special Programs */}
      <section className="border-t border-border bg-bg2 py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Add-ons Card */}
            <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card">
              <div className="flex items-center gap-2 text-brand">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-bold text-ink">Platform Add-ons</h3>
              </div>
              <p className="mt-1 text-xs text-muted">Need extra capacity without jumping tiers? Add what you need.</p>
              <div className="mt-6 divide-y divide-borderCard">
                {ADD_ONS.map((a) => (
                  <div key={a.item} className="flex items-center justify-between py-3 text-xs sm:text-sm">
                    <span className="font-medium text-ink">{a.item}</span>
                    <span className="font-bold text-brand">{a.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vertofi for CA Firms & Startups */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card">
              <div>
                <div className="flex items-center gap-2 text-brand">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="text-lg font-bold text-ink">Special Partner Programs</h3>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Vertofi for CA Firms</h4>
                    <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                      Partner accounts start at <strong>Free</strong> for up to 5 clients. Scale with 20–30% recurring commissions as a Vertofi Certified Partner.
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">Vertofi for Startups</h4>
                    <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                      Eligible incorporated startups under 2 years old receive <strong>Growth plan free for 3 months</strong>, followed by 50% off for the next 6 months.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Inquire About Partner & Startup Benefits <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
