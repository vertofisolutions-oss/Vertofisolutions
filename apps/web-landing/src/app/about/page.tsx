import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Eye, Database, Cpu, Lock, GitBranch, Target, Compass, Sparkles } from "lucide-react";
import { Container, SectionHeading } from "../../components/primitives";
import { links } from "../../lib/site";

export const metadata: Metadata = {
  title: "About — Vertofi",
  description: "Vertofi is building a new category: Predictive Financial Intelligence for modern businesses.",
};

const PRINCIPLES = [
  { icon: Cpu, title: "Product quality", desc: "Every module solves a real, recurring finance problem — not a demo." },
  { icon: GitBranch, title: "Architecture", desc: "Event-driven, multi-tenant, built to scale without redesign." },
  { icon: Lock, title: "Security", desc: "Encryption in transit and at rest, least-privilege access, full auditability." },
  { icon: Eye, title: "Transparency", desc: "We never invent trust. No fabricated stats, logos, or outcomes." },
  { icon: Database, title: "Data residency", desc: "Financial data hosted in India, aligned with local regulation." },
  { icon: ShieldCheck, title: "Compliance-ready", desc: "Designed toward SOC 2 / ISO 27001 controls from day one." },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-bg2 py-20">
        <Container>
          <SectionHeading
            eyebrow="About Vertofi"
            title="A new category: Predictive Financial Intelligence."
            subtitle="Traditional software records what happened. Vertofi analyzes, predicts and protects — so businesses operate with clarity, automation and confidence."
          />
        </Container>
      </section>

      <section className="py-20">
        <Container className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Mission Card */}
          <div className="relative overflow-hidden rounded-2xl border border-borderCard bg-white p-8 sm:p-10 shadow-card transition-all duration-300 hover:shadow-cardHover group">
            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-50/60 rounded-bl-full -z-0 transition-transform duration-500 group-hover:scale-110" />
            <div className="relative z-10">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 mb-6 shadow-sm">
                <Target className="h-6 w-6" />
              </span>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Our Purpose</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">Our mission</h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                To eliminate manual accounting, prevent financial losses, remove compliance stress, and
                empower businesses with real-time financial insight and predictive warnings.
              </p>
            </div>
          </div>

          {/* Vision Card */}
          <div className="relative overflow-hidden rounded-2xl border border-borderCard bg-white p-8 sm:p-10 shadow-card transition-all duration-300 hover:shadow-cardHover group">
            <div className="absolute top-0 right-0 h-32 w-32 bg-amber-50/60 rounded-bl-full -z-0 transition-transform duration-500 group-hover:scale-110" />
            <div className="relative z-10">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50 mb-6 shadow-sm">
                <Compass className="h-6 w-6" />
              </span>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Our Horizon</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">Our vision</h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                To become the most trusted Financial Intelligence Platform — where every business operates
                with automation, accuracy, and absolute peace of mind.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-border bg-bg2 py-20">
        <Container>
          <SectionHeading
            eyebrow="How we build trust"
            title="Credibility comes from substance, not slogans."
            subtitle="We build trust the way the best financial tools do — by showing the product, explaining what it does, and being transparent about what it doesn't."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-2xl border border-borderCard bg-white p-6 shadow-card">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section id="careers" className="scroll-mt-24 py-20">
        <Container>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-10 text-center shadow-card">
            <h3 className="text-2xl font-bold tracking-tight text-ink">Careers</h3>
            <p className="max-w-xl text-sm text-muted">
              We're building financial intelligence that businesses can rely on. If that excites you, we'd
              love to hear from you.
            </p>
            <Link
              href="/contact"
              className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Get in touch
            </Link>
            <a href={links.getStarted} className="text-xs font-medium text-muted transition hover:text-ink">
              Or try the product →
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
