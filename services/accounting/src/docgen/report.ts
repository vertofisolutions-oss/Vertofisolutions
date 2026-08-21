/**
 * Report PDF renderer — the template engine for the document types that are
 * REPORTS rather than line-item invoices (financial statements, GST summaries,
 * and the Vertofi intelligence reports). Same rule as the invoice renderer:
 * every figure comes from structured JSON supplied by the caller (the report
 * screens / services that already computed it) — never generated here. One
 * renderer draws all of them from a declarative section model.
 */
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import type { DocOrg } from "./render.js";

const FONTS = fileURLToPath(new URL("../../src/docgen/fonts/", import.meta.url));
const BRAND = "#1378F8";
const TITLE_BG = "#EAF2FE";
const INK = "#111827";
const MUTE = "#4B5563";
const LINE = "#9CA3AF";
const L = 28, R = 567, W = R - L;

export interface ReportKV { label: string; value: string; bold?: boolean }
export interface ReportColumn { label: string; align?: "left" | "right" | "center"; w?: number }
export interface ReportSection {
  heading?: string;
  kind: "kv" | "table" | "note";
  rows?: ReportKV[];                 // kind: kv
  columns?: ReportColumn[];          // kind: table
  data?: string[][];                 // kind: table — rows of cell strings
  total?: string[];                  // kind: table — bold footer row
  note?: string;                     // kind: note
}

/** The catalog of report document types (titles + UI grouping). */
export const REPORT_CATALOG: { type: string; title: string; category: string; description: string }[] = [
  { type: "E_INVOICE", title: "E-Invoice", category: "GST", description: "IRN + signed QR e-invoice." },
  { type: "EWAY_BILL_SUMMARY", title: "E-Way Bill Summary", category: "GST", description: "Consignment e-way bill summary." },
  { type: "GST_SUMMARY", title: "GST Summary Report", category: "GST", description: "Output/input tax + net liability." },
  { type: "ITC_RECON", title: "ITC Reconciliation", category: "GST", description: "Input tax credit reconciliation." },
  { type: "PROFIT_LOSS", title: "Profit & Loss", category: "FINANCIAL", description: "Income, expenses and net profit." },
  { type: "BALANCE_SHEET", title: "Balance Sheet", category: "FINANCIAL", description: "Assets, liabilities and equity." },
  { type: "CASH_FLOW", title: "Cash Flow Statement", category: "FINANCIAL", description: "Operating / investing / financing flows." },
  { type: "TRIAL_BALANCE", title: "Trial Balance", category: "FINANCIAL", description: "All ledger balances, debit vs credit." },
  { type: "GENERAL_LEDGER", title: "General Ledger", category: "FINANCIAL", description: "Account-wise posting detail." },
  { type: "ACCOUNT_STATEMENT", title: "Account Statement", category: "FINANCIAL", description: "Party statement of account." },
  { type: "BHS_REPORT", title: "Business Health Score Report", category: "VERTOFI", description: "BHS breakdown + drivers." },
  { type: "PROFIT_LEAK_REPORT", title: "Profit Leak Report", category: "VERTOFI", description: "Detected leaks + savings." },
  { type: "BLACK_BOX_REPORT", title: "Financial Black Box Report", category: "VERTOFI", description: "Tamper-evident audit timeline." },
  { type: "TAX_WARNING_REPORT", title: "Predictive Tax Warning Report", category: "VERTOFI", description: "Upcoming tax exposure." },
  { type: "MONEY_MAP_REPORT", title: "Money Map Report", category: "VERTOFI", description: "Inflow/outflow money map." },
  { type: "VENDOR_TRUST_REPORT", title: "Vendor Trust Report", category: "VERTOFI", description: "Vendor trust scores." },
  { type: "BENCHMARK_REPORT", title: "Industry Benchmark Report", category: "VERTOFI", description: "Peer benchmark comparison." },
  { type: "WARRANTY_REPORT", title: "Accounting Warranty Report", category: "VERTOFI", description: "Warranty cover + claims." },
  { type: "LIFEGUARD_REPORT", title: "Business Lifeguard Incident Report", category: "VERTOFI", description: "SOS incident timeline." },
];

const REPORT_TITLES = new Map(REPORT_CATALOG.map((r) => [r.type, r.title]));
export function isReportType(type: string): boolean { return REPORT_TITLES.has(type); }
export function reportTitle(type: string): string { return REPORT_TITLES.get(type) ?? "Report"; }

export interface ReportData {
  docType: string;
  title: string;
  subtitle?: string | null;
  period?: string | null;
  number?: string | null;
  org: DocOrg;
  sections: ReportSection[];
  generatedAt?: string;
}

type Doc = InstanceType<typeof PDFDocument>;
const dtNow = () => new Date().toLocaleString("en-IN");

