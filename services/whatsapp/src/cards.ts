/**
 * Structured WhatsApp "cards" — consistent, scannable message blocks instead of
 * free-form AI paragraphs. WhatsApp text supports *bold* and emoji; these helpers
 * give every transaction / approval / invoice / voucher / report / error a fixed,
 * business-like shape. Financial values passed in are ALWAYS engine-computed.
 */
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export interface CardItem { name: string; qty: number; rate: number; taxRate: number }

/** Draft / approval card: what will be created + the YES/NO ask. */
export function approvalCard(o: { title: string; party?: string; items?: CardItem[]; taxable?: number; total?: number; extra?: [string, string][]; confirm?: string }): string {
  const lines: string[] = [`🧾 *${o.title}*`];
  if (o.party) lines.push(`Party: ${o.party}`);
  if (o.items?.length) { lines.push("─────────────"); for (const it of o.items) lines.push(`• ${it.name} — ${it.qty} × ${inr(it.rate)} (${it.taxRate}% GST)`); }
  if (o.extra) for (const [k, v] of o.extra) lines.push(`${k}: ${v}`);
  if (o.taxable != null) lines.push(`Taxable: ${inr(o.taxable)}`);
  if (o.total != null) { lines.push("─────────────"); lines.push(`*Total: ${inr(o.total)}*`); }
  lines.push("");
  lines.push(o.confirm ?? "Reply *YES* to create, or *NO* to cancel.");
  return lines.join("\n");
}

/** Created-document confirmation card (invoice / voucher / any doc). */
export function createdCard(o: { docLabel: string; number: string; total?: number; extra?: [string, string][] }): string {
  const lines = [`✅ *${o.docLabel} created*`, `No: ${o.number}`];
  if (o.extra) for (const [k, v] of o.extra) lines.push(`${k}: ${v}`);
  if (o.total != null) lines.push(`Total: ${inr(o.total)}`);
  lines.push("📎 Sending the PDF…");
  return lines.join("\n");
}

/** Report card: a titled list of figure rows (already-computed values). */
export function reportCard(title: string, rows: [string, string][], footer?: string): string {
  const lines = [`📊 *${title}*`, "─────────────", ...rows.map(([k, v]) => `${k}: *${v}*`)];
  if (footer) { lines.push(""); lines.push(footer); }
  return lines.join("\n");
}

/** Error card — short, structured, never a wall of text. */
export function errorCard(msg: string): string {
  return `⚠️ *Couldn't do that*\n${msg}`;
}
