import type { Metadata } from "next";
import { Mail, Phone, Headset } from "lucide-react";
import { Container, SectionHeading } from "../../components/primitives";
import { ContactForm } from "../../components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — Vertofi",
  description: "Talk to a finance specialist. Book a demo, get a custom plan, or ask anything about Vertofi.",
};

const CHANNELS = [
  { icon: Mail, label: "Email us", value: "info@vertofi.com", href: "mailto:info@vertofi.com" },
  { icon: Phone, label: "Call sales", value: "+91 87123 57876", href: "tel:+918712357876" },
  { icon: Headset, label: "Support", value: "24×7 in-app", href: null },
];

export default function ContactPage() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Contact"
          title="Talk to a finance specialist."
          subtitle="Book a demo, get a custom plan, or ask anything about Vertofi."
        />

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <ContactForm />

          <aside className="space-y-4">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              const inner = (
                <div className="flex items-center gap-4 rounded-2xl border border-borderCard bg-white p-5 shadow-card transition hover:border-brand/30">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
                    <p className="text-sm font-semibold text-ink">{c.value}</p>
                  </div>
                </div>
              );
              return c.href ? (
                <a key={c.label} href={c.href} className="block">
                  {inner}
                </a>
              ) : (
                <div key={c.label}>{inner}</div>
              );
            })}
            <div className="rounded-2xl border border-border bg-bg2 p-5 text-sm leading-relaxed text-muted">
              Prefer to explore first? Vertofi shows real product states with no fabricated data — connect
              your systems whenever you're ready.
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
