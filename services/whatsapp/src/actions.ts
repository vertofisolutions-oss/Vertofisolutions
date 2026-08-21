/**
 * WhatsApp action layer (docs/10). Resolves the sender's phone → their Vertofi
 * account (via the registered mobile), mints a short-lived token to act AS that
 * user (so RLS + grant checks apply), drafts accounting actions with AI, and
 * requires an explicit YES confirmation before anything is created. Sensitive
 * financial actions stay approval-gated.
 */
import { randomInt } from "node:crypto";
import { Pool } from "pg";
import { Redis } from "ioredis";
import { JwtService } from "@vertofi/auth-guards";
import type { Plan, Role } from "@vertofi/tenancy";
import { approvalCard, createdCard } from "./cards.js";

const ACCOUNTING_URL = process.env.ACCOUNTING_URL ?? "http://localhost:4031";
const GST_URL = process.env.GST_CONNECTOR_URL ?? "http://localhost:4016";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", { lazyConnect: true, maxRetriesPerRequest: 2 });
const jwt = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

export interface WaUser {
  userId: string;
  orgId: string;
  role: Role;
  plan: Plan;
}

/** Meta sends E.164 without '+', e.g. 919812345678. We store 10-digit mobiles. */
function normalizeMobile(waUser: string): string {
  const digits = waUser.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Resolve the WhatsApp number to a Vertofi business user — DYNAMICALLY:
 *  1. the user's registered login mobile,
 *  2. an explicit link created via the in-chat code flow (auth.whatsapp_links),
 *  3. the WhatsApp number entered in the Enterprise-setup wizard
 *     (onboarding sections → whatsapp → number) → that org's owner.
 */
export async function resolveUser(waUser: string): Promise<WaUser | null> {
  const mobile = normalizeMobile(waUser);
  // Match on the LAST 10 DIGITS of the stored number so "+917386775532",
  // "917386775532" and "7386775532" all resolve, and require the account to
  // actually own an org (skips org-less admin/test rows with the same number).
  const r = await pool.query<{ id: string; org_id: string | null; role: Role; plan: Plan }>(
    `SELECT u.id, u.org_id, u.role, u.plan FROM auth.users u
      WHERE right(regexp_replace(u.mobile, '[^0-9]', '', 'g'), 10) = $1
        AND u.status = 'ACTIVE' AND u.org_id IS NOT NULL
     UNION ALL
     SELECT u.id, u.org_id, u.role, u.plan FROM auth.whatsapp_links l
       JOIN auth.users u ON u.id = l.user_id AND u.status = 'ACTIVE' AND u.org_id IS NOT NULL
      WHERE l.wa_number = $1
     UNION ALL
     SELECT u.id, u.org_id, u.role, u.plan FROM onboarding.onboarding_profiles p
       JOIN auth.users u ON u.org_id = p.org_id AND u.role = 'BUSINESS_OWNER' AND u.status = 'ACTIVE'
      WHERE p.sections->'whatsapp'->>'number' = $1
        AND p.sections->'whatsapp'->>'optIn' = 'yes'
     LIMIT 1`,
    [mobile],
  );
  const u = r.rows[0];
  if (!u || !u.org_id) return null;
  return { userId: u.id, orgId: u.org_id, role: u.role, plan: u.plan };
}

/**
 * In-chat linking for any OTHER number: "link <registered mobile>" → 6-digit
 * code lands in the account's dashboard notifications → reply the code here →
 * permanent auth.whatsapp_links row. Returns a reply, or null to fall through.
 */
export async function handleLink(waUser: string, text: string): Promise<string | null> {
  const t = text.trim();
  const key = `wa:link:${waUser}`;

  const m = t.match(/^link\s+(?:\+?91)?(\d{10})$/i);
  if (m) {
    const r = await pool.query<{ id: string; org_id: string | null }>(
      `SELECT id, org_id FROM auth.users
        WHERE right(regexp_replace(mobile, '[^0-9]', '', 'g'), 10) = $1
          AND status='ACTIVE' AND org_id IS NOT NULL
        LIMIT 1`, [m[1]!]);
    const u = r.rows[0];
    if (!u || !u.org_id) {
      return "No active Vertofi account uses that mobile number. Check the number, or sign up first at vertofi.com.";
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await redis.set(key, JSON.stringify({ userId: u.id, code, attempts: 0 }), "EX", 600);
    await pool.query(
      `INSERT INTO notification.notifications
         (org_id, user_id, channel, template, title, body, severity, payload, status, sent_at)
       VALUES ($1,$2,'IN_APP','whatsapp.link.code','WhatsApp link code',$3,'WARNING','{}','SENT',now())`,
      [u.org_id, u.id, `Someone asked to link WhatsApp number +${waUser} to your account. Code: ${code}. If this wasn't you, ignore this message.`],
    );
    return "🔐 A 6-digit code was just sent to that account's *dashboard notifications* (the bell icon). Reply with the code here to link this WhatsApp number.";
  }

  const pending = await redis.get(key);
  if (pending && /^\d{6}$/.test(t)) {
    const p = JSON.parse(pending) as { userId: string; code: string; attempts: number };
    if (p.attempts >= 5) { await redis.del(key); return "Too many attempts — start again with *link <your registered mobile>*."; }
    if (t !== p.code) {
      p.attempts++;
      await redis.set(key, JSON.stringify(p), "EX", 600);
      return "That code doesn't match — check your dashboard notifications and try again.";
    }
    await redis.del(key);
    const mobile = normalizeMobile(waUser);
    await pool.query(
      `INSERT INTO auth.whatsapp_links (wa_number, user_id) VALUES ($1,$2)
       ON CONFLICT (wa_number) DO UPDATE SET user_id = EXCLUDED.user_id, linked_at = now()`,
      [mobile, p.userId],
    );
    return "✅ Linked! This WhatsApp number is now connected to your Vertofi account. Send *menu* to get started. 🚀";
  }
  return null;
}

function tokenFor(u: WaUser): string {
  return jwt.signAccess({ sub: u.userId, role: u.role, orgId: u.orgId, plan: u.plan, sid: "whatsapp" });
}

async function callAccounting<T>(u: WaUser, path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${ACCOUNTING_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenFor(u)}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Does this message look like an accounting action (vs a question)? */
const ACTION_RE = /\b(invoice|bill|sold|sell|sale|purchase|bought|received|expense|paid)\b/i;
export function isActionCommand(text: string): boolean {
  return ACTION_RE.test(text);
}

type Draft = {
  kind: string;
  party: Record<string, unknown> | null;
  items: { name: string; qty: number; rate: number; taxRate: number }[];
  totals: { taxable: number; total: number };
};

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

/** Draft an accounting action and ask for confirmation. */
export async function handleAction(waUser: string, text: string, known?: WaUser): Promise<string> {
  const u = known ?? (await resolveUser(waUser));
  if (!u) {
    return "🔗 This number isn't linked to a Vertofi account. Register at app.vertofi.com using this mobile number, then come back and try again.";
  }
  const kind = /\b(purchase|bought|bill)\b/i.test(text) ? "purchase" : "sales";
  const r = await callAccounting<{ degraded: boolean; draft: Draft | null; reason?: string }>(u, `/accounting/${u.orgId}/ai/draft`, { command: text, kind });
  if (!r || r.degraded || !r.draft) {
    return "I couldn't draft that automatically right now. You can create it in the app, or rephrase — e.g. _\"Invoice ABC Traders 50 bags at ₹420\"_.";
  }
  const d = r.draft;
  await redis.set(`wa:draft:${waUser}`, JSON.stringify({ kind: d.kind, party: d.party, items: d.items }), "EX", 600);
  return approvalCard({
    title: `Draft ${d.kind === "sales" ? "Invoice" : "Purchase"}`,
    party: (d.party?.name as string) ?? "—",
    items: d.items,
    taxable: d.totals.taxable,
    total: d.totals.total,
  });
}

export interface ConfirmResult {
  text: string;
  /** Set when a sales invoice was created — the caller sends its PDF in chat. */
  pdf?: { u: WaUser; saleId: string; number: string };
  /** Set when a generated document (quotation, etc.) was created. */
  docPdf?: { u: WaUser; docId: string; number: string };
}

/** The user typed "add products" → expect a product-list photo next. */
export async function expectProducts(waUser: string): Promise<string> {
  await redis.set(`wa:expect:products:${waUser}`, "1", "EX", 300);
  return "📷 Send a photo of your product / price list now and I'll read the items and prices for you.";
}
export async function isExpectingProducts(waUser: string): Promise<boolean> {
  return (await redis.get(`wa:expect:products:${waUser}`)) === "1";
}
/** Stash scanned products awaiting a YES confirmation. */
export async function stashScannedProducts(waUser: string, rows: unknown[]): Promise<void> {
  await redis.del(`wa:expect:products:${waUser}`);
  await redis.set(`wa:products:${waUser}`, JSON.stringify(rows), "EX", 600);
}

/** Handle a YES/NO confirmation against a pending draft. */
export async function handleConfirm(waUser: string, text: string, known?: WaUser): Promise<ConfirmResult | null> {
  const t = text.trim().toLowerCase();

  // Pending product-scan confirmation takes priority.
  const prodKey = `wa:products:${waUser}`;
  const prodRaw = await redis.get(prodKey);
  if (prodRaw) {
    if (t === "no" || t === "cancel") { await redis.del(prodKey); return { text: "Okay, didn't add those products." }; }
    if (t === "yes" || t === "y" || t === "confirm") {
      await redis.del(prodKey);
      const u = known ?? (await resolveUser(waUser));
      if (!u) return { text: "Your account could not be verified." };
      const rows = JSON.parse(prodRaw) as unknown[];
      const res = await bulkProductsFor(u, rows);
      return { text: res ? `✅ Added ${res.added} products to your list${res.skipped ? ` (${res.skipped} already existed)` : ""}. Now you can invoice them without typing prices.` : "Couldn't save those — please try in the app." };
    }
    // any other text → fall through (don't block the user)
  }

  const key = `wa:draft:${waUser}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  if (t === "no" || t === "cancel") {
    await redis.del(key);
    return { text: "Cancelled. Nothing was created." };
  }
  if (t !== "yes" && t !== "y" && t !== "confirm") return null;

  const u = known ?? (await resolveUser(waUser));
  if (!u) return { text: "Your account could not be verified." };
  const draft = JSON.parse(raw) as { kind: string; party: Record<string, unknown> | null; items: Draft["items"]; docType?: string };
  await redis.del(key);

  if (draft.kind === "purchase") {
    const res = await callAccounting<{ total: number }>(u, `/accounting/${u.orgId}/purchases`, {
      vendorName: (draft.party?.name as string) ?? "Vendor",
      vendorGstin: draft.party?.gstin ?? null,
      items: draft.items,
      source: "WHATSAPP",
    });
    return { text: res ? `✅ Purchase recorded. Total ${inr(res.total)}.` : "Couldn't record that — please try in the app." };
  }

  // Non-invoice document types (quotation, proforma, credit note, …) go through
  // the document engine; tax invoices keep the ledger-posting sales path.
  const docType = draft.docType;
  if (docType && docType !== "TAX_INVOICE" && docType !== "B2C_INVOICE") {
    const res = await callAccounting<{ id: string; number: string }>(u, `/accounting/${u.orgId}/documents`, {
      type: docType,
      party: draft.party ?? { name: "Customer" },
      items: draft.items,
      source: "WHATSAPP",
    });
    if (!res) return { text: "Couldn't create that — please try in the app." };
    const label = docType.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    return {
      text: createdCard({ docLabel: label, number: res.number }),
      docPdf: { u, docId: res.id, number: res.number },
    };
  }

  const res = await callAccounting<{ id: string; invoiceNo: string; total: number }>(u, `/accounting/${u.orgId}/sales`, {
    customerName: (draft.party?.name as string) ?? "Customer",
    items: draft.items,
    source: "WHATSAPP",
  });
  if (!res) return { text: "Couldn't create that — please try in the app." };
  return {
    text: createdCard({ docLabel: "Tax Invoice", number: res.invoiceNo, total: res.total }),
    pdf: { u, saleId: res.id, number: res.invoiceNo },
  };
}

/** Fetch the rendered invoice PDF from the accounting service (as the user). */
export async function fetchSalesPdf(u: WaUser, saleId: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`${ACCOUNTING_URL}/accounting/${u.orgId}/sales/${saleId}/pdf?type=TAX_INVOICE`, {
      headers: { Authorization: `Bearer ${tokenFor(u)}` },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Looks like a GSTIN (15-char structure)? Used to autofill the party from chat. */
export function looksLikeGstin(text: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(text.trim().toUpperCase());
}

export interface WaGstinProfile {
  gstin: string;
  structurallyValid: boolean;
  state: string | null;
  pan: string | null;
  legalName?: string;
  tradeName?: string;
  status?: string;
  source: string;
}

/** Resolve a GSTIN → taxpayer profile (as the user) for chat invoice autofill. */
export async function lookupGstinFor(u: WaUser, gstin: string): Promise<WaGstinProfile | null> {
  try {
    const res = await fetch(`${GST_URL}/gst/lookup/${encodeURIComponent(gstin.trim().toUpperCase())}`, {
      headers: { Authorization: `Bearer ${tokenFor(u)}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as WaGstinProfile;
  } catch {
    return null;
  }
}

/** Auto-detect HSN/SAC + GST rate for an item name (catalog → reference → AI). */
export async function detectHsnFor(u: WaUser, name: string): Promise<{ hsn: string; gstRate: number } | null> {
  const r = await callAccounting<{ hsn: string; gstRate: number } | null>(
    u, `/accounting/${u.orgId}/products/hsn?name=${encodeURIComponent(name)}`,
  );
  return r && r.hsn ? { hsn: r.hsn, gstRate: Number(r.gstRate) || 18 } : null;
}

/** Product master lookup → rate/hsn/tax so chat users never type prices. */
export async function lookupProductFor(u: WaUser, name: string): Promise<{ name: string; rate: number; hsn?: string; unit?: string; taxRate: number } | null> {
  const r = await callAccounting<{ name: string; rate: string; hsn: string | null; unit: string | null; tax_rate: string } | null>(
    u, `/accounting/${u.orgId}/products/lookup?name=${encodeURIComponent(name)}`,
  );
  if (!r) return null;
  return { name: r.name, rate: Number(r.rate) || 0, hsn: r.hsn ?? undefined, unit: r.unit ?? undefined, taxRate: Number(r.tax_rate) || 18 };
}

/** Scan a product-list photo → reviewable product rows (one vision call). */
export async function scanProductsFor(u: WaUser, imageB64: string, mime: string): Promise<{ name: string; rate: number; hsn?: string; unit?: string; taxRate?: number }[]> {
  const r = await callAccounting<{ degraded: boolean; products: { name: string; rate: number; hsn?: string; unit?: string; taxRate?: number }[] }>(
    u, `/accounting/${u.orgId}/products/scan`, { imageB64, mime },
  );
  return r && !r.degraded ? r.products : [];
}

/** Bulk-add reviewed products from a chat scan. */
export async function bulkProductsFor(u: WaUser, products: unknown[]): Promise<{ added: number; skipped: number } | null> {
  return callAccounting<{ added: number; skipped: number }>(u, `/accounting/${u.orgId}/products/bulk`, { products });
}

/** Fetch a generated document's PDF (quotation, credit note, voucher, …). */
export async function fetchDocPdf(u: WaUser, docId: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`${ACCOUNTING_URL}/accounting/${u.orgId}/documents/${docId}/pdf`, {
      headers: { Authorization: `Bearer ${tokenFor(u)}` },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Resolve plan for plan-aware menus (defaults STARTER if unlinked). */
export async function planFor(waUser: string): Promise<Plan> {
  const u = await resolveUser(waUser);
  return u?.plan ?? "STARTER";
}
