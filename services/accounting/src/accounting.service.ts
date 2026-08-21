import { Injectable, NotFoundException } from "@nestjs/common";
import type { PoolClient } from "pg";
import { PgService, PgOutboxStore, assertGrantedScope } from "@vertofi/nest-common";
import { toOutboxEnvelope } from "@vertofi/events";
import { setRlsContext, type Principal } from "@vertofi/tenancy";
import { computeTotals, type InvoiceItem } from "./tax.js";
import { renderDocument, type DocBank, type DocOrg, type DocParty } from "./docgen/render.js";
import { templateFor, type DocType } from "./docgen/templates.js";
import { renderReport, reportTitle, type ReportSection } from "./docgen/report.js";
import { resolveHsnFromReference, suggestHsnWithAi, type HsnSuggestion } from "./hsn.js";

const AI_URL = process.env.AI_GATEWAY_URL ?? "http://localhost:4010";

@Injectable()
export class AccountingService {
  private readonly outbox: PgOutboxStore;
  constructor(private readonly pg: PgService) {
    this.outbox = new PgOutboxStore(pg, "accounting");
  }

  /** Run inside an RLS-scoped, grant-checked transaction. */
  private run<T>(p: Principal, orgId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    return this.pg.transaction(async (c) => {
      await setRlsContext(c, p, await assertGrantedScope(c, p, orgId, "VIEW"));
      return fn(c);
    });
  }

  // ── Customers ───────────────────────────────────────────────────────
  listCustomers(p: Principal, orgId: string, q?: string) {
    return this.run(p, orgId, async (c) => {
      const params: unknown[] = [orgId];
      let where = "org_id=$1";
      if (q) {
        params.push(`%${q}%`);
        where += ` AND name ILIKE $${params.length}`;
      }
      return (await c.query(`SELECT * FROM accounting.customers WHERE ${where} ORDER BY name LIMIT 100`, params)).rows;
    });
  }

  createCustomer(p: Principal, orgId: string, d: Record<string, unknown>) {
    return this.run(p, orgId, async (c) => {
      const r = await c.query<{ id: string }>(
        `INSERT INTO accounting.customers (org_id, name, gstin, state, address, phone, email)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [orgId, d.name, d.gstin ?? null, d.state ?? null, d.address ?? null, d.phone ?? null, d.email ?? null],
      );
      return { id: r.rows[0]!.id };
    });
  }

  /** Smart-Form autofill: best matching customer by name. */
  lookupCustomer(p: Principal, orgId: string, name: string) {
    return this.run(p, orgId, async (c) => {
      const r = await c.query(
        "SELECT * FROM accounting.customers WHERE org_id=$1 AND name ILIKE $2 ORDER BY name LIMIT 1",
        [orgId, `%${name}%`],
      );
      return r.rows[0] ?? null;
    });
  }

  // ── Products ────────────────────────────────────────────────────────
  listProducts(p: Principal, orgId: string, q?: string) {
    return this.run(p, orgId, async (c) => {
      const params: unknown[] = [orgId];
      let where = "org_id=$1";
      if (q) {
        params.push(`%${q}%`);
        where += ` AND name ILIKE $${params.length}`;
      }
      return (await c.query(`SELECT * FROM accounting.products WHERE ${where} ORDER BY name LIMIT 200`, params)).rows;
    });
  }

  createProduct(p: Principal, orgId: string, d: Record<string, unknown>) {
    return this.run(p, orgId, async (c) => {
      const r = await c.query<{ id: string }>(
        `INSERT INTO accounting.products (org_id, name, hsn, unit, rate, tax_rate, stock)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [orgId, d.name, d.hsn ?? null, d.unit ?? "NOS", d.rate ?? 0, d.taxRate ?? 18, d.stock ?? 0],
      );
      return { id: r.rows[0]!.id };
    });
  }

  /**
   * Auto-detect the HSN/SAC code + GST rate for an item name. Deterministic-first:
   * (1) an existing product in this org with the same name (the org's own truth),
   * (2) the curated public HSN reference, (3) an AI suggestion the user reviews.
   * Returns null only when nothing — including AI — can classify it.
   */
  async detectHsn(p: Principal, orgId: string, name: string): Promise<HsnSuggestion | null> {
    const clean = name.trim();
    if (!clean) return null;
    // (1) Org catalog — reuse a code the business already assigned.
    const fromCatalog = await this.run(p, orgId, async (c) => {
      const r = await c.query<{ hsn: string | null; tax_rate: string | null }>(
        "SELECT hsn, tax_rate FROM accounting.products WHERE org_id=$1 AND name ILIKE $2 AND hsn IS NOT NULL AND hsn <> '' ORDER BY name LIMIT 1",
        [orgId, `%${clean}%`],
      );
      const row = r.rows[0];
      return row?.hsn ? { hsn: row.hsn, gstRate: Number(row.tax_rate) || 18, description: clean, source: "CATALOG" as const, confidence: "high" as const } : null;
    });
    if (fromCatalog) return fromCatalog;
    // (2) Curated public reference.
    const fromRef = resolveHsnFromReference(clean);
    if (fromRef) return fromRef;
    // (3) AI suggestion (honest null when unavailable).
    return suggestHsnWithAi(AI_URL, clean, orgId, p.plan);
  }

  /** Best product match by name → rate/HSN/unit/tax so the user never re-types prices. */
  lookupProduct(p: Principal, orgId: string, name: string) {
    return this.run(p, orgId, async (c) => {
      if (!name.trim()) return null;
      // Prefer an exact (case-insensitive) match, then a prefix, then contains.
      const r = await c.query(
        `SELECT id, name, hsn, unit, rate, tax_rate, mrp FROM accounting.products
          WHERE org_id=$1 AND name ILIKE $2
          ORDER BY (lower(name)=lower($3)) DESC, (name ILIKE $4) DESC, name LIMIT 1`,
        [orgId, `%${name}%`, name, `${name}%`],
      );
      return r.rows[0] ?? null;
    });
  }

