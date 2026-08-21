/**
 * Template-faithful PDF renderer. Reproduces the approved layouts under
 * docs/templates (scanned via scripts/scan-templates.py): brand header with
 * company + contact blocks, centered blue title band + copy label, bordered
 * Bill To / Ship To / meta grid, full-grid items table with grouped
 * IGST-or-CGST/SGST + CESS columns, amount-in-words + totals grid, bank
 * details + UPI payment QR, and the "For <company> / Authorised Signatory"
 * footer box. One renderer drives every DocType from the registry.
 */
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { templateFor, type DocType } from "./templates.js";

// Embedded Noto Sans (pdfkit's built-in Helvetica has no ₹ glyph). Resolves
// from BOTH src (ts-node) and dist (compiled) because fonts live under src/
// and the runtime image ships the whole repo.
const FONTS = fileURLToPath(new URL("../../src/docgen/fonts/", import.meta.url));

export interface DocParty {
  name: string;
  company?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
}
export interface DocOrg {
  legal_name: string;
  owner_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  public_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}
export interface DocBank {
  accountHolder?: string | null;
  bankName?: string | null;
  ifsc?: string | null;
  accountNumber?: string | null;
  upi?: string | null;
}
export interface DocLineItem { name: string; hsn?: string; qty: number; unit?: string; rate: number; taxRate: number; cessRate?: number }
export interface DocTotals { taxable: number; cgst: number; sgst: number; igst: number; cess?: number; extraCharges?: number; total: number }
export interface DocumentData {
  type: DocType;
  number: string;
  date: string;
  org: DocOrg;
  party: DocParty;
  shipTo?: DocParty | null;
  items: DocLineItem[];
  totals: DocTotals;
  interState: boolean;
  dueDate?: string | null;
  status?: string | null;        // Pending | Due | Paid
  pos?: string | null;           // place of supply, e.g. "24-Gujarat"
  rcm?: string | null;           // reverse charge: "No" / "Yes"
  reference?: string | null;     // referenced invoice for credit/debit notes
  notes?: string | null;
  bank?: DocBank | null;
  einvoice?: { irn: string; ackNo?: string | null; ackDate?: string | null } | null;
}

const BRAND = "#1378F8";
const TITLE_BG = "#EAF2FE";
const INK = "#111827";
const MUTE = "#4B5563";
const LINE = "#9CA3AF";
const dt = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
const money = (n: number) => `₹ ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Indian amount-in-words (lakh/crore) ─────────────────────────────────────
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function twoDigit(n: number): string {
  if (n < 20) return ONES[n]!;
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function threeDigit(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  return `${h ? ONES[h] + " Hundred" + (r ? " " : "") : ""}${r ? twoDigit(r) : ""}`;
}
export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  let n = rupees;
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${twoDigit(crore)} Crore`);
  if (lakh) parts.push(`${twoDigit(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigit(thousand)} Thousand`);
  if (n) parts.push(threeDigit(n));
  let words = parts.join(" ").trim() + " Rupees";
  if (paise) words += ` and ${twoDigit(paise)} Paise`;
  return words + " Only";
}

type Doc = InstanceType<typeof PDFDocument>;
const L = 28, R = 567, W = R - L; // A4 595pt with 28pt margins

/** Bold "Label:" + regular value, returning the y after the wrapped value. */
function labeled(doc: Doc, x: number, y: number, w: number, label: string, value?: string | null, size = 7.5): number {
  if (!value) return y;
  doc.font("SansBold").fontSize(size).fillColor(INK).text(`${label}: `, x, y, { continued: true, width: w });
  doc.font("Sans").text(value, { width: w });
  return doc.y + 2;
}

function partyBlock(doc: Doc, x: number, y: number, w: number, heading: string, p: DocParty): number {
  doc.font("SansBold").fontSize(8).fillColor(INK).text(`${heading}:`, x, y);
  let yy = y + 12;
  yy = labeled(doc, x, yy, w, "Name", p.name);
  yy = labeled(doc, x, yy, w, "Company", p.company);
  yy = labeled(doc, x, yy, w, "Address", p.address);
  yy = labeled(doc, x, yy, w, "Phone", p.phone);
  yy = labeled(doc, x, yy, w, "Email", p.email);
  yy = labeled(doc, x, yy, w, "GSTIN", p.gstin);
  yy = labeled(doc, x, yy, w, "PAN", p.pan);
  yy = labeled(doc, x, yy, w, "State", p.state);
  return yy;
}

