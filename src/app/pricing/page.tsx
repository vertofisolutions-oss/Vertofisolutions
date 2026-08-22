import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Container, SectionHeading } from "../../components/primitives";
import { PLANS, PRICING_TABLE } from "../../lib/plans";
import { links } from "../../lib/site";

export const metadata: Metadata = {
  title: "Pricing — Vertofi",
  description: "Simple plans. Predictable value. Choose the plan that fits your business stage and scale as you grow.",
};

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border bg-bg2 py-20">
        <Container>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple plans. Predictable value."
            subtitle="Choose the plan that fits your current business stage. Seamlessly upgrade as your financial operation scales. All pricing excludes GST."
          />
        </Container>
      </section>

      {/* Plan cards */}
      <section className="py-20">
        <Container>
          {/* Launch Offer Banner */}
          <div className="mx-auto mb-12 max-w-4xl rounded-2xl border border-amber-200/90 bg-amber-50/70 p-6 sm:p-8 text-center shadow-sm">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-700">
              <Sparkles className="h-4 w-4 text-amber-600" /> Launch Offer — First 1,000 Customers
            </span>
            <p className="mt-3 text-sm sm:text-base font-medium leading-relaxed text-slate-800">
              Lock in <strong className="font-bold text-slate-900">₹499</strong> (Starter), <strong className="font-bold text-slate-900">₹1,499</strong> (Growth), or <strong className="font-bold text-slate-900">₹3,499</strong> (Power) per month — for life, as long as your subscription stays active. Price never goes up, even when list prices do.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
                  plan.popular ? "border-brand/40 shadow-soft ring-1 ring-brand/10" : "border-borderCard shadow-card"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-ink">{plan.name} Plan</h3>
                <p className="mt-2 min-h-[40px] text-sm text-muted">{plan.audience}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-ink">{plan.price}</span>
                  <span className="text-sm text-muted">/mo</span>
                  <span className="ml-1 text-xs text-muted">+ GST</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3 border-t border-borderCard pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-col gap-2">
                  <a
                    href={links.getStarted}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                      plan.popular ? "bg-brand text-white hover:bg-brand-600" : "border border-border bg-white text-ink hover:bg-bg2"
                    }`}
                  >
                    Get Started <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link href="/features" className="text-center text-xs font-medium text-muted transition hover:text-ink">
                    View full details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Pricing overview table */}
      <section className="border-t border-border bg-bg2 py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-50 px-3 py-1 text-xs font-semibold text-gold">
              Up to 25% off annually
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">Pricing overview</h2>
            <p className="mt-3 text-sm text-muted">
              Save significantly with 3-month, 6-month, or 12-month billing. All pricing excludes GST.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg2 text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-4 font-semibold">Plan</th>
                  <th className="px-5 py-4 font-semibold">Monthly</th>
                  <th className="px-5 py-4 font-semibold">3 Months</th>
                  <th className="px-5 py-4 font-semibold">6 Months</th>
                  <th className="px-5 py-4 font-semibold">12 Months</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TABLE.map((row) => (
                  <tr key={row.plan} className="border-b border-borderCard last:border-0">
                    <td className="px-5 py-4 font-semibold text-ink">{row.plan}</td>
                    <td className="px-5 py-4 text-muted">{row.monthly}</td>
                    <td className="px-5 py-4 text-muted">{row.q}</td>
                    <td className="px-5 py-4 text-muted">{row.h}</td>
                    <td className="px-5 py-4 font-medium text-ink">{row.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-xs text-muted">+ GST applies to all plans.</p>
        </Container>
      </section>
    </>
  );
}