  /** Bulk-add products (from the photo-scan review), skipping names that exist. */
  bulkCreateProducts(p: Principal, orgId: string, rows: { name: string; rate?: number; hsn?: string; unit?: string; taxRate?: number }[]) {
    return this.run(p, orgId, async (c) => {
      let added = 0, skipped = 0;
      for (const d of rows) {
        const name = String(d.name ?? "").trim();
        if (!name) { skipped++; continue; }
        const exists = (await c.query("SELECT 1 FROM accounting.products WHERE org_id=$1 AND lower(name)=lower($2) LIMIT 1", [orgId, name])).rows[0];
        if (exists) { skipped++; continue; }
        await c.query(
          `INSERT INTO accounting.products (org_id, name, hsn, unit, rate, tax_rate, stock)
           VALUES ($1,$2,$3,$4,$5,$6,0)`,
          [orgId, name, d.hsn ?? null, d.unit ?? "NOS", Number(d.rate) || 0, Number(d.taxRate) || 18],
        );
        added++;
      }
      return { added, skipped };
    });
  }

  /**
   * Scan a photo of a product/price list → structured product rows for review.
   * ONE vision call per image (token-light; the client downscales first). Never
   * fabricates: returns [] when AI is unavailable so the user types manually.
   */
  async scanProductsImage(p: Principal, orgId: string, imageB64: string, mime: string): Promise<{ degraded: boolean; products: { name: string; rate: number; hsn?: string; unit?: string; taxRate?: number }[]; reason?: string }> {
    const instruction =
      "This is a product or price list. Extract every product row. Return ONLY JSON " +
      '{"products":[{"name":"","rate":0,"unit":"NOS","hsn":"","taxRate":18}]}. ' +
      "rate = selling price per unit as a number (no currency symbol). Omit a field if unknown. No commentary.";
    try {
      const res = await fetch(`${AI_URL}/ai/vision-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: imageB64, mime, instruction, org_id: orgId }),
      });
      const body = (await res.json()) as { degraded?: boolean; content?: { products?: { name: string; rate?: number; hsn?: string; unit?: string; taxRate?: number }[] } };
      if (body.degraded || !body.content?.products?.length) {
        return { degraded: true, products: [], reason: "could_not_read" };
      }
      const products = body.content.products
        .filter((x) => x && String(x.name ?? "").trim())
        .slice(0, 100)
        .map((x) => ({ name: String(x.name).trim().slice(0, 200), rate: Number(x.rate) || 0, hsn: x.hsn ? String(x.hsn) : undefined, unit: x.unit ? String(x.unit) : "NOS", taxRate: Number(x.taxRate) || 18 }));
      return { degraded: false, products };
    } catch {
      return { degraded: true, products: [], reason: "ai_unavailable" };
    }
  }

  // ── Sales invoices ──────────────────────────────────────────────────
  createSalesInvoice(p: Principal, orgId: string, d: { customerId?: string; customerName?: string; items: InvoiceItem[]; interState?: boolean; source?: string }) {
    return this.run(p, orgId, async (c) => {
      const t = computeTotals(d.items, d.interState);
      const seq = Number((await c.query<{ n: string }>("SELECT count(*) n FROM accounting.sales_invoices WHERE org_id=$1", [orgId])).rows[0]!.n) + 1;
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
      const r = await c.query<{ id: string }>(
        `INSERT INTO accounting.sales_invoices
           (org_id, invoice_no, customer_id, customer_name, items, taxable, cgst, sgst, igst, total, status, source, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ISSUED',$11,$12) RETURNING id`,
        [orgId, invoiceNo, d.customerId ?? null, d.customerName ?? null, JSON.stringify(t.items), t.taxable, t.cgst, t.sgst, t.igst, t.total, d.source ?? "FORM", p.userId],
      );
      await this.outbox.enqueue(
        c,
        // Full tax breakdown so the ledger consumer can post the journal entry
        // without a cross-service read. Consumers tolerate unknown fields.
        toOutboxEnvelope({
          event: "accounting.sales.created", org_id: orgId, actor_id: p.userId,
          data: {
            invoice_no: invoiceNo, total: t.total, sale_id: r.rows[0]!.id,
            taxable: t.taxable, cgst: t.cgst, sgst: t.sgst, igst: t.igst,
            customer_id: d.customerId ?? null, customer_name: d.customerName ?? null,
            date: new Date().toISOString().slice(0, 10),
          },
        }),
      );
      // Auto stock-out for any catalog items on the invoice (zero manual entry).
      await this.applyInvoiceStock(c, orgId, t.items, "OUT", "SALE_INVOICE", r.rows[0]!.id, p.userId);
      return { id: r.rows[0]!.id, invoiceNo, ...t };
    });
  }

