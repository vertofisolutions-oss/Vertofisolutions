import Link from "next/link";
import {
  ArrowRight,
  Check,
  Plug,
  Workflow,
  Sparkles,
  ShieldCheck,
  X,
  Layers,
  Building2,
  TrendingUp,
  Factory,
  Rocket,
  UserCheck,
  Store,
  Briefcase,
} from "lucide-react";
import { Container, SectionHeading } from "../components/primitives";
import { INNOVATIONS } from "../lib/innovations";
import { BHS_DIMENSIONS, links } from "../lib/site";

const AUDIENCE_CARDS = [
  { name: "MSMEs", icon: Building2, desc: "Daily accounting & GST" },
  { name: "Growing Businesses", icon: TrendingUp, desc: "Cashflow & runway tracking" },
  { name: "Manufacturers", icon: Factory, desc: "Vendor & inventory audits" },
  { name: "Agencies", icon: Rocket, desc: "Invoicing & retainers" },
  { name: "Consultants", icon: UserCheck, desc: "Expense capture & filings" },
  { name: "Retail Businesses", icon: Store, desc: "POS & automated bank sync" },
  { name: "Service Companies", icon: Layers, desc: "Ledgers & real-time P&L" },
  { name: "Startups", icon: Briefcase, desc: "Burn rate & investor reports" },
];

export default function Home() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(19,120,248,0.06),transparent)]" />
        <Container className="relative pt-20 pb-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> Predictive Financial Intelligence Platform
            </span>
            <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Accounting that Thinks.
              <br />
              Predicts. <span className="text-brand">Protects.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Vertofi is a Predictive Financial Intelligence Platform that helps businesses automate
              accounting, monitor compliance, detect financial risks, and make better decisions using
              AI-powered financial intelligence.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={links.getStarted}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-bg2"
              >
                Explore Innovations
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ───────────────────────── Trust / Built for ───────────────────────── */}
      <section className="border-y border-border/70 bg-bg2/60 py-12">
        <Container>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted shadow-2xs">
              <Sparkles className="h-3 w-3 text-brand" /> Built for High-Growth Sectors
            </span>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4">
            {AUDIENCE_CARDS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="group relative flex items-center gap-3 rounded-xl border border-border/80 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand transition-colors duration-200 group-hover:bg-brand group-hover:text-white">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs font-semibold text-ink sm:text-sm">{item.name}</h3>
                    <p className="truncate text-[11px] text-muted">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ───────────────────────── BHS framework ───────────────────────── */}
      <section className="py-24">
        <Container>
          <SectionHeading
            eyebrow="Business Health Score"
            title="Understand financial health beyond accounting."
            subtitle="A continuous score across seven dimensions of financial health — not a vanity number, a methodology. Here is exactly what Vertofi measures."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BHS_DIMENSIONS.map((d, i) => (
              <div key={d.name} className="rounded-2xl border border-borderCard bg-white p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-bg2 text-xs font-semibold text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-semibold text-ink">{d.name}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{d.desc}</p>
              </div>
            ))}
          </div>

          {/* BHS Calculator CTA */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="text-sm text-muted">
              Ready to measure your business financial health in real-time?
            </p>
            <Link
              href="/bhs"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              Check Your BHS Score <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-muted/70">
              Free · No account needed · Pure mathematical engine · Results in 3 minutes
            </p>
          </div>
        </Container>
      </section>

      {/* ───────────────────────── 15 Innovations ───────────────────────── */}
      <section className="border-t border-border bg-bg2 py-24">
        <Container>
          <SectionHeading
            eyebrow="The Vertofi Intelligence Suite"
            title="One platform. Fifteen innovations."
            subtitle="Every module eliminates an entire class of finance problem — from manual entry to silent leakage to compliance penalties."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INNOVATIONS.map((it) => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.slug}
                  href={`/features#${it.slug}`}
                  className="group flex flex-col rounded-2xl border border-borderCard bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{it.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{it.tagline}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand opacity-0 transition group-hover:opacity-100">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ───────────────────────── How it works ───────────────────────── */}
      <section className="py-24">
        <Container>
          <SectionHeading eyebrow="How it works" title="From connected to confident, in four steps." />
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { icon: Plug, title: "Connect Financial Systems", desc: "Link bank, GST, POS and payroll through secure integrations." },
              { icon: Workflow, title: "Automate Accounting Operations", desc: "Invoices captured, categorized and reconciled in the background." },
              { icon: Sparkles, title: "Receive Predictive Insights", desc: "Health score, tax warnings and leak detection — continuously." },
              { icon: ShieldCheck, title: "Take Action With Confidence", desc: "Approve, file and decide with an audit trail behind every move." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="relative rounded-2xl border border-borderCard bg-white p-6 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-3xl font-bold text-bg2">{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>


      {/* ───────────────────────── Why Vertofi ───────────────────────── */}
      <section className="py-24">
        <Container>
          <SectionHeading eyebrow="Why Vertofi" title="Traditional accounting records the past. Vertofi shapes what's next." />
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white p-8">
              <div className="flex items-center gap-2 text-muted">
                <Layers className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Traditional Accounting</h3>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm text-muted">
                  <X className="h-4 w-4 shrink-0 text-slate-400" /> Records history
                </li>
                {["Reactive to problems", "Manual data entry", "Month-end surprises"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm text-muted">
                    <X className="h-4 w-4 shrink-0 text-slate-400" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-brand/20 bg-brand-50/40 p-8 shadow-soft">
              <div className="flex items-center gap-2 text-brand">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Vertofi</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {["Automates", "Analyzes", "Predicts", "Protects", "Advises"].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm font-medium text-ink">
                    <Check className="h-4 w-4 shrink-0 text-brand" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section className="border-t border-border bg-ink py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Stop managing finances.
              <br />
              Start understanding them.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Connect your business and experience predictive financial intelligence built for modern
              businesses.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={links.getStarted}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