export async function renderReport(d: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    doc.registerFont("Sans", `${FONTS}NotoSans-Regular.ttf`);
    doc.registerFont("SansBold", `${FONTS}NotoSans-Bold.ttf`);
    doc.registerFont("SansItalic", `${FONTS}NotoSans-Italic.ttf`);
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.font("SansBold").fontSize(13).fillColor(BRAND).text(d.org.legal_name.toUpperCase(), L, 36, { width: 360 });
    doc.font("Sans").fontSize(7.5).fillColor(INK).text(d.org.address ?? "", L, doc.y + 2, { width: 360 });
    if (d.org.gstin) doc.font("SansBold").fontSize(8).fillColor(INK).text(`GSTIN: ${d.org.gstin}`, L, doc.y + 2);

    // Title band
    const ty = 100;
    const tw = 260;
    doc.rect(L + (W - tw) / 2, ty, tw, 24).fill(TITLE_BG);
    doc.font("SansBold").fontSize(13).fillColor(BRAND).text(d.title, L + (W - tw) / 2, ty + 6, { width: tw, align: "center" });
    let y = ty + 34;
    const meta = [d.subtitle, d.period ? `Period: ${d.period}` : null, d.number ? `Ref: ${d.number}` : null].filter(Boolean).join("   ·   ");
    if (meta) { doc.font("Sans").fontSize(8).fillColor(MUTE).text(meta, L, y, { width: W, align: "center" }); y = doc.y + 8; }

    const ensure = (need: number) => { if (y + need > 800) { doc.addPage({ size: "A4", margin: 0 }); y = 40; } };

    for (const sec of d.sections) {
      ensure(28);
      if (sec.heading) {
        doc.rect(L, y, W, 18).fill("#F3F4F6");
        doc.font("SansBold").fontSize(9).fillColor(INK).text(sec.heading, L + 8, y + 5, { width: W - 16 });
        y += 24;
      }
      if (sec.kind === "kv" && sec.rows) {
        for (const row of sec.rows) {
          ensure(16);
          doc.font(row.bold ? "SansBold" : "Sans").fontSize(8.5).fillColor(INK);
          doc.text(row.label, L + 8, y + 3, { width: W * 0.62 });
          doc.text(row.value, L + W * 0.5, y + 3, { width: W * 0.5 - 8, align: "right" });
          y += 16;
          doc.moveTo(L, y).lineTo(R, y).lineWidth(0.3).strokeColor("#E5E7EB").stroke();
        }
        y += 6;
      } else if (sec.kind === "table" && sec.columns && sec.data) {
        const cols = sec.columns;
        const fixed = cols.reduce((s, c) => s + (c.w ?? 0), 0);
        const flexCount = cols.filter((c) => !c.w).length || 1;
        const flexW = (W - fixed) / flexCount;
        const colW = (c: ReportColumn) => c.w ?? flexW;
        // header
        ensure(18);
        let x = L;
        doc.font("SansBold").fontSize(7.5).fillColor(INK);
        for (const c of cols) { doc.rect(x, y, colW(c), 16).fillAndStroke("#F9FAFB", LINE); doc.fillColor(INK).text(c.label, x + 3, y + 4, { width: colW(c) - 6, align: c.align ?? "left" }); x += colW(c); }
        y += 16;
        doc.font("Sans").fontSize(7.5);
        for (const r of sec.data) {
          ensure(15);
          x = L;
          for (let i = 0; i < cols.length; i++) { const c = cols[i]!; doc.rect(x, y, colW(c), 14).lineWidth(0.4).strokeColor("#E5E7EB").stroke(); doc.fillColor(INK).text(r[i] ?? "", x + 3, y + 3, { width: colW(c) - 6, align: c.align ?? "left" }); x += colW(c); }
          y += 14;
        }
        if (sec.total) {
          ensure(16); x = L;
          doc.font("SansBold").fontSize(8).fillColor(INK);
          for (let i = 0; i < cols.length; i++) { const c = cols[i]!; doc.rect(x, y, colW(c), 16).fillAndStroke("#EAF2FE", LINE); doc.fillColor(INK).text(sec.total[i] ?? "", x + 3, y + 4, { width: colW(c) - 6, align: c.align ?? "left" }); x += colW(c); }
          y += 16;
        }
        y += 8;
      } else if (sec.kind === "note" && sec.note) {
        ensure(20);
        doc.font("Sans").fontSize(8).fillColor(MUTE).text(sec.note, L + 8, y, { width: W - 16 });
        y = doc.y + 8;
      }
    }

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font("Sans").fontSize(7).fillColor(MUTE).text(
        `${d.title}  ·  Generated by Vertofi ${dtNow()}  ·  Page ${i + 1} of ${range.count}`,
        L, 812, { width: W, align: "center" },
      );
    }
    doc.end();
  });
}