  listSalesInvoices(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query("SELECT id, invoice_no, customer_name, date, total, status, source, created_by, created_at FROM accounting.sales_invoices WHERE org_id=$1 ORDER BY date DESC, created_at DESC LIMIT 100", [orgId])).rows,
    );
  }

  // ── Vendor master (ERP field model; extra jsonb holds the long tail) ─
  listVendors(p: Principal, orgId: string, q?: string) {
    return this.run(p, orgId, async (c) => {
      const params: unknown[] = [orgId];
      let where = "org_id=$1";
      if (q) { params.push(`%${q}%`); where += " AND name ILIKE $2"; }
      return (await c.query(`SELECT * FROM accounting.vendors WHERE ${where} ORDER BY name LIMIT 100`, params)).rows;
    });
  }

  addVendor(p: Principal, orgId: string, d: Record<string, unknown>) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `INSERT INTO accounting.vendors
           (org_id, name, contact_person, gstin, pan, msme_number, phone, email, address,
            bank_account, ifsc, payment_terms, credit_days, opening_balance, vendor_rating,
            preferred_payment_method, tax_category, extra)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id, name`,
        [orgId, d.name, d.contactPerson ?? null, d.gstin ?? null, d.pan ?? null, d.msmeNumber ?? null,
         d.phone ?? null, d.email ?? null, d.address ?? null, d.bankAccount ?? null, d.ifsc ?? null,
         d.paymentTerms ?? null, d.creditDays ?? null, d.openingBalance ?? 0, d.vendorRating ?? null,
         d.preferredPaymentMethod ?? null, d.taxCategory ?? null, JSON.stringify(d.extra ?? {})],
      )).rows[0],
    );
  }

  // ── Expense management ───────────────────────────────────────────────
  listExpenses(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query("SELECT * FROM accounting.expenses WHERE org_id=$1 ORDER BY expense_date DESC, created_at DESC LIMIT 200", [orgId])).rows,
    );
  }

  addExpense(p: Principal, orgId: string, d: Record<string, unknown>) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `INSERT INTO accounting.expenses
           (org_id, category, expense_date, amount, tax_amount, vendor_id, vendor_name, payment_method, notes, extra, created_by)
         VALUES ($1,$2,COALESCE($3::date, current_date),$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, category, amount`,
        [orgId, d.category, d.expenseDate ?? null, d.amount, d.taxAmount ?? 0, d.vendorId ?? null,
         d.vendorName ?? null, d.paymentMethod ?? null, d.notes ?? null, JSON.stringify(d.extra ?? {}), p.userId],
      )).rows[0],
    );
  }

  // ── Collaboration: comment threads on entities (P8.3) ───────────────
  listComments(p: Principal, orgId: string, entityType: string, entityId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        // LEFT JOIN auth.users may be RLS-restricted — author_name falls back
        // to the stored role on the frontend when null.
        `SELECT m.id, m.author_id, m.author_role, m.body, m.created_at,
                split_part(u.email, '@', 1) AS author_name
           FROM accounting.entity_comments m
           LEFT JOIN auth.users u ON u.id = m.author_id
          WHERE m.org_id=$1 AND m.entity_type=$2 AND m.entity_id=$3
          ORDER BY m.created_at ASC LIMIT 200`,
        [orgId, entityType, entityId],
      )).rows,
    );
  }

  addComment(p: Principal, orgId: string, entityType: string, entityId: string, body: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `INSERT INTO accounting.entity_comments (org_id, entity_type, entity_id, author_id, author_role, body)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, author_id, author_role, body, created_at`,
        [orgId, entityType, entityId, p.userId, p.role, body],
      )).rows[0],
    );
  }

  // ── Document engine (template-driven PDFs) ──────────────────────────
  /**
   * Org block for documents: legal identity from tenant.organizations, plus
   * owner contact and the enterprise-profile sections (business address,
   * banking for the payment QR). Every join is best-effort — a missing
   * profile never blocks PDF generation.
   */
  private async loadOrg(c: PoolClient, orgId: string): Promise<{ org: DocOrg; bank: DocBank | null }> {
    const r = await c.query<{ legal_name: string; gstin: string | null; pan: string | null; public_id: string | null }>(
      "SELECT legal_name, gstin, pan, public_id FROM tenant.organizations WHERE id=$1", [orgId]);
    const base = r.rows[0] ?? { legal_name: "Your Business", gstin: null, pan: null, public_id: null };

    const owner = (await c.query<{ email: string | null; mobile: string | null }>(
      "SELECT email, mobile FROM auth.users WHERE org_id=$1 AND role='BUSINESS_OWNER' LIMIT 1", [orgId])).rows[0];
    const prof = (await c.query<{ sections: Record<string, Record<string, string>> | null }>(
      "SELECT sections FROM onboarding.onboarding_profiles WHERE org_id=$1", [orgId])).rows[0];
    const biz = prof?.sections?.business ?? {};
    const bank = prof?.sections?.banking ?? {};
    const ownerSec = prof?.sections?.owner ?? {};

    const address = [biz.city, biz.state, biz.pincode].filter(Boolean).join(", ") || null;
    const org: DocOrg = {
      ...base,
      owner_name: ownerSec.ownerName ?? (owner?.email ? owner.email.split("@")[0] : null),
      address,
      phone: ownerSec.ownerMobile ?? owner?.mobile ?? null,
      email: ownerSec.ownerEmail ?? owner?.email ?? null,
    };
    const docBank: DocBank | null = bank.accountNumber || bank.upi
      ? { accountHolder: bank.accountName ?? org.owner_name, bankName: bank.bankName, ifsc: bank.ifsc, accountNumber: bank.accountNumber, upi: bank.upi }
      : null;
    return { org, bank: docBank };
  }

  /** Allocate the next consecutive number in this org's series for the doc type. */
  private async nextNumber(c: PoolClient, orgId: string, type: DocType): Promise<string> {
    const tpl = templateFor(type);
    const r = await c.query<{ n: number }>(
      `INSERT INTO accounting.document_sequences (org_id, doc_type, prefix, next_number)
       VALUES ($1,$2,$3,2)
       ON CONFLICT (org_id, doc_type)
         DO UPDATE SET next_number = accounting.document_sequences.next_number + 1
       RETURNING next_number - 1 AS n`,
      [orgId, type, tpl.prefix]);
    return `${tpl.prefix}${new Date().getFullYear()}-${String(r.rows[0]!.n).padStart(4, "0")}`;
  }

  /** Render an existing sales invoice as a PDF of the requested document type. */
  salesInvoicePdf(p: Principal, orgId: string, salesId: string, type: DocType): Promise<{ buffer: Buffer; number: string }> {
    return this.run(p, orgId, async (c) => {
      const inv = (await c.query<Record<string, unknown>>("SELECT * FROM accounting.sales_invoices WHERE id=$1 AND org_id=$2", [salesId, orgId])).rows[0];
      if (!inv) throw new NotFoundException("invoice_not_found");
      const { org, bank } = await this.loadOrg(c, orgId);
      let party: DocParty = { name: (inv.customer_name as string) ?? "Customer" };
      if (inv.customer_id) {
        const cust = (await c.query<DocParty>("SELECT name, gstin, state, address, phone, email FROM accounting.customers WHERE id=$1", [inv.customer_id])).rows[0];
        if (cust) party = cust;
      }
      const items = ((inv.items as InvoiceItem[]) ?? []).map((it) => ({ name: it.name, hsn: it.hsn, qty: Number(it.qty), rate: Number(it.rate), taxRate: Number(it.taxRate ?? 18) }));
      const buffer = await renderDocument({
        type, number: inv.invoice_no as string, date: String(inv.date ?? inv.created_at), org, party, items,
        totals: { taxable: Number(inv.taxable), cgst: Number(inv.cgst), sgst: Number(inv.sgst), igst: Number(inv.igst), total: Number(inv.total) },
        interState: Number(inv.igst) > 0,
        status: (inv.status as string) === "PAID" ? "Paid" : "Pending",
        pos: party.state ?? null,
        bank,
      });
      return { buffer, number: inv.invoice_no as string };
    });
  }

  /** Create a brand-new document (credit note, quotation, PO, …) + audit row. */
  createDocument(p: Principal, orgId: string, input: { type: DocType; partyId?: string; party?: Record<string, unknown>; shipTo?: Record<string, unknown>; items: InvoiceItem[]; interState?: boolean; reference?: string; notes?: string }) {
    return this.run(p, orgId, async (c) => {
      const number = await this.nextNumber(c, orgId, input.type);
      const t = computeTotals(input.items, input.interState);
      let party: DocParty = { name: "Customer", ...(input.party as Partial<DocParty> | undefined) };
      if (!party.name) party.name = "Customer";
      if (input.partyId) {
        const cust = (await c.query<DocParty>("SELECT name, gstin, state, address, phone, email FROM accounting.customers WHERE id=$1 AND org_id=$2", [input.partyId, orgId])).rows[0];
        if (cust) party = cust;
      }
      const payload = {
        party, shipTo: (input.shipTo as Partial<DocParty> | undefined) ?? null, items: t.items,
        totals: { taxable: t.taxable, cgst: t.cgst, sgst: t.sgst, igst: t.igst, total: t.total },
        interState: !!input.interState, reference: input.reference ?? null, notes: input.notes ?? null,
      };
      const trail = [{ action: "CREATED", by: p.userId, at: new Date().toISOString() }];
      const r = await c.query<{ id: string }>(
        `INSERT INTO accounting.generated_documents (org_id, doc_type, number, payload, created_by, status, audit_trail)
         VALUES ($1,$2,$3,$4,$5,'CREATED',$6) RETURNING id`,
        [orgId, input.type, number, JSON.stringify(payload), p.userId, JSON.stringify(trail)]);
      // Black Box: every statutory document creation is an audited event.
      await this.outbox.enqueue(c, toOutboxEnvelope({
        event: "accounting.document.created", org_id: orgId, actor_id: p.userId,
        data: { document_id: r.rows[0]!.id, doc_type: input.type, number, total: payload.totals.total },
      }));
      return { id: r.rows[0]!.id, number };
    });
  }

  /**
   * Append an action to a document's audit trail (and advance lifecycle status
   * for approve/send/cancel). Every view/download/approval is recorded — the
   * document-level Financial Black Box.
   */
  recordDocAction(p: Principal, orgId: string, docId: string, action: string, meta?: Record<string, unknown>) {
    return this.run(p, orgId, async (c) => {
      const entry = JSON.stringify({ action, by: p.userId, at: new Date().toISOString(), ...(meta ? { meta } : {}) });
      // Map a few actions onto the lifecycle status / approval history.
      const statusFor: Record<string, string> = { APPROVED: "APPROVED", SENT: "SENT", CANCELLED: "CANCELLED", REJECTED: "CANCELLED" };
      const newStatus = statusFor[action];
      const wa = action === "SENT" ? "SENT" : null;
      const r = await c.query<{ id: string }>(
        `UPDATE accounting.generated_documents
            SET audit_trail = audit_trail || $3::jsonb,
                approval_history = CASE WHEN $4 = ANY(ARRAY['APPROVED','REJECTED']) THEN approval_history || $3::jsonb ELSE approval_history END,
                status = COALESCE($5, status),
                whatsapp_status = COALESCE($6, whatsapp_status),
                updated_at = now()
          WHERE id=$1 AND org_id=$2 RETURNING id`,
        [docId, orgId, entry, action, newStatus ?? null, wa]);
      if (!r.rows[0]) throw new NotFoundException("document_not_found");
      return { id: docId, action, status: newStatus };
    });
  }

  /** Record WhatsApp delivery status for a document (PENDING|SENT|DELIVERED|FAILED). */
  setDocWhatsappStatus(p: Principal, orgId: string, docId: string, waStatus: string) {
    return this.run(p, orgId, async (c) => {
      await c.query("UPDATE accounting.generated_documents SET whatsapp_status=$3, updated_at=now() WHERE id=$1 AND org_id=$2", [docId, orgId, waStatus]);
      return { id: docId, whatsapp_status: waStatus };
    });
  }

  /** Allocate the next number in a report series (REP-) — report types aren't in the invoice registry. */
  private async nextReportNumber(c: PoolClient, orgId: string, docType: string): Promise<string> {
    const r = await c.query<{ n: number }>(
      `INSERT INTO accounting.document_sequences (org_id, doc_type, prefix, next_number) VALUES ($1,$2,'REP-',2)
       ON CONFLICT (org_id, doc_type) DO UPDATE SET next_number = accounting.document_sequences.next_number + 1
       RETURNING next_number - 1 AS n`, [orgId, docType]);
    return `REP-${new Date().getFullYear()}-${String(r.rows[0]!.n).padStart(4, "0")}`;
  }

  /**
   * Render a report-style document (financial statement / GST / Vertofi report)
   * from structured sections the caller supplies — never fabricated here. Stores
   * a tracked record in the document center (status + audit + Black Box event)
   * unless save=false.
   */
  renderReportPdf(p: Principal, orgId: string, input: { docType: string; title?: string; subtitle?: string; period?: string; sections: ReportSection[]; save?: boolean }): Promise<{ buffer: Buffer; number: string; id?: string }> {
    return this.run(p, orgId, async (c) => {
      const { org } = await this.loadOrg(c, orgId);
      const title = input.title || reportTitle(input.docType);
      let number: string | null = null; let id: string | undefined;
      if (input.save !== false) {
        number = await this.nextReportNumber(c, orgId, input.docType);
        const payload = { kind: "report", title, subtitle: input.subtitle ?? null, period: input.period ?? null, sections: input.sections };
        const trail = [{ action: "CREATED", by: p.userId, at: new Date().toISOString() }];
        const r = await c.query<{ id: string }>(
          `INSERT INTO accounting.generated_documents (org_id, doc_type, number, payload, created_by, status, audit_trail)
           VALUES ($1,$2,$3,$4,$5,'CREATED',$6) RETURNING id`,
          [orgId, input.docType, number, JSON.stringify(payload), p.userId, JSON.stringify(trail)]);
        id = r.rows[0]!.id;
        await this.outbox.enqueue(c, toOutboxEnvelope({
          event: "accounting.document.created", org_id: orgId, actor_id: p.userId,
          data: { document_id: id, doc_type: input.docType, number },
        }));
      }
      const buffer = await renderReport({ docType: input.docType, title, subtitle: input.subtitle, period: input.period, number, org, sections: input.sections });
      return { buffer, number: number ?? title, id };
    });
  }

  /** Render a previously-created document. */
  documentPdf(p: Principal, orgId: string, docId: string): Promise<{ buffer: Buffer; number: string }> {
    return this.run(p, orgId, async (c) => {
      const d = (await c.query<{ doc_type: DocType; number: string; payload: Record<string, unknown>; created_at: string }>(
        "SELECT doc_type, number, payload, created_at FROM accounting.generated_documents WHERE id=$1 AND org_id=$2", [docId, orgId])).rows[0];
      if (!d) throw new NotFoundException("document_not_found");
      // Report-style stored documents re-render via the report engine.
      if ((d.payload as { kind?: string })?.kind === "report") {
        const { org } = await this.loadOrg(c, orgId);
        const pl = d.payload as { title: string; subtitle?: string | null; period?: string | null; sections: ReportSection[] };
        const buffer = await renderReport({ docType: d.doc_type, title: pl.title, subtitle: pl.subtitle, period: pl.period, number: d.number, org, sections: pl.sections });
        return { buffer, number: d.number };
      }
      const { org, bank } = await this.loadOrg(c, orgId);
      const pl = d.payload as { party: DocParty; shipTo?: DocParty | null; items: InvoiceItem[]; totals: { taxable: number; cgst: number; sgst: number; igst: number; total: number }; interState: boolean; reference: string | null; notes: string | null };
      const buffer = await renderDocument({
        type: d.doc_type, number: d.number, date: d.created_at, org, party: pl.party, shipTo: pl.shipTo ?? null,
        items: (pl.items ?? []).map((it) => ({ name: it.name, hsn: it.hsn, qty: Number(it.qty), rate: Number(it.rate), taxRate: Number(it.taxRate ?? 18) })),
        totals: pl.totals, interState: pl.interState, reference: pl.reference, notes: pl.notes,
        pos: pl.party?.state ?? null,
        bank,
      });
      return { buffer, number: d.number };
    });
  }

  /** Duplicate a generated document → a fresh copy with a new number. */
  duplicateDocument(p: Principal, orgId: string, docId: string): Promise<{ id: string; number: string }> {
    return this.run(p, orgId, async (c) => {
      const d = (await c.query<{ doc_type: string; payload: Record<string, unknown> }>(
        "SELECT doc_type, payload FROM accounting.generated_documents WHERE id=$1 AND org_id=$2", [docId, orgId])).rows[0];
      if (!d) throw new NotFoundException("document_not_found");
      const isReport = (d.payload as { kind?: string })?.kind === "report";
      const number = isReport ? await this.nextReportNumber(c, orgId, d.doc_type) : await this.nextNumber(c, orgId, d.doc_type as DocType);
      const trail = [{ action: "CREATED", by: p.userId, at: new Date().toISOString(), meta: { duplicatedFrom: docId } }];
      const r = await c.query<{ id: string }>(
        `INSERT INTO accounting.generated_documents (org_id, doc_type, number, payload, created_by, status, audit_trail)
         VALUES ($1,$2,$3,$4,$5,'CREATED',$6) RETURNING id`,
        [orgId, d.doc_type, number, JSON.stringify(d.payload), p.userId, JSON.stringify(trail)]);
      await this.outbox.enqueue(c, toOutboxEnvelope({ event: "accounting.document.created", org_id: orgId, actor_id: p.userId, data: { document_id: r.rows[0]!.id, doc_type: d.doc_type, number } }));
      return { id: r.rows[0]!.id, number };
    });
  }

  /**
   * Convert a document to another type (e.g. Quotation → Tax Invoice). When the
   * target is a ledger-posting sales type it creates a REAL sale (posts ledger +
   * stock); otherwise it creates a new document of the target type. The source's
   * audit trail records the conversion.
   */
  async convertDocument(p: Principal, orgId: string, docId: string, toType: string): Promise<{ kind: string; id?: string; number?: string; saleId?: string; invoiceNo?: string }> {
    const src = await this.run(p, orgId, async (c) =>
      (await c.query<{ payload: Record<string, unknown> }>("SELECT payload FROM accounting.generated_documents WHERE id=$1 AND org_id=$2", [docId, orgId])).rows[0]);
    if (!src) throw new NotFoundException("document_not_found");
    const pl = src.payload as { party?: DocParty; items?: InvoiceItem[]; interState?: boolean };
    const items = (pl.items ?? []).map((it) => ({ name: it.name, hsn: it.hsn, qty: Number(it.qty), rate: Number(it.rate), taxRate: Number(it.taxRate ?? 18) }));
    // Record the conversion on the source document's trail.
    await this.run(p, orgId, async (c) => c.query(
      "UPDATE accounting.generated_documents SET audit_trail = audit_trail || $3::jsonb, updated_at=now() WHERE id=$1 AND org_id=$2",
      [docId, orgId, JSON.stringify({ action: "CONVERTED", by: p.userId, at: new Date().toISOString(), meta: { toType } })]));
    if (toType === "TAX_INVOICE" || toType === "B2C_INVOICE") {
      const res = await this.createSalesInvoice(p, orgId, { customerName: pl.party?.name, items, interState: pl.interState, source: "CONVERT" });
      return { kind: "sale", saleId: res.id, invoiceNo: res.invoiceNo };
    }
    const res = await this.createDocument(p, orgId, { type: toType as DocType, party: pl.party as Record<string, unknown> | undefined, items, interState: pl.interState });
    return { kind: "document", id: res.id, number: res.number };
  }

  /** Full detail of one generated document — incl. audit trail + approval history (the timeline). */
  documentDetail(p: Principal, orgId: string, docId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `SELECT id, doc_type, number, status, whatsapp_status,
                payload->'party'->>'name' AS party_name,
                (payload->'totals'->>'total')::numeric AS total,
                audit_trail, approval_history, created_at, updated_at
           FROM accounting.generated_documents WHERE id=$1 AND org_id=$2`, [docId, orgId])).rows[0] ?? null);
  }

  /** List generated documents (quotations, credit notes, vouchers, …). */
  listDocuments(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `SELECT id, doc_type, number,
                payload->'party'->>'name' AS party_name,
                (payload->'totals'->>'total')::numeric AS total,
                status, whatsapp_status, created_at
           FROM accounting.generated_documents
          WHERE org_id=$1 ORDER BY created_at DESC LIMIT 200`,
        [orgId],
      )).rows,
    );
  }

  // ── Purchase invoices ───────────────────────────────────────────────
  createPurchaseInvoice(p: Principal, orgId: string, d: { vendorName?: string; vendorGstin?: string; billNo?: string; items: InvoiceItem[]; interState?: boolean; source?: string; documentId?: string }) {
    return this.run(p, orgId, async (c) => {
      const t = computeTotals(d.items, d.interState);
      const r = await c.query<{ id: string }>(
        `INSERT INTO accounting.purchase_invoices
           (org_id, bill_no, vendor_name, vendor_gstin, items, taxable, cgst, sgst, igst, total, source, document_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [orgId, d.billNo ?? null, d.vendorName ?? null, d.vendorGstin ?? null, JSON.stringify(t.items), t.taxable, t.cgst, t.sgst, t.igst, t.total, d.source ?? "FORM", d.documentId ?? null],
      );
      // Auto stock-in (at purchase rate → drives weighted-average cost).
      await this.applyInvoiceStock(c, orgId, t.items, "IN", "PURCHASE_INVOICE", r.rows[0]!.id, p.userId);
      return { id: r.rows[0]!.id, ...t };
    });
  }

  listPurchaseInvoices(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query("SELECT id, bill_no, vendor_name, date, total, status, source FROM accounting.purchase_invoices WHERE org_id=$1 ORDER BY date DESC, created_at DESC LIMIT 100", [orgId])).rows,
    );
  }

  // ── Inventory ───────────────────────────────────────────────────────
  /**
   * Post one stock movement: append to the stock ledger (with the running
   * balance) and update the product's stock + weighted-average cost. Weighted
   * average only moves on inbound at a known cost. Runs inside an open tx and
   * locks the product row so concurrent movements stay consistent.
   */
  private async postStock(
    c: PoolClient, orgId: string, productId: string,
    o: { type: string; direction: "IN" | "OUT"; qty: number; rate?: number; warehouseId?: string | null; batchId?: string | null; refType?: string | null; refId?: string | null; note?: string | null; userId?: string | null },
  ): Promise<{ balance: number } | null> {
    const prod = (await c.query<{ stock: string; avg_cost: string }>(
      "SELECT stock, avg_cost FROM accounting.products WHERE id=$1 AND org_id=$2 FOR UPDATE", [productId, orgId])).rows[0];
    if (!prod) return null;
    const curStock = Number(prod.stock) || 0;
    const curAvg = Number(prod.avg_cost) || 0;
    const qty = Math.abs(Number(o.qty) || 0);
    const rate = Number(o.rate ?? 0);
    const newStock = curStock + (o.direction === "IN" ? qty : -qty);
    let newAvg = curAvg;
    if (o.direction === "IN" && rate > 0) {
      newAvg = newStock > 0 ? (curStock * curAvg + qty * rate) / newStock : rate;
    }
    await c.query(
      `INSERT INTO accounting.stock_ledger
         (org_id, product_id, warehouse_id, batch_id, movement_type, direction, qty, rate, value, balance_qty, ref_type, ref_id, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [orgId, productId, o.warehouseId ?? null, o.batchId ?? null, o.type, o.direction, qty, rate, qty * rate, newStock, o.refType ?? null, o.refId ?? null, o.note ?? null, o.userId ?? null]);
    await c.query("UPDATE accounting.products SET stock=$2, avg_cost=$3 WHERE id=$1", [productId, newStock, newAvg]);
    return { balance: newStock };
  }

  /** Match invoice items to catalog products by name and post stock for each. */
  private async applyInvoiceStock(
    c: PoolClient, orgId: string, items: InvoiceItem[], direction: "IN" | "OUT", refType: string, refId: string, userId?: string,
  ): Promise<void> {
    for (const it of items) {
      if (!it.name) continue;
      const pid = (await c.query<{ id: string }>(
        "SELECT id FROM accounting.products WHERE org_id=$1 AND lower(name)=lower($2) LIMIT 1", [orgId, it.name])).rows[0]?.id;
      if (!pid) continue; // service line or untracked item — skip silently
      await this.postStock(c, orgId, pid, {
        type: direction === "OUT" ? "SALE" : "PURCHASE",
        direction, qty: Number(it.qty) || 0, rate: Number(it.rate) || 0, refType, refId, userId,
      });
    }
  }

  /** Manual stock adjustment (IN/OUT) → ledger + product stock. */
  adjustInventory(p: Principal, orgId: string, productId: string, direction: "IN" | "OUT", qty: number, reason?: string, opts?: { rate?: number; warehouseId?: string; batchId?: string }) {
    return this.run(p, orgId, async (c) => {
      const r = await this.postStock(c, orgId, productId, {
        type: "ADJUSTMENT", direction, qty, rate: opts?.rate, warehouseId: opts?.warehouseId, batchId: opts?.batchId,
        refType: "MANUAL", note: reason, userId: p.userId,
      });
      if (!r) throw new NotFoundException("product_not_found");
      return { productId, direction, qty, balance: r.balance };
    });
  }

  /** Move stock between two warehouses (OUT of source, IN to destination). */
  transferStock(p: Principal, orgId: string, d: { productId: string; qty: number; fromWarehouseId?: string; toWarehouseId?: string; note?: string }) {
    return this.run(p, orgId, async (c) => {
      await this.postStock(c, orgId, d.productId, { type: "TRANSFER", direction: "OUT", qty: d.qty, warehouseId: d.fromWarehouseId, refType: "TRANSFER", note: d.note, userId: p.userId });
      await this.postStock(c, orgId, d.productId, { type: "TRANSFER", direction: "IN", qty: d.qty, warehouseId: d.toWarehouseId, refType: "TRANSFER", note: d.note, userId: p.userId });
      return { transferred: d.qty };
    });
  }

  /** Stock list with low-stock flag (stock at/below reorder level). */
  stockSummary(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `SELECT id, name, hsn, sku, unit, category, warehouse, stock, rate, avg_cost, mrp, reorder_level, reorder_qty,
                (reorder_level IS NOT NULL AND stock <= reorder_level) AS low_stock,
                (stock * avg_cost) AS stock_value
           FROM accounting.products WHERE org_id=$1 ORDER BY low_stock DESC, stock ASC LIMIT 500`, [orgId])).rows,
    );
  }

  /** Products at or below their reorder level — the "reorder now" list. */
  lowStock(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `SELECT id, name, sku, unit, stock, reorder_level, reorder_qty, rate
           FROM accounting.products
          WHERE org_id=$1 AND reorder_level IS NOT NULL AND stock <= reorder_level
          ORDER BY (reorder_level - stock) DESC LIMIT 200`, [orgId])).rows,
    );
  }

  /** Inventory valuation totals + fast/slow indicators. */
  valuationReport(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) => {
      const totals = (await c.query<{ skus: string; total_qty: string; total_value: string }>(
        "SELECT count(*) skus, COALESCE(sum(stock),0) total_qty, COALESCE(sum(stock*avg_cost),0) total_value FROM accounting.products WHERE org_id=$1", [orgId])).rows[0]!;
      const lowCount = (await c.query<{ n: string }>(
        "SELECT count(*) n FROM accounting.products WHERE org_id=$1 AND reorder_level IS NOT NULL AND stock <= reorder_level", [orgId])).rows[0]!.n;
      const outOfStock = (await c.query<{ n: string }>(
        "SELECT count(*) n FROM accounting.products WHERE org_id=$1 AND stock <= 0", [orgId])).rows[0]!.n;
      return {
        skus: Number(totals.skus), totalQty: Number(totals.total_qty), totalValue: Number(totals.total_value),
        lowStock: Number(lowCount), outOfStock: Number(outOfStock),
      };
    });
  }

  /** The stock ledger for one product (movement history + running balance). */
  stockLedger(p: Principal, orgId: string, productId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `SELECT id, movement_type, direction, qty, rate, value, balance_qty, ref_type, ref_id, note, created_at
           FROM accounting.stock_ledger WHERE org_id=$1 AND product_id=$2 ORDER BY created_at DESC LIMIT 300`, [orgId, productId])).rows,
    );
  }

  // ── Warehouses ──────────────────────────────────────────────────────
  listWarehouses(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query("SELECT * FROM accounting.warehouses WHERE org_id=$1 ORDER BY is_default DESC, name", [orgId])).rows);
  }
  createWarehouse(p: Principal, orgId: string, d: Record<string, unknown>) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `INSERT INTO accounting.warehouses (org_id, name, code, address, city, state, pincode, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [orgId, d.name, d.code ?? null, d.address ?? null, d.city ?? null, d.state ?? null, d.pincode ?? null, d.isDefault === true])).rows[0]);
  }

  // ── Categories ──────────────────────────────────────────────────────
  listCategories(p: Principal, orgId: string) {
    return this.run(p, orgId, async (c) =>
      (await c.query("SELECT * FROM accounting.product_categories WHERE org_id=$1 ORDER BY name", [orgId])).rows);
  }
  createCategory(p: Principal, orgId: string, d: Record<string, unknown>) {
    return this.run(p, orgId, async (c) =>
      (await c.query(
        `INSERT INTO accounting.product_categories (org_id, name, parent) VALUES ($1,$2,$3)
         ON CONFLICT (org_id, name) DO UPDATE SET parent=EXCLUDED.parent RETURNING *`,
        [orgId, d.name, d.parent ?? null])).rows[0]);
  }

  // ── Batches ─────────────────────────────────────────────────────────
  listBatches(p: Principal, orgId: string, productId?: string) {
    return this.run(p, orgId, async (c) => {
      const params: unknown[] = [orgId];
      let where = "org_id=$1";
      if (productId) { params.push(productId); where += " AND product_id=$2"; }
      return (await c.query(`SELECT * FROM accounting.stock_batches WHERE ${where} ORDER BY expiry_date NULLS LAST, created_at DESC LIMIT 300`, params)).rows;
    });
  }
  createBatch(p: Principal, orgId: string, d: Record<string, unknown>) {
    return this.run(p, orgId, async (c) => {
      const b = (await c.query<{ id: string }>(
        `INSERT INTO accounting.stock_batches (org_id, product_id, batch_no, expiry_date, qty, cost, warehouse_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [orgId, d.productId, d.batchNo, d.expiryDate ?? null, d.qty ?? 0, d.cost ?? 0, d.warehouseId ?? null])).rows[0]!;
      // A batch with opening qty posts an inbound movement so stock + ledger agree.
      if (Number(d.qty) > 0) {
        await this.postStock(c, orgId, String(d.productId), { type: "OPENING", direction: "IN", qty: Number(d.qty), rate: Number(d.cost) || 0, batchId: b.id, warehouseId: (d.warehouseId as string) ?? null, refType: "MANUAL", note: `Batch ${d.batchNo}`, userId: p.userId });
      }
      return { id: b.id };
    });
  }

  /**
   * Zero-Typing AI draft (Mode 3 + Ask-Vertofi command bar + WhatsApp NL).
   * Natural language → a structured, reviewable invoice draft. Customers/products
   * are auto-enriched from the org's data (GST, rate, HSN). NEVER posts — the
   * user reviews and confirms. Degrades honestly if AI is unavailable.
   */
  async aiDraft(p: Principal, orgId: string, command: string, kind: "sales" | "purchase" = "sales") {
    return this.run(p, orgId, async (c) => {
      const noun = kind === "sales" ? "sales invoice (customer)" : "purchase bill (vendor)";
      const prompt =
        `Extract a ${noun} from this instruction. Return JSON ` +
        `{"party":"<customer/vendor name>","items":[{"name":"","qty":0,"rate":0,"taxRate":18}]}. ` +
        `Infer quantities and rates from the text. Instruction: "${command}"`;
      let parsed: { party?: string; items?: InvoiceItem[] } | null = null;
      let degraded = true;
      try {
        const res = await fetch(`${AI_URL}/ai/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: "analyze", org_id: orgId, plan: p.plan, json: true, prompt }),
        });
        const body = (await res.json()) as { degraded?: boolean; content?: { party?: string; items?: InvoiceItem[] } };
        if (!body.degraded && body.content) {
          parsed = body.content;
          degraded = false;
        }
      } catch {
        /* keep degraded */
      }
      if (!parsed || !parsed.items?.length) {
        return { degraded: true, draft: null, reason: degraded ? "ai_unavailable" : "could_not_parse" };
      }

      // Enrich items from the product catalog (rate/HSN/tax), and the party from
      // the customer/vendor catalog (GST/state) — Smart-Form-style autofill.
      const items: InvoiceItem[] = [];
      for (const it of parsed.items) {
        const prod = (await c.query<{ rate: string; hsn: string; tax_rate: string }>(
          "SELECT rate, hsn, tax_rate FROM accounting.products WHERE org_id=$1 AND name ILIKE $2 LIMIT 1",
          [orgId, `%${it.name}%`],
        )).rows[0];
        items.push({
          name: it.name,
          qty: Number(it.qty) || 0,
          rate: it.rate ?? (prod ? Number(prod.rate) : 0),
          taxRate: it.taxRate ?? (prod ? Number(prod.tax_rate) : 18),
          hsn: it.hsn ?? prod?.hsn,
        });
      }
      let party: Record<string, unknown> | null = null;
      if (parsed.party) {
        const table = kind === "sales" ? "customers" : "customers"; // vendor lookup uses vendor svc; customers table for sales
        party = (await c.query(`SELECT * FROM accounting.${table} WHERE org_id=$1 AND name ILIKE $2 LIMIT 1`, [orgId, `%${parsed.party}%`])).rows[0] ?? { name: parsed.party };
      }
      const totals = computeTotals(items, false);
      return { degraded: false, draft: { kind, party, items: totals.items, totals: { taxable: totals.taxable, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, total: totals.total } } };
    });
  }
}
