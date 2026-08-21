/**
 * Guided invoice creation (docs/10, V4 T4): a one-question-at-a-time flow on
 * WhatsApp — customer → items (name/qty/rate, with smart single-line parsing)
 * → GST rate → review. The review hands off to the existing wa:draft YES/NO
 * confirmation machinery, so creation + approval stay on one audited path.
 * State lives in Redis (30-min TTL); "cancel" exits at any point.
 */
import { Redis } from "ioredis";
import { lookupProductFor, lookupGstinFor, detectHsnFor, looksLikeGstin, type WaUser } from "./actions.js";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { lazyConnect: true, maxRetriesPerRequest: 2 });

type Item = { name: string; qty: number; rate: number; taxRate: number; hsn?: string };
type Flow = {
  step: "pick-type" | "customer" | "item" | "qty" | "rate" | "tax" | "more";
  docType: string;
  label: string;
  customer?: string;
  customerGstin?: string;
  customerState?: string;
  items: Item[];
  pending?: { name?: string; qty?: number; rate?: number; taxRate?: number; hsn?: string };
  autoPriced?: boolean;
};

const KEY = (from: string) => `wa:flow:${from}`;
const TTL = 1800;
const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

/** The full ordered create menu — one entry per document the bot can create. */
const CREATE_MENU: { docType: string; label: string; re: RegExp }[] = [
  { docType: "TAX_INVOICE", label: "Tax Invoice", re: /^(tax invoice|invoice|bill)$/i },
  { docType: "B2C_INVOICE", label: "Retail Invoice", re: /^(retail invoice|b2c invoice|retail)$/i },
  { docType: "BILL_OF_SUPPLY", label: "Bill of Supply", re: /^bill of supply$/i },
  { docType: "EXPORT_INVOICE", label: "Export Invoice", re: /^export invoice$/i },
  { docType: "CREDIT_NOTE", label: "Credit Note", re: /^credit note$/i },
  { docType: "DEBIT_NOTE", label: "Debit Note", re: /^debit note$/i },
  { docType: "QUOTATION", label: "Quotation", re: /^(quotation|quote|estimate)$/i },
  { docType: "PROFORMA", label: "Proforma Invoice", re: /^proforma( invoice)?$/i },
  { docType: "PURCHASE_ORDER", label: "Purchase Order", re: /^purchase order$/i },
  { docType: "PURCHASE_INVOICE", label: "Purchase Invoice", re: /^purchase invoice$/i },
  { docType: "SELF_INVOICE", label: "Self Invoice (RCM)", re: /^self invoice$/i },
  { docType: "RECEIPT_VOUCHER", label: "Receipt Voucher", re: /^receipt voucher$/i },
  { docType: "PAYMENT_VOUCHER", label: "Payment Voucher", re: /^payment voucher$/i },
  { docType: "JOURNAL_VOUCHER", label: "Journal Voucher", re: /^journal voucher$/i },
  { docType: "CONTRA_VOUCHER", label: "Contra Voucher", re: /^contra voucher$/i },
  { docType: "EXPENSE_VOUCHER", label: "Expense Voucher", re: /^expense voucher$/i },
  { docType: "PETTY_CASH_VOUCHER", label: "Petty Cash Voucher", re: /^petty cash voucher$/i },
  { docType: "DELIVERY_CHALLAN", label: "Delivery Challan", re: /^(delivery )?challan$/i },
  { docType: "GOODS_TRANSFER_CHALLAN", label: "Goods Transfer Challan", re: /^goods transfer challan$/i },
  { docType: "RETURN_CHALLAN", label: "Return Challan", re: /^return challan$/i },
  { docType: "SHIPPING_LABEL", label: "Shipping Label", re: /^shipping label$/i },
];
const DOC_PHRASES: [RegExp, string, string][] = CREATE_MENU.map((m) => [m.re, m.docType, m.label.toLowerCase()]);
const START_RE = /^(?:new|create|make|guided)\s+(.+)$/i;
const MENU_TRIGGER_RE = /^(create|new|new document|create document|new doc|create doc|create a document)$/i;
const CANCEL_RE = /^(cancel|stop|exit|quit)$/i;
const GST_RATES = [0, 5, 12, 18, 28];

function matchDocType(rest: string): { docType: string; label: string } | null {
  const r = rest.trim();
  for (const m of CREATE_MENU) if (m.re.test(r)) return { docType: m.docType, label: m.label.toLowerCase() };
  return null;
}