// ── Shipping label (docs/templates/shipping-label) ──────────────────────────
function renderLabel(doc: Doc, data: DocumentData): void {
  const top = 60, h = 250, mid = L + W * 0.52;
  doc.roundedRect(L, top, W, h, 6).lineWidth(2).strokeColor(INK).stroke();
  doc.moveTo(mid, top).lineTo(mid, top + h).lineWidth(2).stroke();

  // SHIP TO pill
  doc.roundedRect(L + 16, top + 16, 92, 24, 11).fill(INK);
  doc.font("SansBold").fontSize(11).fillColor("#FFFFFF").text("SHIP TO:", L + 16, top + 23, { width: 92, align: "center" });
  const to = data.shipTo ?? data.party;
  let y = top + 54;
  y = labeled(doc, L + 16, y, mid - L - 32, "Name", to.name, 11);
  y = labeled(doc, L + 16, y, mid - L - 32, "Company", to.company, 11);
  y = labeled(doc, L + 16, y, mid - L - 32, "Phone", to.phone, 11);
  labeled(doc, L + 16, y, mid - L - 32, "Address", [to.address, to.state].filter(Boolean).join(", "), 11);

  doc.font("SansBold").fontSize(11).fillColor(INK).text("FROM", mid + 16, top + 20);
  let fy = top + 44;
  fy = labeled(doc, mid + 16, fy, R - mid - 32, "Name", data.org.owner_name ?? data.org.legal_name, 11);
  fy = labeled(doc, mid + 16, fy, R - mid - 32, "Company", data.org.legal_name, 11);
  fy = labeled(doc, mid + 16, fy, R - mid - 32, "Phone", data.org.phone, 11);
  labeled(doc, mid + 16, fy, R - mid - 32, "Address", data.org.address, 11);
}

