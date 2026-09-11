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
      <section className="relative overflow-hidden pt-8 pb-20 sm:pt-14 sm:pb-28">
        {/* Professional Multi-Layered Ambient Background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          {/* Layer 1: Blueprint fine grid with soft spotlight mask */}
          <div className="hero-bg-grid absolute inset-0 opacity-80" />
          
          {/* Layer 2: Subtle dot matrix accent */}
          <div className="hero-bg-dots absolute inset-0 opacity-70" />

          {/* Layer 3: Flowing ambient background aura */}
          <div className="animate-mesh-flow absolute -top-48 left-1/2 -translate-x-1/2 h-[540px] w-[860px] rounded-full bg-gradient-to-br from-blue-400/15 via-indigo-300/10 to-sky-300/15 blur-3xl" />
          
          {/* Layer 4: Ambient soft floating light nodes */}
          <div className="animate-float-slow absolute top-36 left-1/6 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="animate-float-delayed absolute top-28 right-1/6 h-80 w-80 rounded-full bg-indigo-300/10 blur-3xl" />

          {/* Layer 5: Luminous divider at bottom */}
          <div className="luminous-divider absolute bottom-0 left-0" />
        </div>

        <Container className="relative pt-12 pb-14 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-md transition hover:border-slate-300 hover:shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Predictive Financial Intelligence Platform</span>
            </div>

            {/* Clean solid headline without text effects */}
            <h1 className="mt-8 text-balance text-5xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Accounting that Thinks.
              <br />
              Predicts. <span className="text-blue-600">Protects.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Vertofi is a Predictive Financial Intelligence Platform that helps businesses automate
              accounting, monitor compliance, detect financial risks, and make better decisions using
              AI-powered financial intelligence.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={links.getStarted}
                prefetch={true}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:translate-y-0"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/features"
                prefetch={true}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm active:translate-y-0"
              >
                Explore Innovations
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ───────────────────────── Trust / Built for ───────────────────────── */}
      <section className="border-y border-slate-200/80 bg-slate-50/60 py-14">
        <Container>
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-2xs">
              <Sparkles className="h-3 w-3 text-blue-600" /> Built for High-Growth Sectors
            </span>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3.5 sm:grid-cols-4">
            {AUDIENCE_CARDS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.name}
                  className="group relative flex items-center gap-3.5 rounded-xl border border-slate-200/85 bg-white/90 p-4 shadow-xs backdrop-blur-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300/80 hover:shadow-md hover:shadow-blue-500/5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 transition-all duration-200 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:shadow-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-blue-600 sm:text-sm">{item.name}</h3>
                    <p className="truncate text-[11px] font-medium text-slate-500">{item.desc}</p>
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
              <div key={d.name} className="pro-card rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{d.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────────────────────── Innovations grid ───────────────────────── */}
      <section className="border-t border-slate-200/80 bg-slate-50/50 py-24">
        <Container>
          <SectionHeading
            eyebrow="The Vertofi Engine"
            title="Automated intelligence across your financial stack."
            subtitle="Every innovation operates autonomously or integrates into your existing workflows."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {INNOVATIONS.map((item) => (
              <div
                key={item.slug}
                className="pro-card group relative flex flex-col justify-between rounded-2xl p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-blue-50 border border-blue-200/70 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      Autonomous AI
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{item.slug}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.tagline}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