/** The numbered "what would you like to create?" card. */
function createMenuText(): string {
  const lines = CREATE_MENU.map((m, i) => `${i + 1}. ${m.label}`);
  return ["📄 *What would you like to create?*", "", ...lines, "", "Reply with a *number*, or type the name (e.g. _tax invoice_). *cancel* to exit."].join("\n");
}

async function load(from: string): Promise<Flow | null> {
  const raw = await redis.get(KEY(from));
  return raw ? (JSON.parse(raw) as Flow) : null;
}
async function save(from: string, f: Flow): Promise<void> {
  await redis.set(KEY(from), JSON.stringify(f), "EX", TTL);
}

/** "name, qty, rate" or "qty name at/@ rate" → full item line in one message. */
function parseItemLine(t: string): { name: string; qty: number; rate: number } | null {
  let m = t.match(/^(.+?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)$/i);
  if (m) return { name: m[1]!.trim(), qty: Number(m[2]), rate: Number(m[3]) };
  m = t.match(/^(\d+(?:\.\d+)?)\s+(.+?)\s+(?:at|@)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)$/i);
  if (m) return { name: m[2]!.trim(), qty: Number(m[1]), rate: Number(m[3]) };
  return null;
}

function askItem(n: number): string {
  return [
    `*Item ${n}:* what are you selling?`,
    "Type the item name — or everything at once like:",
    "_Cement bags, 50, 420_  (name, qty, rate)",
  ].join("\n");
}

function summary(f: Flow): string {
  const taxable = f.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = f.items.reduce((s, i) => s + (i.qty * i.rate * i.taxRate) / 100, 0);
  const lines = f.items.map((i, n) => `${n + 1}. ${i.name} — ${i.qty} × ${inr(i.rate)} (${i.taxRate}% GST)`);
  return [
    `🧾 *Review your ${f.label}*`,
    `Customer: ${f.customer}`,
    ...lines,
    `Taxable: ${inr(taxable)}`,
    `*Total: ${inr(taxable + tax)}*`,
    "",
    `Reply *YES* to create the ${f.label} (PDF comes right here), or *NO* to cancel.`,
  ].join("\n");
}

/**
 * Returns a reply when the guided flow consumes the message, else null.
 * On review, writes the standard wa:draft so the existing YES/NO confirm
 * (and PDF delivery) takes over.
 */
