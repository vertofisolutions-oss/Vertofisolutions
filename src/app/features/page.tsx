import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Container, SectionHeading } from "../../components/primitives";
import { INNOVATIONS } from "../../lib/innovations";
import { links } from "../../lib/site";

export const metadata: Metadata = {
  title: "15 Innovations — Vertofi Intelligence Suite",
  description:
    "Fifteen proprietary innovations that automate accounting, detect financial leakage, forecast tax exposure, and protect your business.",
};

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b border-border bg-bg2 py-20">
        <Container>
          <SectionHeading
            eyebrow="Vertofi Intelligence Suite"
            title="One platform. Fifteen innovations. Zero noise."
            subtitle="Every module is built to eliminate an entire class of finance problem — from manual entry to silent leakage to compliance penalties."
          />
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {INNOVATIONS.map((it) => {
              const Icon = it.icon;
              return (
                <article
                  key={it.slug}
                  id={it.slug}
                  className="flex scroll-mt-24 flex-col rounded-2xl border border-borderCard bg-white p-7 shadow-card"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold text-ink">{it.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{it.tagline}</p>
                  <ul className="mt-5 space-y-2 border-t border-borderCard pt-5">
                    {it.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-ink">
                        <Check className="h-4 w-4 shrink-0 text-brand" /> {f}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-border bg-bg2 p-10 text-center">
            <h3 className="text-2xl font-bold tracking-tight text-ink">Ready to see it on your numbers?</h3>
            <p className="max-w-xl text-sm text-muted">
              Connect your business and Vertofi starts working in the background — no manual entry, no
              fabricated dashboards, just real financial intelligence.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={links.getStarted}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