// ── Main render ──────────────────────────────────────────────────────────────
export async function renderDocument(data: DocumentData): Promise<Buffer> {
  const tpl = templateFor(data.type);
  // Pre-generate the UPI payment QR (async) before drawing.
  let qrPng: Buffer | null = null;
  if (tpl.bankDetails && data.bank?.upi) {
    const upi = `upi://pay?pa=${encodeURIComponent(data.bank.upi)}&pn=${encodeURIComponent(data.org.legal_name)}&am=${data.totals.total.toFixed(2)}&cu=INR`;
    qrPng = await QRCode.toBuffer(upi, { margin: 0, width: 160 });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    doc.registerFont("Sans", `${FONTS}NotoSans-Regular.ttf`);
    doc.registerFont("SansBold", `${FONTS}NotoSans-Bold.ttf`);
    doc.registerFont("SansItalic", `${FONTS}NotoSans-Italic.ttf`);
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Shipping label is JUST the two boxes (per template) — no header/title.
    if (tpl.layout === "label") {
      renderLabel(doc, data);
      doc.font("Sans").fontSize(7).fillColor(MUTE).text("Generated by Vertofi — vertofi.com", L, 806, { width: W, align: "center" });
      doc.end();
      return;
    }

    // ── Header: company (left) | owner contact (right). No logo by design. ──
    doc.font("SansBold").fontSize(13).fillColor(BRAND).text(data.org.legal_name.toUpperCase(), L, 36, { width: 330 });
    doc.font("Sans").fontSize(7.5).fillColor(INK).text(data.org.address ?? "", L, doc.y + 2, { width: 330 });

    let hy = 38;
    if (data.org.owner_name) hy = labeled(doc, 420, hy, R - 420, "Name", data.org.owner_name, 8);
    if (data.org.phone) hy = labeled(doc, 420, hy, R - 420, "Phone", data.org.phone, 8);
    if (data.org.email) labeled(doc, 420, hy, R - 420, "Email", data.org.email, 8);

    // ── GSTIN row + centered title band + copy label ──
    const ty = 96;
    if (data.org.gstin) {
      doc.font("SansBold").fontSize(8).fillColor(INK).text(`GSTIN / UIN: ${data.org.gstin}`, L, ty + 5);
    }
    const tw = 170;
    doc.rect(L + (W - tw) / 2, ty, tw, 22).fill(TITLE_BG);
    doc.font("SansBold").fontSize(12).fillColor(BRAND).text(tpl.title, L + (W - tw) / 2, ty + 5, { width: tw, align: "center" });
    if (tpl.originalLabel) {
      doc.rect(R - 132, ty + 2, 132, 16).lineWidth(0.7).strokeColor(LINE).stroke();
      doc.font("Sans").fontSize(6.5).fillColor(INK).text(tpl.originalLabel, R - 132, ty + 7, { width: 132, align: "center" });
    }

    // ── E-invoice band (IRN) when present ──
    let y = ty + 30;
    if (data.einvoice?.irn) {
      doc.font("SansBold").fontSize(7).fillColor(INK).text("IRN: ", L, y, { continued: true });
      doc.font("Sans").text(data.einvoice.irn, { width: W - 30 });
      if (data.einvoice.ackNo) {
        doc.font("SansBold").text("Ack No: ", L, doc.y + 1, { continued: true });
        doc.font("Sans").text(`${data.einvoice.ackNo}${data.einvoice.ackDate ? `   Ack Date: ${dt(data.einvoice.ackDate)}` : ""}`);
      }
      y = doc.y + 6;
    }

    // ── Party grid: Bill To | Ship To | document meta ──
    const c1 = L + 8, c1w = 196, c2 = L + 212, c2w = 186, c3 = L + 406, c3w = R - (L + 406) - 8;
    const gy = y;
    let by = partyBlock(doc, c1, gy + 8, c1w, tpl.partyLabel, data.party);
    const ship = data.shipTo ?? data.party;
    const sy = partyBlock(doc, c2, gy + 8, c2w, "Ship To", ship);

    // Meta column
    const docWord = tpl.title;
    let my = gy + 8;
    my = labeled(doc, c3, my, c3w, `${docWord} No`, data.number, 7.5);
    my = labeled(doc, c3, my, c3w, `${docWord} Date`, dt(data.date), 7.5);
    if (data.dueDate) my = labeled(doc, c3, my, c3w, "Due Date", dt(data.dueDate), 7.5);
    if (data.reference) my = labeled(doc, c3, my, c3w, "Invoice No (ref)", data.reference, 7.5);
    if (data.pos) my = labeled(doc, c3, my, c3w, "POS", data.pos, 7.5);
    my = labeled(doc, c3, my, c3w, "RCM", data.rcm ?? "No", 7.5);

    const gh = Math.max(by, sy, my) - gy + 8;
    doc.rect(L, gy, W, gh).lineWidth(0.8).strokeColor(INK).stroke();
    doc.moveTo(L + 204, gy).lineTo(L + 204, gy + gh).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.moveTo(L + 398, gy).lineTo(L + 398, gy + gh).stroke();
    y = gy + gh + 10;

    // ── Items table — grouped GST columns for tax docs, a simple table for
    //    non-tax docs (bill of supply, delivery challan, payment voucher). ──
    if (data.items.length > 0) {
      type Col = { key: string; label: string; w: number; align: "left" | "right" | "center"; group?: string };
      const igst = data.interState;
      const cols: Col[] = tpl.taxTable
        ? [
            { key: "sr", label: "Sr.No", w: 26, align: "center" },
            { key: "item", label: "Item", w: igst ? 136 : 116, align: "left" },
            { key: "hsn", label: "HSN", w: 34, align: "center" },
            { key: "qty", label: "Qty", w: 24, align: "right" },
            { key: "unit", label: "Unit", w: 26, align: "center" },
            { key: "rate", label: "Rate", w: 44, align: "right" },
            { key: "taxable", label: "Taxable Value", w: 56, align: "right" },
            ...(igst
              ? [
                  { key: "t1r", label: "Rate", w: 28, align: "right" as const, group: "IGST" },
                  { key: "t1a", label: "Amount", w: 48, align: "right" as const, group: "IGST" },
                ]
              : [
                  { key: "t1r", label: "Rate", w: 24, align: "right" as const, group: "CGST" },
                  { key: "t1a", label: "Amount", w: 40, align: "right" as const, group: "CGST" },
                  { key: "t2r", label: "Rate", w: 24, align: "right" as const, group: "SGST" },
                  { key: "t2a", label: "Amount", w: 40, align: "right" as const, group: "SGST" },
                ]),
            { key: "cessr", label: "Rate", w: 22, align: "right", group: "CESS" },
            { key: "cessa", label: "Amt", w: 32, align: "right", group: "CESS" },
            { key: "total", label: "Total", w: 0, align: "right" }, // 0 = take remainder
          ]
        : [
            { key: "sr", label: "Sr.No", w: 32, align: "center" },
            { key: "item", label: "Item / Description", w: 230, align: "left" },
            { key: "hsn", label: "HSN/SAC", w: 60, align: "center" },
            { key: "qty", label: "Qty", w: 44, align: "right" },
            { key: "unit", label: "Unit", w: 44, align: "center" },
            { key: "rate", label: "Rate", w: 60, align: "right" },
            { key: "total", label: "Amount", w: 0, align: "right" },
          ];
      const fixed = cols.reduce((s, c) => s + c.w, 0);
      cols[cols.length - 1]!.w = W - fixed;

      // Header (two rows: group band + column labels)
      const h1 = 12, h2 = 14, hy0 = y;
      doc.lineWidth(0.7).strokeColor(INK);
      let x = L;
      doc.font("SansBold").fontSize(7).fillColor(INK);
      // group band cells
      let gi = 0;
      while (gi < cols.length) {
        const c = cols[gi]!;
        if (c.group) {
          let gw = 0, gj = gi;
          while (gj < cols.length && cols[gj]!.group === c.group) { gw += cols[gj]!.w; gj++; }
          doc.rect(x, hy0, gw, h1).stroke();
          doc.text(c.group, x, hy0 + 3, { width: gw, align: "center" });
          // sub labels
          let sx = x;
          for (let k = gi; k < gj; k++) {
            doc.rect(sx, hy0 + h1, cols[k]!.w, h2).stroke();
            doc.text(cols[k]!.label, sx + 1, hy0 + h1 + 4, { width: cols[k]!.w - 2, align: "center" });
            sx += cols[k]!.w;
          }
          x += gw; gi = gj;
        } else {
          doc.rect(x, hy0, c.w, h1 + h2).stroke();
          doc.text(c.label, x + 1, hy0 + 9, { width: c.w - 2, align: "center" });
          x += c.w; gi++;
        }
      }
      y = hy0 + h1 + h2;

      // Rows
      doc.font("Sans").fontSize(7);
      for (let i = 0; i < data.items.length; i++) {
        const it = data.items[i]!;
        const taxable = it.qty * it.rate;
        const taxAmt = (taxable * it.taxRate) / 100;
        const cessAmt = (taxable * (it.cessRate ?? 0)) / 100;
        const lineTotal = taxable + taxAmt + cessAmt;
        const cells: Record<string, string> = {
          sr: String(i + 1), item: it.name.toUpperCase(), hsn: it.hsn ?? "", qty: String(it.qty),
          unit: it.unit ?? "OTH", rate: it.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
          taxable: money(taxable),
          t1r: igst ? `${it.taxRate}%` : `${it.taxRate / 2}%`,
          t1a: igst ? money(taxAmt) : money(taxAmt / 2),
          t2r: `${it.taxRate / 2}%`, t2a: money(taxAmt / 2),
          cessr: `${it.cessRate ?? 0}%`, cessa: cessAmt ? money(cessAmt) : "₹ 0.00",
          total: money(tpl.taxTable ? lineTotal : taxable),
        };
        const itemCol = cols.find((c) => c.key === "item")!;
        const rh = Math.max(18, doc.heightOfString(cells.item!, { width: itemCol.w - 6 }) + 8);
        let cx = L;
        for (const c of cols) {
          doc.rect(cx, y, c.w, rh).lineWidth(0.5).strokeColor(LINE).stroke();
          doc.fillColor(INK).text(cells[c.key] ?? "", cx + 3, y + 5, { width: c.w - 6, align: c.align });
          cx += c.w;
        }
        y += rh;
      }
      doc.moveTo(L, y).lineTo(R, y).lineWidth(0.8).strokeColor(INK).stroke();
      y += 12;
    }

    // ── Amount in words (left) + totals grid (right) ──
    if (tpl.taxTable) {
      const t = data.totals;
      const lw = 300, tx = L + lw + 14, twd = R - tx;
      const rows: [string, string, boolean][] = [["Taxable Amount", money(t.taxable), false]];
      if (data.interState) rows.push(["Total IGST", money(t.igst), false]);
      else { rows.push(["Total CGST", money(t.cgst), false]); rows.push(["Total SGST", money(t.sgst), false]); }
      rows.push(["Total CESS", money(t.cess ?? 0), false]);
      if (t.extraCharges) rows.push(["Extra Charges", money(t.extraCharges), false]);
      rows.push(["Total Amount", money(t.total), true]);

      // words box
      const wordsH = rows.length * 18;
      doc.rect(L, y, lw, wordsH).lineWidth(0.7).strokeColor(INK).stroke();
      doc.rect(L, y, lw, 16).fillAndStroke("#F3F4F6", INK);
      doc.font("SansBold").fontSize(7.5).fillColor(INK).text("Tax Amount (in words)", L, y + 5, { width: lw, align: "center" });
      doc.font("Sans").fontSize(8).fillColor(INK).text(amountInWords(t.total), L + 8, y + 24, { width: lw - 16, align: "center" });

      let ry = y;
      for (const [label, val, bold] of rows) {
        doc.rect(tx, ry, twd, 18).lineWidth(0.7).strokeColor(INK).stroke();
        doc.font(bold ? "SansBold" : "Sans").fontSize(bold ? 8.5 : 8).fillColor(INK);
        doc.text(label, tx + 6, ry + 5, { width: twd * 0.55 });
        doc.text(val, tx + twd * 0.45, ry + 5, { width: twd * 0.55 - 8, align: "right" });
        ry += 18;
      }
      y += Math.max(wordsH, rows.length * 18) + 12;
    } else if (data.items.length > 0) {
      // Non-tax documents still show a plain total + amount in words.
      const tx = L + 314, twd = R - tx;
      doc.rect(tx, y, twd, 20).lineWidth(0.8).strokeColor(INK).stroke();
      doc.font("SansBold").fontSize(9).fillColor(INK).text("Total Amount", tx + 6, y + 6, { width: twd * 0.55 });
      doc.text(money(data.totals.taxable), tx + twd * 0.45, y + 6, { width: twd * 0.55 - 8, align: "right" });
      doc.font("Sans").fontSize(7.5).fillColor(MUTE).text(`Amount in words: ${amountInWords(data.totals.taxable)}`, L, y + 4, { width: 300 });
      y += 30;
    }

    // ── Bank details + payment QR ──
    if (tpl.bankDetails && data.bank && (data.bank.accountNumber || data.bank.upi)) {
      const bh = 78;
      doc.rect(L, y, 300, bh).lineWidth(0.7).strokeColor(INK).stroke();
      doc.rect(L, y, 300, 16).fillAndStroke("#F3F4F6", INK);
      doc.font("SansBold").fontSize(7.5).fillColor(INK).text("Bank Details", L, y + 5, { width: 300, align: "center" });
      let by2 = y + 20;
      by2 = labeled(doc, L + 8, by2, 284, "Account Holder", data.bank.accountHolder, 7.5);
      by2 = labeled(doc, L + 8, by2, 284, "Bank", data.bank.bankName, 7.5);
      by2 = labeled(doc, L + 8, by2, 284, "IFSC", data.bank.ifsc, 7.5);
      labeled(doc, L + 8, by2, 284, "Account No", data.bank.accountNumber, 7.5);
      if (qrPng) {
        doc.image(qrPng, R - 80, y, { width: 72, height: 72 });
        doc.font("Sans").fontSize(6.5).fillColor(MUTE).text("Scan to pay (UPI)", R - 84, y + 74, { width: 80, align: "center" });
      }
      y += bh + 12;
    }

    // ── Declaration + footer: status (left) + signature box (right) ──
    if (tpl.declaration) {
      doc.font("Sans").fontSize(6.5).fillColor(MUTE).text(tpl.declaration, L, y, { width: 300 });
    }
    if (data.notes) doc.font("Sans").fontSize(7.5).fillColor(INK).text(`Notes: ${data.notes}`, L, y + 18, { width: 300 });

    const fy = Math.max(y, 700);
    if (data.status) {
      doc.font("SansBold").fontSize(8).fillColor(INK).text("Status: ", L, fy + 26, { continued: true });
      doc.font("Sans").text(data.status);
    }
    if (tpl.signature) {
      const sw = 213, sx = R - sw;
      doc.rect(sx, fy, sw, 64).lineWidth(0.7).strokeColor(INK).stroke();
      doc.font("SansBold").fontSize(8).fillColor(INK).text(`For ${data.org.legal_name}`, sx, fy + 8, { width: sw, align: "center" });
      if (data.org.owner_name) {
        doc.font("SansItalic").fontSize(10).fillColor(MUTE).text(data.org.owner_name, sx, fy + 22, { width: sw, align: "center" });
      }
      doc.font("SansBold").fontSize(8).fillColor(INK).text("Authorised Signatory", sx, fy + 38, { width: sw, align: "center" });
      if (data.org.owner_name) {
        doc.font("Sans").fontSize(7).fillColor(MUTE).text(data.org.owner_name, sx, fy + 50, { width: sw, align: "center" });
      }
    }

    doc.font("Sans").fontSize(7).fillColor(MUTE).text("Page 1 of 1  ·  Generated by Vertofi — vertofi.com", L, 812, { width: W, align: "center" });
    doc.end();
  });
}