export async function handleGuided(from: string, text: string, u: WaUser): Promise<string | null> {
  const t = text.trim();

  const flow = await load(from);
  if (!flow) {
    // "new invoice" / "create quotation" … OR a bare doc word ("invoice").
    const m = t.match(START_RE);
    const dt = m ? matchDocType(m[1]!) : matchDocType(t);
    if (!dt) {
      // A bare "create" / "new document" → show the numbered document menu.
      if (MENU_TRIGGER_RE.test(t)) {
        await save(from, { step: "pick-type", docType: "", label: "", items: [] });
        return createMenuText();
      }
      return null; // not a guided start → let other handlers take it
    }
    await save(from, { step: "customer", docType: dt.docType, label: dt.label, items: [] });
    return `🧾 Let's create a ${dt.label}, one step at a time. (Type *cancel* anytime.)\n\n*Who is the customer?*`;
  }

  if (CANCEL_RE.test(t)) {
    await redis.del(KEY(from));
    return "Cancelled — nothing was created. Type *new invoice* to start again.";
  }

  switch (flow.step) {
    case "pick-type": {
      let dt = matchDocType(t);
      if (!dt) {
        const n = Number(t.replace(/[^\d]/g, ""));
        if (n >= 1 && n <= CREATE_MENU.length) { const m = CREATE_MENU[n - 1]!; dt = { docType: m.docType, label: m.label.toLowerCase() }; }
      }
      if (!dt) return "Reply with a *number* from the list, or type the document name. *cancel* to exit.";
      flow.docType = dt.docType; flow.label = dt.label; flow.step = "customer";
      await save(from, flow);
      return `🧾 Let's create a ${dt.label}, one step at a time. (Type *cancel* anytime.)\n\n*Who is the customer / party?*`;
    }
    case "customer": {
      // If they sent a GSTIN, fetch the party straight from the GST network.
      if (looksLikeGstin(t)) {
        const p = await lookupGstinFor(u, t);
        if (p && p.structurallyValid) {
          flow.customer = p.tradeName || p.legalName || t.toUpperCase();
          flow.customerGstin = p.gstin;
          flow.customerState = p.state || undefined;
          flow.step = "item";
          await save(from, flow);
          const who = p.legalName || p.tradeName;
          return `${who ? `Customer: *${who}* ✓ (from GSTIN)` : `GSTIN *${p.gstin}* validated ✓`}${p.state ? `\nState: ${p.state}` : ""}\n\n${askItem(1)}`;
        }
      }
      flow.customer = t;
      flow.step = "item";
      await save(from, flow);
      return `Customer: *${t}* ✓\n\n${askItem(1)}`;
    }
    case "item": {
      const full = parseItemLine(t);
      if (full) {
        flow.pending = full;
        flow.step = "tax";
        await save(from, flow);
        return `*${full.name}* — ${full.qty} × ${inr(full.rate)} ✓\n\n*GST rate?* (0, 5, 12, 18 or 28 — or just say *ok* for 18%)`;
      }
      // Just an item name → auto-fill price + tax from the product master so the
      // user only has to give the quantity (zero typing of prices).
      const prod = await lookupProductFor(u, t);
      if (prod && prod.rate > 0) {
        flow.pending = { name: prod.name, rate: prod.rate, taxRate: prod.taxRate, hsn: prod.hsn };
        flow.autoPriced = true;
        flow.step = "qty";
        await save(from, flow);
        return `*${prod.name}* — ${inr(prod.rate)}/unit (${prod.taxRate}% GST) auto-filled from your products ✓\n\n*Quantity?*`;
      }
      flow.pending = { name: t };
      flow.autoPriced = false;
      flow.step = "qty";
      await save(from, flow);
      return `*${t}* ✓\n\n*Quantity?*`;
    }
    case "qty": {
      const qty = Number(t.replace(/[^\d.]/g, ""));
      if (!qty || qty <= 0) return "Please send a number — e.g. *50*.";
      flow.pending = { ...flow.pending, qty };
      // Auto-priced item → we already have rate + tax, just confirm and move on.
      if (flow.autoPriced && flow.pending.rate) {
        const hsn = flow.pending.hsn ?? (await detectHsnFor(u, flow.pending.name!))?.hsn;
        flow.items.push({ name: flow.pending.name!, qty, rate: flow.pending.rate, taxRate: flow.pending.taxRate ?? 18, hsn });
        flow.pending = undefined;
        flow.autoPriced = false;
        flow.step = "more";
        await save(from, flow);
        return `Item ${flow.items.length} added ✓\n\n*Add another item?* (yes/no)`;
      }
      flow.step = "rate";
      await save(from, flow);
      return `Qty: *${qty}* ✓\n\n*Rate per unit?* (₹)`;
    }
    case "rate": {
      const rate = Number(t.replace(/[^\d.]/g, ""));
      if (!rate || rate <= 0) return "Please send the price — e.g. *420*.";
      flow.pending = { ...flow.pending, rate };
      flow.step = "tax";
      await save(from, flow);
      return `Rate: ${inr(rate)} ✓\n\n*GST rate?* (0, 5, 12, 18 or 28 — or just say *ok* for 18%)`;
    }
    case "tax": {
      let taxRate = 18;
      if (!/^(ok|18%?|default)$/i.test(t)) {
        const n = Number(t.replace(/[^\d]/g, ""));
        if (!GST_RATES.includes(n)) return "GST rate must be 0, 5, 12, 18 or 28 — or say *ok* for 18%.";
        taxRate = n;
      }
      const p = flow.pending!;
      // Auto-detect HSN/SAC for the item (catalog → reference → AI) if not already set.
      const hsn = p.hsn ?? (await detectHsnFor(u, p.name!))?.hsn;
      flow.items.push({ name: p.name!, qty: p.qty!, rate: p.rate!, taxRate, hsn });
      flow.pending = undefined;
      flow.step = "more";
      await save(from, flow);
      return `Item ${flow.items.length} added ✓\n\n*Add another item?* (yes/no)`;
    }
    case "more": {
      if (/^(y|yes|add|more)$/i.test(t)) {
        flow.step = "item";
        await save(from, flow);
        return askItem(flow.items.length + 1);
      }
      if (!/^(n|no|done|finish)$/i.test(t)) return `Reply *yes* to add another item, or *no* to review the ${flow.label}.`;
      // Hand off to the standard confirm machinery (wa:draft + YES/NO). docType
      // routes invoice→ledger sales path, everything else→document engine.
      await redis.set(
        `wa:draft:${from}`,
        JSON.stringify({
          kind: "sales",
          docType: flow.docType,
          party: { name: flow.customer, gstin: flow.customerGstin, state: flow.customerState },
          items: flow.items,
        }),
        "EX", 600,
      );
      await redis.del(KEY(from));
      return summary(flow);
    }
  }
  return null;
}
