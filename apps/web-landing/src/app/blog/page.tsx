import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Container, SectionHeading } from "../../components/primitives";

export const metadata: Metadata = {
  title: "Blog — Vertofi",
  description: "Insights on predictive accounting, compliance, cashflow and financial intelligence.",
};

const TOPICS = [
  "Predictive accounting",
  "GST & compliance",
  "Cashflow & runway",
  "Profit leakage",
  "Vendor risk",
  "Financial automation",
];

export default function BlogPage() {
  return (
    <>
      <section className="border-b border-border bg-bg2 py-20">
        <Container>
          <SectionHeading
            eyebrow="Insights"
            title="The Vertofi blog."
            subtitle="Practical writing on predictive accounting, compliance, cashflow and financial intelligence for modern businesses."
          />
        </Container>
      </section>

      <section className="py-20">
        <Container>
          {/* Honest empty state — no fabricated articles. */}
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-borderCard bg-white p-12 text-center shadow-card">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand">
              <BookOpen className="h-6 w-6" />
            </span>
            <h3 className="text-xl font-semibold text-ink">Articles are on the way.</h3>
            <p className="max-w-md text-sm text-muted">
              We're preparing in-depth pieces on the topics below. No filler — we publish when we have
              something genuinely useful to say.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {TOPICS.map((t) => (
                <span key={t} className="rounded-full border border-border bg-bg2 px-3 py-1 text-xs font-medium text-muted">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
