import { Container } from "./primitives";

export function LegalShell({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="py-20">
      <Container className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Legal</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        {intro && <div className="mt-6 text-sm leading-relaxed text-muted">{intro}</div>}
        <div className="prose-vertofi mt-10 space-y-8 text-sm leading-relaxed text-muted">{children}</div>
      </Container>
    </section>
  );
}

/** A numbered/anchored legal section with a heading and rich body content. */
export function LegalSection({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-base font-semibold text-ink">{heading}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

/** A sub-heading within a section (e.g. "Banking information"). */
export function LegalSub({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{heading}</h3>
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}

/** Bulleted list for legal content. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-1 list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/** Backward-compatible simple block (single paragraph). */
export function LegalBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-ink">{heading}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
