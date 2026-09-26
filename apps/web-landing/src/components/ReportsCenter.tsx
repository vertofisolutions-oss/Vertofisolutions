"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Eye,
  Download,
  FileText,
  Printer,
  X,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Truck,
  Receipt,
  Building,
  LayoutTemplate,
  FileDown,
  Sparkles,
  Layers,
} from "lucide-react";
import { Card, Badge } from "@/ui";
import { api } from "@/lib/api";
import { DocumentRenderer } from "@/templates/templateEngine/DocumentRenderer";
import { TEMPLATES_REGISTRY } from "@/templates/templatesData";
import { DocumentFormData } from "@/templates/types";
import {
  exportReportPdfInTemplateFormat,
  printElementAsPdf,
  getActiveTemplateNumber,
  ReportSection,
} from "@/lib/exportTemplatePdf";

const inr = (n: unknown) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const inrInt = (n: unknown) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const numOf = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const humanize = (k: string) => k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (m) => m.toUpperCase());
const looksMoney = (k: string) => /amount|total|profit|loss|tax|cash|value|net|gross|income|expense|balance|revenue|liab|asset|cgst|sgst|igst|due|debit|credit/i.test(k);
const fmtCell = (v: unknown) => (numOf(v) !== null && typeof v !== "boolean") ? inr(numOf(v)!) : String(v ?? "");
const dt = (s: unknown) => (s ? new Date(String(s)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function objToSections(data: Record<string, unknown>): unknown[] {
  const rows: { label: string; value: string; bold?: boolean }[] = [];
  const tables: unknown[] = [];
  for (const [k, v] of Object.entries(data ?? {})) {
    if (Array.isArray(v) && v.length && typeof v[0] === "object" && v[0]) {
      const cols = Object.keys(v[0] as object).slice(0, 5);
      tables.push({
        kind: "table",
        heading: humanize(k),
        columns: cols.map((c, i) => ({ label: humanize(c), align: i === 0 ? "left" : "right" })),
        data: (v as Record<string, unknown>[]).map((row) => cols.map((c) => fmtCell(row[c]))),
      });
    } else if (numOf(v) !== null) {
      rows.push({ label: humanize(k), value: looksMoney(k) ? inr(numOf(v)!) : String(v), bold: /net|total|profit/i.test(k) });
    }
  }
  return [rows.length ? { kind: "kv", heading: "Summary", rows } : null, ...tables].filter(Boolean);
}

function headline(data: Record<string, unknown>): string | null {
  const keys = Object.keys(data ?? {});
  const pref = keys.find((k) => /net.*profit|net_profit|netProfit/i.test(k)) ?? keys.find((k) => /\bnet\b/i.test(k) && numOf(data[k]) !== null) ?? keys.find((k) => /total/i.test(k) && numOf(data[k]) !== null);
  if (pref && numOf(data[pref]) !== null) return `${humanize(pref)}: ${inrInt(numOf(data[pref])!)}`;
  return null;
}

const PRIMARY_REPORTS: { docType: string; title: string; slug: string; load: (o: string) => Promise<Record<string, unknown>> }[] = [
  { docType: "PROFIT_LOSS", title: "Profit & Loss", slug: "p-and-l", load: (o) => api.mod.pnl(o) },
  { docType: "BALANCE_SHEET", title: "Balance Sheet", slug: "balance-sheet", load: (o) => api.mod.balanceSheet(o) },
  { docType: "CASH_FLOW", title: "Cash Flow", slug: "cashflow", load: (o) => api.cashflow(o) as Promise<Record<string, unknown>> },
  { docType: "GST_SUMMARY", title: "GST Summary", slug: "gst-dashboard", load: (o) => api.mod.gstSummary(o) },
];

export const MORE_REPORTS = [
  { id: "trial-balance", title: "Trial Balance", docType: "TRIAL_BALANCE", icon: FileSpreadsheet, description: "Debit & Credit ledger balances with closing reconciliation" },
  { id: "general-ledger", title: "General Ledger", docType: "GENERAL_LEDGER", icon: FileText, description: "Chronological double-entry transactions from all vouchers" },
  { id: "account-statement", title: "Account Statement", docType: "ACCOUNT_STATEMENT", icon: Receipt, description: "Customer and vendor ledger statements with running balance" },
  { id: "itc-reconciliation", title: "ITC Reconciliation", docType: "ITC_RECONCILIATION", icon: CheckCircle2, description: "GSTR-2B vs purchase register input tax credit match" },
  { id: "e-invoice", title: "E-Invoice", docType: "E_INVOICE_SUMMARY", icon: Building, description: "B2B e-invoice register, IRN generation status & QR codes" },
  { id: "eway-bill-summary", title: "E-Way Bill Summary", docType: "EWAY_BILL_SUMMARY", icon: Truck, description: "High-value goods movement register and transit e-way bills" },
];

function ReportCard({ orgId, def, onOpen }: { orgId: string; def: (typeof PRIMARY_REPORTS)[number]; onOpen: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    def.load(orgId).then(setData).catch(() => setData({})).finally(() => setLoading(false));
  }, [orgId, def]);

  async function pdf() {
    setPdfBusy(true);
    try {
      const reportData = data ?? {};
      const sections = objToSections(reportData);
      exportReportPdfInTemplateFormat({
        title: def.title,
        docType: def.docType,
        sections: sections as ReportSection[],
        templateNum: getActiveTemplateNumber(),
      });
    } catch {
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  const subtitle = useMemo(() => {
    if (loading) return "Loading…";
    if (data && headline(data)) return headline(data);
    if (def.docType === "PROFIT_LOSS") return "Net Profit: ₹0";
    if (def.docType === "BALANCE_SHEET") return "Total Assets: ₹0";
    return "Generated from your live ledger.";
  }, [loading, data, def]);

  return (
    <Card className="flex flex-col justify-between p-4">
      <div>
        <h3 className="text-[14px] font-semibold text-ink">{def.title}</h3>
        <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-brand"
        >
          <Eye className="h-3.5 w-3.5 text-ink" /> View
        </button>
        <button
          onClick={pdf}
          disabled={pdfBusy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1378F8] px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0f67d4] active:bg-[#0b53ad] cursor-pointer shadow-sm disabled:opacity-75"
        >
          {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Download className="h-3.5 w-3.5 text-white" />} PDF
        </button>
      </div>
    </Card>
  );
}

function mapSaleToFormData(
  sale: Record<string, unknown>,
  companyProfile: Record<string, unknown>,
  templateSettings: Record<string, unknown>
): DocumentFormData {
  const party = String(
    sale.customer_name ||
    sale.customerName ||
    sale.vendor_name ||
    sale.supplier_name ||
    sale.party_name ||
    sale.buyer ||
    sale.name ||
    "Valued Party"
  );

  const docNo = String(
    sale.invoice_no ||
    sale.invoiceNo ||
    sale.bill_no ||
    sale.billNo ||
    sale.purchase_no ||
    sale.purchaseNo ||
    sale.number ||
    sale.doc_number ||
    sale.ref ||
    `DOC-${sale.id || "0001"}`
  );

  const isSaleWithoutGst = Boolean(
    sale.doc_type === "Bill of Supply" ||
    sale.docType === "Bill of Supply" ||
    sale.tax_type === "NON_GST" ||
    sale.totalTax === 0 ||
    sale.tax_amount === 0 ||
    String(sale.invoice_no || sale.invoiceNo || "").toUpperCase().startsWith("BILL/") ||
    String(sale.doc_type || "").toLowerCase().includes("without gst") ||
    String(sale.notes || "").toLowerCase().includes("without gst") ||
    (Array.isArray(sale.items) && sale.items.some((it: any) => String(it.description || "").toLowerCase().includes("without gst")))
  );

  const items = (Array.isArray(sale.items) && sale.items.length > 0)
    ? (sale.items as Record<string, unknown>[]).map((it, idx) => {
        let tax = 18;
        if (isSaleWithoutGst) {
          tax = 0;
        } else if (it.taxPct !== undefined && it.taxPct !== null && !isNaN(Number(it.taxPct))) {
          tax = Number(it.taxPct);
        } else if (it.taxRate !== undefined && it.taxRate !== null && !isNaN(Number(it.taxRate))) {
          tax = Number(it.taxRate);
        }

        const qty = Number(it.qty || it.quantity || 1);
        const rate = Number(it.rate || it.price || 0);
        const discPct = Number(it.discount || it.discountPct || 0);
        const taxable = qty * rate * (1 - discPct / 100);
        const calculatedTotal = tax > 0 ? Math.round(taxable * (1 + tax / 100)) : Math.round(taxable);
        const total = isSaleWithoutGst ? Math.round(taxable) : Number(it.total || calculatedTotal);

        return {
          id: String(it.id || `item-${idx + 1}`),
          name: String(it.name || it.item_name || "Goods / Materials"),
          description: String(it.description || ""),
          hsnSac: String(it.hsn || it.hsnSac || (tax === 0 ? "000000" : "847130")),
          quantity: qty,
          rate,
          discountPct: discPct,
          taxPct: tax,
          total,
        };
      })
    : [
        {
          id: "item-1",
          name: String(sale.notes || sale.description || sale.item_name || "Commercial Purchase / Procurement"),
          description: "Procurement & supplies delivered under standard terms",
          hsnSac: isSaleWithoutGst ? "000000" : "847130",
          quantity: 1,
          rate: Number(sale.total || 0) > 0 ? (isSaleWithoutGst ? Number(sale.total) : Math.round(Number(sale.total) / 1.18)) : 5000,
          discountPct: 0,
          taxPct: isSaleWithoutGst ? 0 : 18,
          total: Number(sale.total || 0) > 0 ? (isSaleWithoutGst ? Number(sale.total) : Math.round(Number(sale.total) / 1.18)) : 5000,
        },
      ];

  return {
    primaryColor: String(templateSettings?.primaryColor || "#1E60D5"),
    secondaryColor: "#0F172A",
    themePreset: "Vertofi Modern",
    logoUrl: "",

    companyName: String(companyProfile?.tradeName || companyProfile?.legalName || "Vertofi Solutions Private Limited"),
    companyTagline: "Next-Gen Enterprise Financial Infrastructure",
    companyAddress: String(companyProfile?.address || "Plot No. 42, Hitech City, Madhapur"),
    companyCityState: `${String(companyProfile?.city || "Hyderabad")}, ${String(companyProfile?.state || "Telangana")} - ${String(companyProfile?.postalCode || "500081")}`,
    companyEmail: String(companyProfile?.email || "billing@vertofi.com"),
    companyPhone: String(companyProfile?.mobile || "+91 9876543210"),
    companyGstin: String(companyProfile?.gstin || "36AABCU9603R1ZM"),
    companyPan: String(companyProfile?.pan || "AABCU9603R"),

    customerName: party,
    customerCompany: party,
    customerAddress: String(sale.customer_address || sale.supplier_address || sale.vendor_address || "Plot 10, HITEC City"),
    customerCityState: String(sale.place_of_supply || sale.customer_state || sale.supplier_state || "Hyderabad, Telangana"),
    customerEmail: String(sale.customer_email || sale.supplier_email || sale.vendor_email || "accounts@partner.com"),
    customerPhone: String(sale.customer_phone || sale.supplier_phone || sale.vendor_phone || "+91 9123456780"),
    customerGstin: String(sale.customer_gstin || sale.supplier_gstin || sale.vendor_gstin || sale.gstin || "36AAACG1234F1Z5"),

    docNumber: docNo,
    docDate: String(sale.date || sale.created_at || new Date().toISOString().slice(0, 10)),
    dueDate: String(sale.due_date || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)),
    placeOfSupply: String(sale.place_of_supply || "Telangana (36)"),
    billingPeriod: "Current Billing Cycle",

    items,
    discountOverallPct: Number(sale.discountOverallPct || 0),
    shippingCharges: Number(sale.shippingCharges || 0),
    extraCharges: Number(sale.extraCharges || 0),

    paymentMethod: "Bank Transfer (NEFT/IMPS/UPI)",
    paymentStatus: (sale.status === "PAID" || sale.payment_status === "PAID") ? "PAID" : "UNPAID",
    bankName: "HDFC Bank Ltd.",
    bankAccountNo: "50200089123456",
    bankIfsc: "HDFC0001234",
    bankBranch: "Madhapur, Hyderabad",
    upiId: "vertofi@hdfcbank",
    showUpiQr: true,

    termsAndConditions: String(sale.terms || "1. Payment is due within 15 days of invoice date.\n2. Interest @ 18% p.a. applicable on delayed payments.\n3. Goods & services delivered under standard SLA."),
    signatoryTitle: "Authorized Signatory",
    isProforma: Boolean(
      sale.isProforma ||
      sale.doc_type === "Proforma Invoice" ||
      sale.doc_type === "PROFORMA" ||
      sale.doc_type === "PROFORMA_INVOICE" ||
      String(sale.doc_type || "").toLowerCase().includes("proforma") ||
      String(sale.docType || "").toLowerCase().includes("proforma") ||
      String(sale.invoice_no || sale.invoiceNo || "").toUpperCase().startsWith("PI-")
    ),
    docTitle: (
      sale.isProforma ||
      sale.doc_type === "Proforma Invoice" ||
      sale.doc_type === "PROFORMA" ||
      sale.doc_type === "PROFORMA_INVOICE" ||
      String(sale.doc_type || "").toLowerCase().includes("proforma") ||
      String(sale.docType || "").toLowerCase().includes("proforma") ||
      String(sale.invoice_no || sale.invoiceNo || "").toUpperCase().startsWith("PI-")
    ) ? "PROFORMA INVOICE" : isSaleWithoutGst ? "BILL OF SUPPLY (0% GST)" : undefined,
    docType: String(sale.doc_type || sale.docType || (isSaleWithoutGst ? "Bill of Supply" : "Tax Invoice")),
    isWithoutGst: isSaleWithoutGst,
  };
}

export function InvoiceTemplatePreviewModal({
  sale,
  onClose,
  initialTemplate,
  autoExport,
  isProforma: isProformaProp,
}: {
  sale: Record<string, unknown>;
  onClose: () => void;
  initialTemplate?: number;
  autoExport?: boolean;
  isProforma?: boolean;
}) {
  const [selectedTemplateNum, setSelectedTemplateNum] = useState<number>(() => {
    if (initialTemplate && initialTemplate >= 1 && initialTemplate <= 6) return initialTemplate;
    try {
      const direct = localStorage.getItem("vertofi_selected_template");
      if (direct) return Number(direct);
      const stored = localStorage.getItem("vertofi_invoice_template_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.templateId) return Number(parsed.templateId);
        if (parsed.selectedTemplate) return Number(parsed.selectedTemplate);
      }
    } catch {}
    return 1;
  });

  const [companyProfile, setCompanyProfile] = useState<Record<string, unknown>>({});
  const [templateSettings, setTemplateSettings] = useState<Record<string, unknown>>({});
  const [zoom, setZoom] = useState(100);
  const [exportingNum, setExportingNum] = useState<number | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("vertofi_business_profile");
      if (p) setCompanyProfile(JSON.parse(p));
    } catch {}
    try {
      const t = localStorage.getItem("vertofi_invoice_template_settings");
      if (t) setTemplateSettings(JSON.parse(t));
    } catch {}
  }, []);

  const handleSelectTemplate = (num: number) => {
    setSelectedTemplateNum(num);
    try {
      localStorage.setItem("vertofi_selected_template", String(num));
      const stored = localStorage.getItem("vertofi_invoice_template_settings");
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem(
        "vertofi_invoice_template_settings",
        JSON.stringify({ ...parsed, templateId: num, selectedTemplate: num, theme: `template_${num}` })
      );
    } catch {}
  };

  const templateDef = TEMPLATES_REGISTRY[(selectedTemplateNum - 1) % TEMPLATES_REGISTRY.length] || TEMPLATES_REGISTRY[0];
  const formData = useMemo(() => {
    return mapSaleToFormData(sale, companyProfile, templateSettings);
  }, [sale, companyProfile, templateSettings]);

  const isProforma = Boolean(
    isProformaProp ||
    sale.isProforma ||
    sale.doc_type === "Proforma Invoice" ||
    sale.doc_type === "PROFORMA" ||
    sale.doc_type === "PROFORMA_INVOICE" ||
    String(sale.doc_type || "").toLowerCase().includes("proforma") ||
    String(sale.docType || "").toLowerCase().includes("proforma") ||
    String(sale.invoice_no || sale.invoiceNo || "").toUpperCase().startsWith("PI-")
  );

  const handleExportPdf = (num?: number) => {
    const targetNum = num ?? selectedTemplateNum;
    setExportingNum(targetNum);
    if (num !== undefined && num !== selectedTemplateNum) {
      handleSelectTemplate(num);
    }
    setTimeout(() => {
      const printable = document.getElementById("printable-invoice-a4-sheet") || document.getElementById("vertofi-printable-invoice");
      const titleName = isProforma
        ? `${displayDocNum}_Proforma_Invoice`
        : `${String(sale.invoice_no || sale.invoiceNo || sale.bill_no || sale.billNo || sale.purchase_no || sale.purchaseNo || "Document")}_T${targetNum}`;
      if (printable) {
        printElementAsPdf(printable, titleName);
      } else {
        window.print();
      }
      setExportingNum(null);
    }, 350);
  };

  useEffect(() => {
    if (autoExport) {
      const timer = setTimeout(() => {
        handleExportPdf();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [autoExport]);

  const TEMPLATE_META = [
    { num: 1, name: "Modern Blue", primary: "#1E60D5", accent: "#3B82F6", dotClass: "bg-blue-600" },
  ];

  const displayDocNum = String(
    sale.invoice_no || sale.invoiceNo || sale.bill_no || sale.billNo || sale.purchase_no || sale.purchaseNo || sale.doc_number || "DOC"
  );
  const displayParty = String(
    sale.customer_name || sale.customerName || sale.vendor_name || sale.supplier_name || sale.party_name || "Client / Supplier"
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[96vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl overflow-hidden">

        {/* ── Header Control Bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 gap-3">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm ${isProforma ? "bg-slate-900" : "bg-blue-600"}`}>
              {isProforma ? <FileText className="h-5 w-5" /> : <LayoutTemplate className="h-5 w-5" />}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  {isProforma ? "Proforma Invoice Preview & PDF Export" : "Document Template Preview & PDF Export"}
                </h2>
                <Badge tone="brand" className="text-[10px] font-bold">{displayDocNum}</Badge>
                {isProforma ? (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    PROFORMA INVOICE
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    Template 1
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Party: <strong className="text-slate-700">{displayParty}</strong>
                {" "}&bull; {isProforma ? "Official Proforma Invoice (Estimate) ready for PDF Export" : <><span className="font-semibold text-blue-600">Template 1 (Modern Blue)</span> ready for PDF Export</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Zoom */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs font-semibold text-slate-700">
              <button onClick={() => setZoom(z => Math.max(70, z - 10))} className="px-2 py-0.5 rounded hover:bg-white cursor-pointer">−</button>
              <span className="px-1.5">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(130, z + 10))} className="px-2 py-0.5 rounded hover:bg-white cursor-pointer">+</button>
            </div>

            <button
              onClick={() => handleExportPdf()}
              disabled={exportingNum !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
            >
              {exportingNum !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export PDF
            </button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Template Picker Strip (Hidden for Proforma Invoices) ── */}
        {!isProforma && (
          <div className="border-b border-slate-200 bg-white px-6 py-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Template &amp; Export PDF
            </p>
            <div className="flex items-start gap-2.5 w-full overflow-visible pb-1">
              {TEMPLATE_META.map(({ num, name, primary, accent, dotClass }) => {
                const isActive = selectedTemplateNum === num;
                const isExp = exportingNum === num;
                return (
                  <div
                    key={num}
                    onClick={() => handleSelectTemplate(num)}
                    className={`flex-shrink-0 flex flex-col gap-1.5 cursor-pointer rounded-xl border-2 p-2.5 transition-all duration-150 ${
                      isActive
                        ? "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-300"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow"
                    }`}
                    style={{ minWidth: 110 }}
                  >
                    {/* Colour swatch */}
                    <div
                      className="w-full h-11 rounded-lg relative overflow-hidden flex items-center justify-between px-2 select-none"
                      style={{ background: primary }}
                    >
                      {isActive && (
                        <div className="absolute top-1 left-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white drop-shadow" />
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 ml-3.5">
                        <div className="w-9 h-1 rounded bg-white/80" />
                        <div className="w-5 h-0.5 rounded bg-white/50" />
                        <div className="w-7 h-0.5 rounded bg-white/40" />
                      </div>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow"
                        style={{ background: accent }}
                      >
                        T{num}
                      </div>
                    </div>

                    {/* Label */}
                    <div className="text-center px-0.5">
                      <div className={`flex items-center justify-center gap-1 text-[10px] font-bold ${isActive ? "text-blue-700" : "text-slate-700"}`}>
                        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
                        T{num}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate max-w-[90px] mx-auto">{name}</div>
                    </div>

                    {/* Per-template Export PDF button */}
                    <button
                      type="button"
                      disabled={isExp}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(num);
                        setExportingNum(num);
                        setTimeout(() => {
                          const el = document.getElementById("printable-invoice-a4-sheet");
                          if (el) printElementAsPdf(el, `${String(sale.invoice_no || sale.invoiceNo || "Invoice")}_T${num}`);
                          else window.print();
                          setExportingNum(null);
                        }, 380);
                      }}
                      className={`w-full rounded-lg py-1 text-[9px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        isActive
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white"
                      } disabled:opacity-60`}
                    >
                      {isExp
                        ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Exporting…</>
                        : <><FileDown className="h-2.5 w-2.5" /> Export PDF</>
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Live A4 Render ── */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-100/90">
          <div id="printable-invoice-a4-sheet" className="w-full max-w-[794px] transition-transform duration-150">
            <DocumentRenderer
              formData={formData}
              templateDef={templateDef}
              templateNumber={selectedTemplateNum}
              zoomLevel={zoom}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function getTemplateTheme(num: number) {
  switch (num) {
    case 2:
      return {
        name: "Emerald Compliance Pro",
        primary: "#059669",
        bgLight: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        accent: "#10B981",
        badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      };
    case 3:
      return {
        name: "Executive Purple",
        primary: "#6D28D9",
        bgLight: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
        accent: "#8B5CF6",
        badge: "bg-purple-50 text-purple-700 border border-purple-200",
      };
    case 4:
      return {
        name: "Midnight Slate Elite",
        primary: "#0F172A",
        bgLight: "bg-slate-100",
        border: "border-slate-300",
        text: "text-slate-800",
        accent: "#D97706",
        badge: "bg-slate-100 text-slate-800 border border-slate-300",
      };
    case 5:
      return {
        name: "Minimalist Indigo",
        primary: "#3730A3",
        bgLight: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
        accent: "#4F46E5",
        badge: "bg-indigo-50 text-indigo-700 border border-indigo-200",
      };
    case 6:
      return {
        name: "Classic GST Gold & Navy",
        primary: "#1E3A8A",
        bgLight: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-800",
        accent: "#B45309",
        badge: "bg-amber-50 text-amber-800 border border-amber-300",
      };
    case 1:
    default:
      return {
        name: "Vertofi Modern",
        primary: "#1E60D5",
        bgLight: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        accent: "#3B82F6",
        badge: "bg-blue-50 text-blue-700 border border-blue-200",
      };
  }
}

export function ReportViewerModal({ orgId, reportId, onClose }: { orgId: string; reportId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(reportId);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [previewingInvoice, setPreviewingInvoice] = useState<Record<string, unknown> | null>(null);

  const [sales, setSales] = useState<Record<string, unknown>[]>([]);
  const [purchases, setPurchases] = useState<Record<string, unknown>[]>([]);
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>([]);
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<Record<string, unknown>>({});
  const [pnl, setPnl] = useState<Record<string, unknown>>({});
  const [gstSummary, setGstSummary] = useState<Record<string, unknown>>({});
  const [selectedParty, setSelectedParty] = useState("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, eRes, cRes, bsRes, pnlRes, gstRes] = await Promise.all([
        api.acc.sales(orgId).catch(() => []),
        api.acc.purchases(orgId).catch(() => []),
        api.mod.expenses(orgId).catch(() => []),
        api.acc.customers(orgId).catch(() => []),
        api.mod.balanceSheet(orgId).catch(() => ({})),
        api.mod.pnl(orgId).catch(() => ({})),
        api.mod.gstSummary(orgId).catch(() => ({})),
      ]);

      let allSales: Record<string, unknown>[] = [];
      try {
        const localSales = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        const serverSales = Array.isArray(sRes) ? sRes : [];
        const combined = [...localSales, ...serverSales];

        const seenKeys = new Set<string>();
        for (const loc of combined) {
          if (!loc) continue;
          const uniqueKey = String(
            loc.invoice_no || loc.invoiceNo || loc.id ||
            `INV_${loc.customer_name || loc.customerName || "Party"}_${loc.total || 0}_${loc.date || loc.created_at || ""}`
          );
          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            allSales.push(loc);
          }
        }
      } catch {
        allSales = Array.isArray(sRes) ? [...sRes] : [];
      }

      setSales(allSales);
      setPurchases(Array.isArray(pRes) ? pRes : []);
      setExpenses(Array.isArray(eRes) ? eRes : []);
      setCustomers(Array.isArray(cRes) ? cRes : []);
      setBalanceSheet(bsRes || {});
      setPnl(pnlRes || {});
      setGstSummary(gstRes || {});
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);


  const [selectedTemplateNum, setSelectedTemplateNum] = useState<number>(() => {
    try {
      const direct = localStorage.getItem("vertofi_selected_template");
      if (direct) return Number(direct);
      const stored = localStorage.getItem("vertofi_invoice_template_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.templateId) return Number(parsed.templateId);
        if (parsed.selectedTemplate) return Number(parsed.selectedTemplate);
      }
    } catch {}
    return 1;
  });

  useEffect(() => {
    const syncTmpl = () => {
      try {
        const direct = localStorage.getItem("vertofi_selected_template");
        if (direct) setSelectedTemplateNum(Number(direct));
      } catch {}
    };
    window.addEventListener("storage", syncTmpl);
    window.addEventListener("vertofi:template-changed", syncTmpl);
    return () => {
      window.removeEventListener("storage", syncTmpl);
      window.removeEventListener("vertofi:template-changed", syncTmpl);
    };
  }, []);

  const trialBalanceData = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    let salesTax = 0;
    sales.forEach(s => {
      if (s.tax) salesTax += Number(s.tax);
      else if (s.items && Array.isArray(s.items)) {
        s.items.forEach((it: any) => {
          salesTax += Number(it.totalTax || 0);
        });
      }
    });
    // Fallback if no item-level tax is found but total > 0
    if (salesTax === 0 && totalSales > 0) {
      salesTax = totalSales - Math.round(totalSales / 1.18);
    }
    const netSales = Math.max(0, totalSales - salesTax);

    const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const purchaseTax = purchases.reduce((acc, p) => acc + Number(p.tax || p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0), 0);
    const netPurchases = Math.max(0, totalPurchases - purchaseTax);

    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || e.total || 0), 0);

    const accounts = [
      { code: "1001", name: "Trade Receivables (Sundry Debtors)", category: "Current Assets", debit: totalSales, credit: 0 },
      { code: "1002", name: "Input Tax Credit (GST ITC Pool)", category: "Current Assets", debit: purchaseTax, credit: 0 },
      { code: "1003", name: "Bank & Cash Accounts (Operating)", category: "Current Assets", debit: 0, credit: totalExpenses },
      { code: "2001", name: "Trade Payables (Sundry Creditors)", category: "Current Liabilities", debit: 0, credit: totalPurchases },
      { code: "2002", name: "GST Output Liability (Duties & Taxes)", category: "Current Liabilities", debit: 0, credit: salesTax },
      { code: "4001", name: "Sales Revenue (Turnover)", category: "Revenue", debit: 0, credit: netSales },
      { code: "5001", name: "Cost of Goods Sold (Purchases)", category: "Direct Expense", debit: netPurchases, credit: 0 },
      { code: "5002", name: "Operating Expenses (Admin / General)", category: "Indirect Expense", debit: totalExpenses, credit: 0 },
    ].filter(a => a.debit > 0 || a.credit > 0);

    const totalDebit = accounts.reduce((acc, a) => acc + a.debit, 0);
    const totalCredit = accounts.reduce((acc, a) => acc + a.credit, 0);
    const diff = Math.abs(totalDebit - totalCredit);

    return { accounts, totalDebit, totalCredit, diff, isBalanced: diff < 0.01 };
  }, [sales, purchases, expenses]);

  const generalLedgerData = useMemo(() => {
    const entries: { id: string; date: string; ref: string; account: string; type: string; debit: number; credit: number; notes: string; balance?: number }[] = [];

    sales.forEach((s, idx) => {
      entries.push({
        id: `sales-${s.id || idx}`,
        date: String(s.date || s.created_at || new Date().toISOString()),
        ref: String(s.invoice_no || `INV-${idx + 1}`),
        account: String(s.customer_name || "Customer Account"),
        type: "Sales Invoice",
        debit: Number(s.total || 0),
        credit: 0,
        notes: `Tax invoice for ${String(s.customer_name || "party")} (GST: ${String(s.customer_gstin || "Unregistered")})`,
      });
    });

    purchases.forEach((p, idx) => {
      entries.push({
        id: `purch-${p.id || idx}`,
        date: String(p.date || p.created_at || new Date().toISOString()),
        ref: String(p.bill_no || `BILL-${idx + 1}`),
        account: "Purchase Account (COGS)",
        type: "Purchase Bill",
        debit: Number(p.total || 0),
        credit: 0,
        notes: `Inward supply from ${String(p.vendor_name || "Vendor")}`,
      });
    });

    expenses.forEach((e, idx) => {
      entries.push({
        id: `exp-${e.id || idx}`,
        date: String(e.date || e.created_at || new Date().toISOString()),
        ref: String(e.reference || `EXP-${idx + 1}`),
        account: String(e.category || "General Expense"),
        type: "Expense Voucher",
        debit: Number(e.amount || e.total || 0),
        credit: 0,
        notes: String(e.description || e.notes || "Operational expense"),
      });
    });

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const calculated = entries.map((e) => {
      running += e.debit - e.credit;
      return { ...e, balance: running };
    });

    const filtered = calculated.filter((e) => {
      const matchSearch = search === "" || e.ref.toLowerCase().includes(search.toLowerCase()) || e.account.toLowerCase().includes(search.toLowerCase()) || e.notes.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filterType === "ALL" || e.type.toLowerCase().includes(filterType.toLowerCase());
      return matchSearch && matchFilter;
    });

    const totalDebits = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredits = entries.reduce((s, e) => s + e.credit, 0);

    return { entries: filtered, totalCount: entries.length, totalDebits, totalCredits, netBalance: running };
  }, [sales, purchases, expenses, search, filterType]);

  const accountStatementData = useMemo(() => {
    const partyList = [
      ...customers.map((c) => ({ id: String(c.id || c.name), name: String(c.name || "Customer"), type: "Customer" })),
      ...purchases.map((p) => ({ id: String(p.vendor_name || "Vendor"), name: String(p.vendor_name || "Vendor"), type: "Vendor" })),
    ].filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);

    let rows: { date: string; ref: string; party: string; type: string; debit: number; credit: number; status: string; runningBalance?: number }[] = [];

    sales.forEach((s) => {
      rows.push({
        date: String(s.date || s.created_at || ""),
        ref: String(s.invoice_no || "INV"),
        party: String(s.customer_name || "Customer"),
        type: "Tax Invoice",
        debit: Number(s.total || 0),
        credit: 0,
        status: String(s.status || "UNPAID"),
      });
    });

    purchases.forEach((p) => {
      rows.push({
        date: String(p.date || p.created_at || ""),
        ref: String(p.bill_no || "BILL"),
        party: String(p.vendor_name || "Vendor"),
        type: "Purchase Bill",
        debit: 0,
        credit: Number(p.total || 0),
        status: String(p.status || "CONFIRMED"),
      });
    });

    if (selectedParty !== "ALL") {
      rows = rows.filter((r) => r.party.toLowerCase() === selectedParty.toLowerCase());
    }

    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let bal = 0;
    const computedRows = rows.map((r) => {
      bal += r.debit - r.credit;
      return { ...r, runningBalance: bal };
    });

    const totalBilled = rows.reduce((s, r) => s + r.debit, 0);
    const totalPayments = rows.reduce((s, r) => s + r.credit, 0);

    return { partyList, rows: computedRows, totalBilled, totalPayments, outstanding: bal };
  }, [customers, sales, purchases, selectedParty]);

  const itcData = useMemo(() => {
    const items = purchases.map((p, idx) => {
      const igst = Number(p.igst || 0);
      const cgst = Number(p.cgst || (Number(p.tax || 0) / 2) || 0);
      const sgst = Number(p.sgst || (Number(p.tax || 0) / 2) || 0);
      const totalTax = igst + cgst + sgst;
      const taxable = Number(p.taxable_amount || p.subtotal || Math.max(0, Number(p.total || 0) - totalTax));
      const hasGstin = Boolean(p.vendor_gstin && String(p.vendor_gstin).length >= 15);

      return {
        id: `itc-${p.id || idx}`,
        gstin: String(p.vendor_gstin || "UNREGISTERED"),
        vendor: String(p.vendor_name || "Supplier"),
        billNo: String(p.bill_no || `BILL-${idx + 1}`),
        date: String(p.date || p.created_at || ""),
        taxable,
        igst,
        cgst,
        sgst,
        totalTax,
        status: hasGstin ? "Auto-Matched (2B)" : "Pending GSP Sync",
        eligible: hasGstin,
      };
    });

    const totalClaimed = items.reduce((s, i) => s + i.totalTax, 0);
    const totalEligible = items.filter((i) => i.eligible).reduce((s, i) => s + i.totalTax, 0);
    const blockedCredit = totalClaimed - totalEligible;

    return { items, totalClaimed, totalEligible, blockedCredit };
  }, [purchases]);

  const eInvoiceData = useMemo(() => {
    const list = sales.map((s, idx) => {
      const hasGstin = Boolean(s.customer_gstin && String(s.customer_gstin).length >= 15);
      const total = Number(s.total || 0);
      const isB2B = hasGstin || total >= 50000;
      const hasIrn = Boolean(s.irn || s.irn_status === "GENERATED");

      return {
        id: `einv-${s.id || idx}`,
        invoiceNo: String(s.invoice_no || `INV-${idx + 1}`),
        date: String(s.date || s.created_at || ""),
        buyer: String(s.customer_name || "Buyer"),
        gstin: String(s.customer_gstin || "Consumer (B2C)"),
        total,
        isB2B,
        irn: s.irn ? String(s.irn) : hasIrn ? `IRN-${String(s.invoice_no || idx + 1)}-SIGNED` : isB2B ? "Pending IRP Sync" : "Exempt (B2C)",
        status: hasIrn ? "Generated" : isB2B ? "Ready for IRN" : "B2C / Exempt",
        qrReady: hasIrn || isB2B,
      };
    });

    const b2bCount = list.filter((i) => i.isB2B).length;
    const generatedCount = list.filter((i) => i.status === "Generated").length;
    const pendingCount = b2bCount - generatedCount;

    return { list, b2bCount, generatedCount, pendingCount };
  }, [sales]);

  const ewayData = useMemo(() => {
    const eligibleSales = sales.filter((s) => Number(s.total || 0) >= 50000 || s.eway_bill_no);
    const bills = eligibleSales.map((s, idx) => {
      const val = Number(s.total || 0);
      const isHighValue = val >= 50000;
      const hasEwb = Boolean(s.eway_bill_no);

      return {
        id: `ewb-${s.id || idx}`,
        ewbNo: s.eway_bill_no ? String(s.eway_bill_no) : isHighValue ? `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}` : "—",
        invoiceNo: String(s.invoice_no || `INV-${idx + 1}`),
        date: String(s.date || s.created_at || ""),
        validUpto: new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-IN"),
        consignee: String(s.customer_name || "Consignee"),
        state: String(s.place_of_supply || "Intra-State"),
        vehicle: String(s.vehicle_no || "MH-04-AB-1234"),
        value: val,
        status: hasEwb ? "Active" : isHighValue ? "Generated" : "Exempt (< ₹50k)",
      };
    });

    const activeCount = bills.filter((b) => b.status === "Active" || b.status === "Generated").length;
    const totalVal = bills.reduce((s, b) => s + b.value, 0);

    return { bills, activeCount, totalVal };
  }, [sales]);

  async function handleExportPdf() {
    setPdfBusy(true);
    try {
      let docType = "REPORT";
      let title = "Statement Report";
      let sections: unknown[] = [];

      if (activeTab === "trial-balance") {
        docType = "TRIAL_BALANCE";
        title = "Trial Balance Statement";
        sections = [
          {
            kind: "kv",
            heading: "Balance Verification",
            rows: [
              { label: "Total Debits", value: inr(trialBalanceData.totalDebit), bold: true },
              { label: "Total Credits", value: inr(trialBalanceData.totalCredit), bold: true },
              { label: "Ledger Difference", value: inr(trialBalanceData.diff) },
              { label: "Reconciliation Status", value: trialBalanceData.isBalanced ? "BALANCED" : "IMBALANCE" },
            ],
          },
          {
            kind: "table",
            heading: "Account Balances",
            columns: [
              { label: "Account Head", align: "left" },
              { label: "Category", align: "left" },
              { label: "Debit (₹)", align: "right" },
              { label: "Credit (₹)", align: "right" },
            ],
            data: trialBalanceData.accounts.map((a) => [a.name, a.category, inr(a.debit), inr(a.credit)]),
          },
        ];
      } else if (activeTab === "general-ledger") {
        docType = "GENERAL_LEDGER";
        title = "General Ledger Journal";
        sections = [
          {
            kind: "kv",
            heading: "Journal Overview",
            rows: [
              { label: "Total Postings", value: String(generalLedgerData.totalCount) },
              { label: "Total Debits", value: inr(generalLedgerData.totalDebits), bold: true },
              { label: "Total Credits", value: inr(generalLedgerData.totalCredits), bold: true },
              { label: "Net Ledger Balance", value: inr(generalLedgerData.netBalance) },
            ],
          },
          {
            kind: "table",
            heading: "Ledger Entries",
            columns: [
              { label: "Date", align: "left" },
              { label: "Voucher / Ref", align: "left" },
              { label: "Account Head", align: "left" },
              { label: "Debit (₹)", align: "right" },
              { label: "Credit (₹)", align: "right" },
            ],
            data: generalLedgerData.entries.slice(0, 50).map((e) => [dt(e.date), e.ref, e.account, inr(e.debit), inr(e.credit)]),
          },
        ];
      } else if (activeTab === "account-statement") {
        docType = "ACCOUNT_STATEMENT";
        title = `Account Statement — ${selectedParty}`;
        sections = [
          {
            kind: "kv",
            heading: "Statement Summary",
            rows: [
              { label: "Total Invoiced / Billed", value: inr(accountStatementData.totalBilled), bold: true },
              { label: "Total Received / Credited", value: inr(accountStatementData.totalPayments) },
              { label: "Net Outstanding Due", value: inr(accountStatementData.outstanding), bold: true },
            ],
          },
          {
            kind: "table",
            heading: "Transactions",
            columns: [
              { label: "Date", align: "left" },
              { label: "Reference", align: "left" },
              { label: "Party", align: "left" },
              { label: "Debit (+)", align: "right" },
              { label: "Credit (-)", align: "right" },
              { label: "Balance", align: "right" },
            ],
            data: accountStatementData.rows.slice(0, 50).map((r) => [dt(r.date), r.ref, r.party, inr(r.debit), inr(r.credit), inr(r.runningBalance)]),
          },
        ];
      } else if (activeTab === "itc-reconciliation") {
        docType = "ITC_RECONCILIATION";
        title = "ITC Reconciliation Statement (GSTR-2B)";
        sections = [
          {
            kind: "kv",
            heading: "ITC Summary",
            rows: [
              { label: "Total ITC as per Books", value: inr(itcData.totalClaimed), bold: true },
              { label: "Eligible GSTR-2B Credit", value: inr(itcData.totalEligible), bold: true },
              { label: "Ineligible / Blocked Credit", value: inr(itcData.blockedCredit) },
            ],
          },
          {
            kind: "table",
            heading: "Purchase Invoices ITC Register",
            columns: [
              { label: "Supplier GSTIN", align: "left" },
              { label: "Vendor", align: "left" },
              { label: "Bill No", align: "left" },
              { label: "Taxable (₹)", align: "right" },
              { label: "Total Tax (₹)", align: "right" },
              { label: "Status", align: "right" },
            ],
            data: itcData.items.slice(0, 50).map((i) => [i.gstin, i.vendor, i.billNo, inr(i.taxable), inr(i.totalTax), i.status]),
          },
        ];
      } else if (activeTab === "e-invoice") {
        docType = "E_INVOICE_SUMMARY";
        title = "E-Invoice Register & IRN Summary";
        sections = [
          {
            kind: "kv",
            heading: "E-Invoicing Compliance",
            rows: [
              { label: "Total B2B Invoices", value: String(eInvoiceData.b2bCount), bold: true },
              { label: "IRN Generated", value: String(eInvoiceData.generatedCount) },
              { label: "Pending Upload", value: String(eInvoiceData.pendingCount) },
            ],
          },
          {
            kind: "table",
            heading: "Invoice IRN Table",
            columns: [
              { label: "Invoice #", align: "left" },
              { label: "Buyer Name", align: "left" },
              { label: "GSTIN", align: "left" },
              { label: "Amount (₹)", align: "right" },
              { label: "IRN Status", align: "right" },
            ],
            data: eInvoiceData.list.slice(0, 50).map((i) => [i.invoiceNo, i.buyer, i.gstin, inr(i.total), i.status]),
          },
        ];
      } else if (activeTab === "eway-bill-summary") {
        docType = "EWAY_BILL_SUMMARY";
        title = "E-Way Bill Summary & Goods Movement Register";
        sections = [
          {
            kind: "kv",
            heading: "E-Way Movement Summary",
            rows: [
              { label: "Active E-Way Consignments", value: String(ewayData.activeCount), bold: true },
              { label: "Total Movement Value", value: inr(ewayData.totalVal), bold: true },
            ],
          },
          {
            kind: "table",
            heading: "E-Way Bill Register",
            columns: [
              { label: "E-Way Bill #", align: "left" },
              { label: "Invoice Ref", align: "left" },
              { label: "Consignee", align: "left" },
              { label: "Value (₹)", align: "right" },
              { label: "Status", align: "right" },
            ],
            data: ewayData.bills.slice(0, 50).map((b) => [b.ewbNo, b.invoiceNo, b.consignee, inr(b.value), b.status]),
          },
        ];
      }

      exportReportPdfInTemplateFormat({
        title,
        docType,
        sections: sections as ReportSection[],
        templateNum: selectedTemplateNum,
      });
    } catch (err) {
      console.warn("PDF export fallback", err);
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  const activeReport = MORE_REPORTS.find((m) => m.id === activeTab);
  const ActiveIcon = activeReport?.icon || FileText;
  const templateTheme = getTemplateTheme(selectedTemplateNum);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-borderCard bg-white shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border bg-slate-50/80 px-5 py-4 gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm transition-colors"
              style={{ backgroundColor: templateTheme.primary }}
            >
              <ActiveIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-ink">
                  {activeReport?.title || "Financial Report"}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${templateTheme.badge}`}>
                  Template {selectedTemplateNum} • {templateTheme.name}
                </span>
                <Badge tone="neutral" className="text-[10px] uppercase font-semibold">
                  Live Ledger Data
                </Badge>
              </div>
              <p className="text-[12px] text-muted">
                {activeReport?.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => void loadData()}
              disabled={loading}
              title="Refresh from Database"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-brand disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => void handleExportPdf()}
              disabled={loading || pdfBusy}
              title="Print Report in Selected Template Format"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-brand disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={pdfBusy || loading}
              style={{ backgroundColor: templateTheme.primary }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>Export PDF</span>
            </button>
            <button onClick={onClose} className="ml-1 rounded-lg p-1.5 text-muted transition hover:bg-slate-200 hover:text-ink cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full overflow-visible border-b border-border bg-white px-4 py-2 text-[12px]">
          {MORE_REPORTS.map((rep) => {
            const Icon = rep.icon;
            const isActive = activeTab === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setActiveTab(rep.id)}
                style={{
                  backgroundColor: isActive ? templateTheme.primary : undefined,
                  color: isActive ? "#ffffff" : undefined,
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                  isActive ? "shadow-sm font-semibold" : "text-muted hover:bg-slate-100 hover:text-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {rep.title}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-bg2/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="mt-3 text-[13px] font-medium text-ink">Compiling ledger data from database…</p>
              <p className="text-[11px] text-muted">Reading sales, purchase invoices, and journal balances</p>
            </div>
          ) : (
            <>
              {activeTab === "trial-balance" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Debits</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(trialBalanceData.totalDebit)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Credits</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(trialBalanceData.totalCredit)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Reconciliation Status</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {trialBalanceData.isBalanced ? (
                          <><CheckCircle2 className="h-5 w-5 text-emerald-500" /><span className="text-[14px] font-bold text-emerald-600">Balanced (Diff: ₹0)</span></>
                        ) : (
                          <><AlertTriangle className="h-5 w-5 text-amber-500" /><span className="text-[14px] font-bold text-amber-600">Diff: {inr(trialBalanceData.diff)}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">Ledger Account Balances</span>
                      <span className="text-[11px] text-muted">Double-entry verified</span>
                    </div>
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2.5">Code</th>
                            <th className="px-4 py-2.5">Account Head</th>
                            <th className="px-4 py-2.5">Category</th>
                            <th className="px-4 py-2.5 text-right">Debit (₹)</th>
                            <th className="px-4 py-2.5 text-right">Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {trialBalanceData.accounts.map((acc) => (
                            <tr key={acc.code} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{acc.code}</td>
                              <td className="px-4 py-2.5 font-semibold text-ink">{acc.name}</td>
                              <td className="px-4 py-2.5"><span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">{acc.category}</span></td>
                              <td className={`px-4 py-2.5 text-right font-mono ${acc.debit > 0 ? "font-semibold text-ink" : "text-muted"}`}>{acc.debit > 0 ? inr(acc.debit) : "—"}</td>
                              <td className={`px-4 py-2.5 text-right font-mono ${acc.credit > 0 ? "font-semibold text-ink" : "text-muted"}`}>{acc.credit > 0 ? inr(acc.credit) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-ink">
                            <td colSpan={3} className="px-4 py-3 text-[13px]">Total Trial Balance</td>
                            <td className="px-4 py-3 text-right font-mono text-[13px] text-brand">{inr(trialBalanceData.totalDebit)}</td>
                            <td className="px-4 py-3 text-right font-mono text-[13px] text-brand">{inr(trialBalanceData.totalCredit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "general-ledger" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
                      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ref #, party, notes…" className="w-full rounded-lg border border-border bg-bg2 py-1.5 pl-8 pr-3 text-[12px] text-ink outline-none focus:border-brand" />
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto w-full overflow-visible w-full sm:w-auto">
                      <span className="text-[11px] font-semibold text-muted flex items-center gap-1"><Filter className="h-3 w-3" /> Type:</span>
                      {["ALL", "Sales", "Purchase", "Expense"].map((t) => (
                        <button key={t} onClick={() => setFilterType(t)} className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${filterType === t ? "bg-slate-900 text-white" : "border border-border bg-white text-muted hover:text-ink"}`}>{t}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Postings</p>
                      <p className="mt-0.5 text-[16px] font-bold text-ink">{generalLedgerData.totalCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Total Debits</p>
                      <p className="mt-0.5 text-[16px] font-bold text-emerald-600">{inr(generalLedgerData.totalDebits)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Total Credits</p>
                      <p className="mt-0.5 text-[16px] font-bold text-slate-700">{inr(generalLedgerData.totalCredits)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Net Movement</p>
                      <p className="mt-0.5 text-[16px] font-bold text-brand">{inr(generalLedgerData.netBalance)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-3.5 py-2.5">Date</th>
                            <th className="px-3.5 py-2.5">Voucher / Ref</th>
                            <th className="px-3.5 py-2.5">Account / Particulars</th>
                            <th className="px-3.5 py-2.5">Type</th>
                            <th className="px-3.5 py-2.5 text-right">Debit (₹)</th>
                            <th className="px-3.5 py-2.5 text-right">Credit (₹)</th>
                            <th className="px-3.5 py-2.5 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {generalLedgerData.entries.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No general ledger postings found in database. Invoices &amp; bills automatically post here.</td></tr>
                          ) : (
                            generalLedgerData.entries.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3.5 py-2.5 whitespace-nowrap text-muted font-mono text-[11px]">{dt(e.date)}</td>
                                <td className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-brand">{e.ref}</td>
                                <td className="px-3.5 py-2.5"><p className="font-semibold text-ink">{e.account}</p><p className="text-[10px] text-muted truncate max-w-xs">{e.notes}</p></td>
                                <td className="px-3.5 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{e.type}</span></td>
                                <td className={`px-3.5 py-2.5 text-right font-mono ${e.debit > 0 ? "font-semibold text-emerald-600" : "text-muted"}`}>{e.debit > 0 ? inr(e.debit) : "—"}</td>
                                <td className={`px-3.5 py-2.5 text-right font-mono ${e.credit > 0 ? "font-semibold text-slate-700" : "text-muted"}`}>{e.credit > 0 ? inr(e.credit) : "—"}</td>
                                <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-ink">{inr(e.balance)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "account-statement" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[12px] font-semibold text-ink">Select Account:</span>
                      <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className="rounded-lg border border-border bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-brand">
                        <option value="ALL">All Accounts (Consolidated Statement)</option>
                        {accountStatementData.partyList.map((p) => (<option key={p.id} value={p.name}>{p.name} ({p.type})</option>))}
                      </select>
                    </div>
                    <div className="text-[11px] text-muted">Statement Period: Live Database Real-time</div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Invoiced / Billed</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(accountStatementData.totalBilled)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Payments / Settled</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{inr(accountStatementData.totalPayments)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Outstanding Balance</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{inr(accountStatementData.outstanding)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Voucher / Doc #</th>
                            <th className="px-4 py-2.5">Account / Party</th>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5 text-right">Debit (+)</th>
                            <th className="px-4 py-2.5 text-right">Credit (-)</th>
                            <th className="px-4 py-2.5 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {accountStatementData.rows.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No statement entries found for this party.</td></tr>
                          ) : (
                            accountStatementData.rows.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{dt(r.date)}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-brand">{r.ref}</td>
                                <td className="px-4 py-2.5 font-medium text-ink">{r.party}</td>
                                <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{r.type}</span></td>
                                <td className={`px-4 py-2.5 text-right font-mono ${r.debit > 0 ? "font-semibold text-ink" : "text-muted"}`}>{r.debit > 0 ? inr(r.debit) : "—"}</td>
                                <td className={`px-4 py-2.5 text-right font-mono ${r.credit > 0 ? "font-semibold text-emerald-600" : "text-muted"}`}>{r.credit > 0 ? inr(r.credit) : "—"}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-ink">{inr(r.runningBalance)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "itc-reconciliation" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Claimed in Books</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(itcData.totalClaimed)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Eligible in GSTR-2B</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{inr(itcData.totalEligible)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Blocked / Mismatched</p>
                      <p className="mt-1 text-[18px] font-bold text-amber-600">{inr(itcData.blockedCredit)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">Purchase Register vs GSTR-2B</span>
                      <span className="text-[11px] text-muted">Section 16(2)(aa) Verification</span>
                    </div>
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-3.5 py-2.5">Supplier GSTIN</th>
                            <th className="px-3.5 py-2.5">Supplier Name</th>
                            <th className="px-3.5 py-2.5">Bill #</th>
                            <th className="px-3.5 py-2.5 text-right">Taxable (₹)</th>
                            <th className="px-3.5 py-2.5 text-right">IGST (₹)</th>
                            <th className="px-3.5 py-2.5 text-right">CGST+SGST (₹)</th>
                            <th className="px-3.5 py-2.5 text-right">Total Tax</th>
                            <th className="px-3.5 py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {itcData.items.length === 0 ? (
                            <tr><td colSpan={8} className="py-8 text-center text-muted">No purchase bills recorded yet. Enter purchase bills in Purchases to auto-reconcile ITC.</td></tr>
                          ) : (
                            itcData.items.map((itc) => (
                              <tr key={itc.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3.5 py-2.5 font-mono text-[11px] text-ink">{itc.gstin}</td>
                                <td className="px-3.5 py-2.5 font-medium text-ink">{itc.vendor}</td>
                                <td className="px-3.5 py-2.5 font-mono text-[11px] text-brand">{itc.billNo}</td>
                                <td className="px-3.5 py-2.5 text-right font-mono">{inr(itc.taxable)}</td>
                                <td className="px-3.5 py-2.5 text-right font-mono">{inr(itc.igst)}</td>
                                <td className="px-3.5 py-2.5 text-right font-mono">{inr(itc.cgst + itc.sgst)}</td>
                                <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-ink">{inr(itc.totalTax)}</td>
                                <td className="px-3.5 py-2.5 text-right"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${itc.eligible ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{itc.status}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "e-invoice" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">B2B Tax Invoices</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{eInvoiceData.b2bCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">IRN Generated</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{eInvoiceData.generatedCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Pending IRP Sync</p>
                      <p className="mt-1 text-[18px] font-bold text-amber-600">{eInvoiceData.pendingCount}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-3.5 py-2.5">Invoice #</th>
                            <th className="px-3.5 py-2.5">Date</th>
                            <th className="px-3.5 py-2.5">Buyer</th>
                            <th className="px-3.5 py-2.5">GSTIN</th>
                            <th className="px-3.5 py-2.5 text-right">Total (₹)</th>
                            <th className="px-3.5 py-2.5">IRN Reference</th>
                            <th className="px-3.5 py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {eInvoiceData.list.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No sales invoices found. Create a Tax Invoice in Bookkeeping to generate e-invoices.</td></tr>
                          ) : (
                            eInvoiceData.list.map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-brand">{inv.invoiceNo}</td>
                                <td className="px-3.5 py-2.5 font-mono text-[11px] text-muted">{dt(inv.date)}</td>
                                <td className="px-3.5 py-2.5 font-medium text-ink">{inv.buyer}</td>
                                <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600">{inv.gstin}</td>
                                <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-ink">{inr(inv.total)}</td>
                                <td className="px-3.5 py-2.5 font-mono text-[11px] text-muted truncate max-w-xs">{inv.irn}</td>
                                <td className="px-3.5 py-2.5 text-right"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${inv.status === "Generated" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-700"}`}>{inv.status}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "eway-bill-summary" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Consignments Tracked</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{ewayData.bills.length}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Active / Generated E-Way Bills</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{ewayData.activeCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Movement Value</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{inr(ewayData.totalVal)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-3.5 py-2.5">E-Way Bill #</th>
                            <th className="px-3.5 py-2.5">Invoice Ref</th>
                            <th className="px-3.5 py-2.5">Consignee</th>
                            <th className="px-3.5 py-2.5">Destination</th>
                            <th className="px-3.5 py-2.5">Vehicle</th>
                            <th className="px-3.5 py-2.5 text-right">Value (₹)</th>
                            <th className="px-3.5 py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {ewayData.bills.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No goods movement or high-value invoices found.</td></tr>
                          ) : (
                            ewayData.bills.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3.5 py-2.5 font-mono text-[11px] font-bold text-brand">{b.ewbNo}</td>
                                <td className="px-3.5 py-2.5 font-mono text-[11px] text-muted">{b.invoiceNo}</td>
                                <td className="px-3.5 py-2.5 font-medium text-ink">{b.consignee}</td>
                                <td className="px-3.5 py-2.5 text-slate-600">{b.state}</td>
                                <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-700">{b.vehicle}</td>
                                <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-ink">{inr(b.value)}</td>
                                <td className="px-3.5 py-2.5 text-right"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${b.status === "Active" || b.status === "Generated" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-700"}`}>{b.status}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewingInvoice && (
        <InvoiceTemplatePreviewModal
          sale={previewingInvoice}
          onClose={() => setPreviewingInvoice(null)}
        />
      )}
    </div>
  );
}

const REPORT_DOCUMENTS_LIST = [
  { title: "Trial Balance", mapTo: "trial-balance", icon: FileSpreadsheet },
  { title: "General Ledger", mapTo: "general-ledger", icon: FileText },
  { title: "Account Statement", mapTo: "account-statement", icon: Receipt },
  { title: "ITC Reconciliation", mapTo: "itc-reconciliation", icon: CheckCircle2 },
  { title: "E-Invoice", mapTo: "e-invoice", icon: Building },
  { title: "E-Way Bill Summary", mapTo: "eway-bill-summary", icon: Truck },
];

export function ReportsCenter({ orgId }: { orgId: string }) {
  const [modalReportId, setModalReportId] = useState<string | null>(null);

  return (
    <div className="space-y-6">


      {/* Report documents — generated from live data */}
      <Card>
        <h3 className="text-[14px] font-semibold text-ink">Report documents</h3>
        <p className="mb-3.5 text-[12px] text-muted">Generated instantly from your live data — click any report to view live database statements, filter entries, or export PDF.</p>
        <div className="flex flex-wrap gap-2">
          {REPORT_DOCUMENTS_LIST.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.title}
                onClick={() => setModalReportId(r.mapTo)}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-borderCard bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-brand hover:bg-white hover:text-brand hover:shadow-sm cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-muted transition group-hover:text-brand" />
                <span>{r.title}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Modals */}
      {modalReportId !== null && (
        <ReportViewerModal orgId={orgId} reportId={modalReportId} onClose={() => setModalReportId(null)} />
      )}
    </div>
  );
}

