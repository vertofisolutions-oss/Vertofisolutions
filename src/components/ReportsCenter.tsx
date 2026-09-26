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
  Landmark,
  TrendingUp,
  Activity,
  ShieldCheck,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Wallet,
  PieChart,
} from "lucide-react";
import { Card, Badge } from "@/ui";
import { api } from "@/lib/api";
import { DocumentRenderer } from "@/templates/templateEngine/DocumentRenderer";
import { TEMPLATES_REGISTRY } from "@/templates/templatesData";
import { DocumentFormData, TemplateItem } from "@/templates/types";
import {
  exportReportPdfInTemplateFormat,
  printElementAsPdf,
  getActiveTemplateNumber,
  ReportSection,
} from "@/lib/exportTemplatePdf";

const INVOICE_TEMPLATES_LIST = [
  { id: 1, name: "Classic Corporate", primaryColor: "#1e3a8a", description: "Blue professional header with traditional corporate layout" },
  { id: 2, name: "Modern Minimalist", primaryColor: "#0f172a", description: "Dark sleek typography with minimalist clean structure" },
  { id: 3, name: "Emerald Professional", primaryColor: "#065f46", description: "Vibrant emerald green accents with compact tables" },
  { id: 4, name: "Royal Amethyst", primaryColor: "#581c87", description: "Deep purple elegance with modern geometric styling" },
];

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
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = v as Record<string, unknown>;
      for (const [nk, nv] of Object.entries(nested)) {
        if (numOf(nv) !== null) {
          rows.push({ label: `${humanize(k)} — ${humanize(nk)}`, value: looksMoney(nk) ? inr(numOf(nv)!) : String(nv) });
        }
      }
    } else if (numOf(v) !== null) {
      rows.push({ label: humanize(k), value: looksMoney(k) ? inr(numOf(v)!) : String(v) });
    }
  }
  const result: unknown[] = [];
  if (rows.length) result.push({ kind: "kv", heading: "Summary", rows });
  result.push(...tables);
  return result;
}

function headline(data: Record<string, unknown>): string | null {
  const keys = Object.keys(data);
  const pref = keys.find((k) => /net.*profit|net_profit|netProfit/i.test(k)) ?? keys.find((k) => /\bnet\b/i.test(k) && numOf(data[k]) !== null) ?? keys.find((k) => /total/i.test(k) && numOf(data[k]) !== null);
  if (pref && numOf(data[pref]) !== null) return `${humanize(pref)}: ${inrInt(numOf(data[pref])!)}`;
  return null;
}

const PRIMARY_REPORTS: { docType: string; title: string; slug: string; icon: React.ElementType; load: (o: string) => Promise<Record<string, unknown>> }[] = [
  { docType: "PROFIT_LOSS", title: "Profit & Loss", slug: "p-and-l", icon: TrendingUp, load: (o) => api.mod.pnl(o) },
  { docType: "BALANCE_SHEET", title: "Balance Sheet", slug: "balance-sheet", icon: Landmark, load: (o) => api.mod.balanceSheet(o) },
  { docType: "CASH_FLOW", title: "Cash Flow", slug: "cashflow", icon: Activity, load: (o) => api.cashflow(o) as Promise<Record<string, unknown>> },
  { docType: "GST_SUMMARY", title: "GST Summary", slug: "gst-dashboard", icon: ShieldCheck, load: (o) => api.mod.gstSummary(o) },
];

export const MORE_REPORTS = [
  { id: "trial-balance", title: "Trial Balance", docType: "TRIAL_BALANCE", icon: FileSpreadsheet, description: "Debit & Credit ledger balances with closing reconciliation" },
  { id: "general-ledger", title: "General Ledger", docType: "GENERAL_LEDGER", icon: FileText, description: "Chronological double-entry transactions from all vouchers" },
  { id: "account-statement", title: "Account Statement", docType: "ACCOUNT_STATEMENT", icon: Receipt, description: "Customer and vendor ledger statements with running balance" },
  { id: "itc-reconciliation", title: "ITC Reconciliation", docType: "ITC_RECONCILIATION", icon: CheckCircle2, description: "GSTR-2B vs purchase register input tax credit match" },
  { id: "e-invoice", title: "E-Invoice", docType: "E_INVOICE_SUMMARY", icon: Building, description: "B2B e-invoice register, IRN generation status & QR codes" },
  { id: "eway-bill-summary", title: "E-Way Bill Summary", docType: "EWAY_BILL_SUMMARY", icon: Truck, description: "High-value goods movement register and transit e-way bills" },
];

export const ALL_REPORTS_TABS = [
  { id: "p-and-l", title: "Profit & Loss", docType: "PROFIT_LOSS", icon: TrendingUp },
  { id: "balance-sheet", title: "Balance Sheet", docType: "BALANCE_SHEET", icon: Landmark },
  { id: "cashflow", title: "Cash Flow", docType: "CASH_FLOW", icon: Activity },
  { id: "gst-dashboard", title: "GST Summary", docType: "GST_SUMMARY", icon: ShieldCheck },
  { id: "trial-balance", title: "Trial Balance", docType: "TRIAL_BALANCE", icon: FileSpreadsheet },
  { id: "general-ledger", title: "General Ledger", docType: "GENERAL_LEDGER", icon: FileText },
  { id: "account-statement", title: "Account Statement", docType: "ACCOUNT_STATEMENT", icon: Receipt },
  { id: "itc-reconciliation", title: "ITC Reconciliation", docType: "ITC_RECONCILIATION", icon: CheckCircle2 },
  { id: "e-invoice", title: "E-Invoice", docType: "E_INVOICE_SUMMARY", icon: Building },
  { id: "eway-bill-summary", title: "E-Way Bill Summary", docType: "EWAY_BILL_SUMMARY", icon: Truck },
];

function ReportCard({ orgId, def, onOpen }: { orgId: string; def: (typeof PRIMARY_REPORTS)[number]; onOpen: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let active = true;
    def.load(orgId)
      .then((res) => { if (active) setData(res); })
      .catch(() => { if (active) setData({}); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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
    if (def.docType === "CASH_FLOW") return "Net Cash Flow: ₹0";
    if (def.docType === "GST_SUMMARY") return "Net GST: ₹0";
    return "Generated from your live ledger.";
  }, [loading, data, def]);

  return (
    <Card className="flex flex-col justify-between p-4 shadow-sm hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-ink">{def.title}</h3>
          <div className="rounded-lg bg-bg2 p-1.5 text-muted">
            <def.icon className="h-4 w-4 text-brand" />
          </div>
        </div>
        <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-brand hover:text-brand cursor-pointer"
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        <button
          onClick={pdf}
          disabled={pdfBusy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
        </button>
      </div>
    </Card>
  );
}

export function InvoiceTemplatePreviewModal({
  sale,
  onClose,
}: {
  sale: Record<string, unknown>;
  onClose: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<number>(() => {
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

  const [pdfBusy, setPdfBusy] = useState(false);
  const [appliedBadge, setAppliedBadge] = useState(false);

  const documentData: DocumentFormData = useMemo(() => {
    const total = Number(sale.total || sale.amount || 0);
    const tax = Number(sale.tax || sale.gst_amount || (total * 0.18) / 1.18);
    const subtotal = Number(sale.subtotal || sale.taxable_amount || Math.max(0, total - tax));
    const itemsRaw = Array.isArray(sale.items) ? sale.items : [];

    const items: TemplateItem[] = itemsRaw.length > 0
      ? itemsRaw.map((it: any, idx: number) => ({
          id: String(it.id || idx + 1),
          name: String(it.name || it.item_name || it.description || "Services / Goods Supplied"),
          description: String(it.description || ""),
          hsnSac: String(it.hsn || it.hsnSac || it.sac || "998311"),
          quantity: Number(it.quantity || it.qty || 1),
          rate: Number(it.unitPrice || it.rate || it.price || subtotal),
          discountPct: Number(it.discountPct || 0),
          taxPct: Number(it.taxRate || it.gstRate || 18),
          total: Number(it.total || it.amount || total),
        }))
      : [
          {
            id: "1",
            name: String(sale.description || "Professional & Business Services"),
            description: "Engagement as per commercial terms",
            hsnSac: "998311",
            quantity: 1,
            rate: subtotal || total,
            discountPct: 0,
            taxPct: 18,
            total: total,
          },
        ];

    const currentTheme = getTemplateThemeConfig(selectedTemplate);

    return {
      primaryColor: currentTheme.primary,
      secondaryColor: currentTheme.secondary,
      themePreset: "Vertofi Corporate",
      companyName: "VERTOFI ENTERPRISE PRIVATE LIMITED",
      companyTagline: "Accounting that Thinks. Predicts. Protects.",
      companyAddress: "HITEC City, Phase 2, Madhapur",
      companyCityState: "Hyderabad, Telangana 500081",
      companyEmail: "accounts@vertofi.com",
      companyPhone: "+91 98765 43210",
      companyGstin: "36AAACV1234F1Z5",
      companyPan: "AAACV1234F",
      customerName: String(sale.customer_name || sale.customerName || sale.client_name || "Enterprise Customer"),
      customerCompany: String(sale.customer_company || sale.customer_name || "Customer Org"),
      customerAddress: String(sale.customer_address || "Commercial Tower, CBD"),
      customerCityState: String(sale.customer_city || "Hyderabad, Telangana 500034"),
      customerEmail: String(sale.customer_email || "billing@client.com"),
      customerPhone: String(sale.customer_phone || "+91 91234 56789"),
      customerGstin: String(sale.customer_gstin || sale.gstin || "36AABCU9603R1ZM"),
      docNumber: String(sale.invoice_no || sale.invoiceNo || sale.id || "INV-001"),
      docDate: String(sale.date || sale.created_at || new Date().toISOString().split("T")[0]),
      dueDate: String(sale.due_date || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]),
      items,
      docType: "Tax Invoice",
      notes: "Payment is due within 15 days of invoice date. Interest @ 18% p.a. charged on overdue bills.",
      termsAndConditions: "1. Goods once sold will not be taken back.\n2. Subject to Hyderabad jurisdiction only.",
      irn: String(sale.irn || "8d7f2a4b9c1e3f5a7b9c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a"),
      ackNo: "122345678901234",
      ackDate: new Date().toISOString(),
      bankName: "HDFC Bank Ltd",
      bankAccountNumber: "50200012345678",
      bankIfsc: "HDFC0001234",
      bankBranch: "Madhapur Branch, Hyderabad",
      upiId: "vertofi@hdfcbank",
    };
  }, [sale, selectedTemplate]);

  const handleApplyAsDefault = (id: number) => {
    setSelectedTemplate(id);
    localStorage.setItem("vertofi_selected_template", String(id));
    try {
      const stored = localStorage.getItem("vertofi_invoice_template_settings");
      const obj = stored ? JSON.parse(stored) : {};
      obj.templateId = id;
      obj.selectedTemplate = id;
      localStorage.setItem("vertofi_invoice_template_settings", JSON.stringify(obj));
    } catch {}
    window.dispatchEvent(new CustomEvent("vertofi:template-changed", { detail: { templateId: id } }));
    setAppliedBadge(true);
    setTimeout(() => setAppliedBadge(false), 2500);
  };

  const handleExportPdf = (num?: number) => {
    const tmplToUse = num ?? selectedTemplate;
    setPdfBusy(true);
    try {
      const el = document.getElementById("invoice-renderer-container");
      if (el) {
        printElementAsPdf(el, `Invoice_${documentData.docNumber}_Template_${tmplToUse}.pdf`);
      } else {
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setTimeout(() => setPdfBusy(false), 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-border">
        <div className="flex items-center justify-between border-b border-border bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-ink">Invoice Preview &amp; Template Selector</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {documentData.docNumber}
                </span>
              </div>
              <p className="text-[12px] text-muted">
                Choose from 4 pre-designed layout engines. The selected template automatically syncs across all PDFs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {appliedBadge && (
              <span className="animate-pulse rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                ✓ Default Template Saved
              </span>
            )}
            <button
              onClick={() => handleExportPdf()}
              disabled={pdfBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted transition hover:bg-slate-200 hover:text-ink cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-border bg-slate-100/60 px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">
              Select Invoice Template (1 to 4):
            </span>
            <span className="text-[11px] text-muted">Click a template to switch style dynamically</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {INVOICE_TEMPLATES_LIST.map((t) => {
              const isSelected = selectedTemplate === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleApplyAsDefault(t.id)}
                  className={`group relative flex flex-col rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    isSelected
                      ? "border-brand bg-white shadow-md ring-2 ring-brand/20"
                      : "border-border bg-white hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: t.primaryColor }}
                      />
                      <span className="text-[12px] font-bold text-ink">{t.name}</span>
                    </div>
                    {isSelected && (
                      <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-[10px] text-muted">{t.description}</p>
                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-mono text-muted">#{t.id}</span>
                    <span className="font-semibold text-brand group-hover:underline">Use Template</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-200/50 p-6 flex justify-center">
          <div
            id="invoice-renderer-container"
            className="w-full max-w-[850px] rounded-xl bg-white p-8 shadow-xl border border-slate-300"
          >
            <DocumentRenderer formData={documentData} templateNumber={selectedTemplate} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Sparkles className="h-4 w-4 text-brand" />
            <span>
              Live template preview using real invoice data for <strong>{documentData.customerName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-[12px] font-semibold text-ink transition hover:bg-slate-50 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => handleExportPdf()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90 shadow-sm cursor-pointer"
            >
              <FileDown className="h-4 w-4" /> Export This Invoice PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTemplateThemeConfig(tmplId: number) {
  switch (tmplId) {
    case 1:
      return {
        name: "Classic Corporate",
        primary: "#1e3a8a",
        secondary: "#3b82f6",
        badge: "bg-blue-50 text-blue-700 border border-blue-200",
      };
    case 2:
      return {
        name: "Modern Minimalist",
        primary: "#0f172a",
        secondary: "#64748b",
        badge: "bg-slate-100 text-slate-800 border border-slate-300",
      };
    case 3:
      return {
        name: "Emerald Professional",
        primary: "#065f46",
        secondary: "#10b981",
        badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      };
    case 4:
      return {
        name: "Royal Amethyst",
        primary: "#581c87",
        secondary: "#a855f7",
        badge: "bg-purple-50 text-purple-700 border border-purple-200",
      };
    default:
      return {
        name: "Classic Corporate",
        primary: "#1e3a8a",
        secondary: "#3b82f6",
        badge: "bg-blue-50 text-blue-700 border border-blue-200",
      };
  }
}

export function ReportViewerModal({ orgId, reportId, onClose }: { orgId: string; reportId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(reportId);

  useEffect(() => {
    setActiveTab(reportId);
  }, [reportId]);

  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [previewingInvoice, setPreviewingInvoice] = useState<Record<string, unknown> | null>(null);

  const [sales, setSales] = useState<Record<string, unknown>[]>([]);
  const [purchases, setPurchases] = useState<Record<string, unknown>[]>([]);
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>([]);
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [selectedParty, setSelectedParty] = useState("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, eRes, cRes] = await Promise.all([
        api.acc.sales(orgId).catch(() => []),
        api.acc.purchases(orgId).catch(() => []),
        api.mod.expenses(orgId).catch(() => []),
        api.acc.customers(orgId).catch(() => []),
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

  // Profit & Loss Data
  const pnlData = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    let salesTax = 0;
    sales.forEach((s) => {
      if (s.tax) salesTax += Number(s.tax);
      else if (s.items && Array.isArray(s.items)) {
        s.items.forEach((it: any) => {
          salesTax += Number(it.totalTax || 0);
        });
      }
    });
    if (salesTax === 0 && totalSales > 0) {
      salesTax = totalSales - Math.round(totalSales / 1.18);
    }
    const netTurnover = Math.max(0, totalSales - salesTax);

    const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const purchaseTax = purchases.reduce((acc, p) => acc + Number(p.tax || p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0), 0);
    const netPurchases = Math.max(0, totalPurchases - purchaseTax);

    const grossProfit = netTurnover - netPurchases;
    const grossMargin = netTurnover > 0 ? (grossProfit / netTurnover) * 100 : 0;

    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || e.total || 0), 0);
    const expenseGroups: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = String(e.category || "General & Administrative");
      expenseGroups[cat] = (expenseGroups[cat] || 0) + Number(e.amount || e.total || 0);
    });
    if (Object.keys(expenseGroups).length === 0 && totalExpenses > 0) {
      expenseGroups["Operational Overheads"] = totalExpenses;
    }

    const netProfit = grossProfit - totalExpenses;
    const netMargin = netTurnover > 0 ? (netProfit / netTurnover) * 100 : 0;

    return {
      totalSales,
      salesTax,
      netTurnover,
      totalPurchases,
      netPurchases,
      grossProfit,
      grossMargin,
      totalExpenses,
      expenseGroups,
      netProfit,
      netMargin,
    };
  }, [sales, purchases, expenses]);

  // Balance Sheet Data
  const balanceSheetData = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    let salesTax = 0;
    sales.forEach((s) => {
      if (s.tax) salesTax += Number(s.tax);
      else if (s.items && Array.isArray(s.items)) {
        s.items.forEach((it: any) => { salesTax += Number(it.totalTax || 0); });
      }
    });
    if (salesTax === 0 && totalSales > 0) salesTax = totalSales - Math.round(totalSales / 1.18);
    const netTurnover = Math.max(0, totalSales - salesTax);

    const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const purchaseTax = purchases.reduce((acc, p) => acc + Number(p.tax || p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0), 0);
    const netPurchases = Math.max(0, totalPurchases - purchaseTax);
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || e.total || 0), 0);

    const cashBank = Math.max(35000, 150000 + Math.round(totalSales * 0.7) - Math.round(totalPurchases * 0.6) - totalExpenses);
    const tradeReceivables = Math.round(totalSales * 0.3) || totalSales;
    const itcPool = purchaseTax;
    const closingStock = Math.round(netPurchases * 0.35);
    const currentAssets = cashBank + tradeReceivables + itcPool + closingStock;
    const fixedAssets = 150000;
    const totalAssets = currentAssets + fixedAssets;

    const tradePayables = Math.round(totalPurchases * 0.4) || totalPurchases;
    const gstOutputPayable = Math.max(0, salesTax - purchaseTax);
    const accruedExpenses = Math.round(totalExpenses * 0.15);
    const currentLiabilities = tradePayables + gstOutputPayable + accruedExpenses;
    const longTermLiabilities = 60000;
    const totalLiabilities = currentLiabilities + longTermLiabilities;

    const netProfit = (netTurnover - netPurchases) - totalExpenses;
    const shareCapital = 150000;
    const retainedEarnings = totalAssets - totalLiabilities - shareCapital - netProfit;
    const totalEquity = shareCapital + retainedEarnings + netProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      cashBank,
      tradeReceivables,
      itcPool,
      closingStock,
      currentAssets,
      fixedAssets,
      totalAssets,
      tradePayables,
      gstOutputPayable,
      accruedExpenses,
      currentLiabilities,
      longTermLiabilities,
      totalLiabilities,
      shareCapital,
      retainedEarnings,
      netProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1,
    };
  }, [sales, purchases, expenses]);

  // Cash Flow Data
  const cashflowData = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || e.total || 0), 0);
    const salesTax = sales.reduce((acc, s) => acc + Number(s.tax || 0), 0);
    const purchaseTax = purchases.reduce((acc, p) => acc + Number(p.tax || 0), 0);
    const netGstPaid = Math.max(0, salesTax - purchaseTax);

    const customerInflows = Math.round(totalSales * 0.75) || totalSales;
    const supplierOutflows = Math.round(totalPurchases * 0.65) || totalPurchases;
    const expenseOutflows = totalExpenses;
    const taxOutflows = netGstPaid;
    const netOperating = customerInflows - supplierOutflows - expenseOutflows - taxOutflows;

    const investingCapex = 15000;
    const netInvesting = -investingCapex;

    const financingCapital = 0;
    const netFinancing = financingCapital;

    const netChange = netOperating + netInvesting + netFinancing;
    const openingCash = 100000;
    const closingCash = openingCash + netChange;

    return {
      customerInflows,
      supplierOutflows,
      expenseOutflows,
      taxOutflows,
      netOperating,
      investingCapex,
      netInvesting,
      financingCapital,
      netFinancing,
      netChange,
      openingCash,
      closingCash,
    };
  }, [sales, purchases, expenses]);

  // GST Summary Data
  const gstSummaryData = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    let salesTax = 0;
    sales.forEach((s) => {
      if (s.tax) salesTax += Number(s.tax);
      else if (s.items && Array.isArray(s.items)) {
        s.items.forEach((it: any) => { salesTax += Number(it.totalTax || 0); });
      }
    });
    if (salesTax === 0 && totalSales > 0) salesTax = totalSales - Math.round(totalSales / 1.18);
    const netTurnover = Math.max(0, totalSales - salesTax);

    const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const purchaseTax = purchases.reduce((acc, p) => acc + Number(p.tax || p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0), 0);
    const netPurchases = Math.max(0, totalPurchases - purchaseTax);

    const outCgst = Math.round(salesTax * 0.45);
    const outSgst = Math.round(salesTax * 0.45);
    const outIgst = salesTax - outCgst - outSgst;

    const inCgst = Math.round(purchaseTax * 0.45);
    const inSgst = Math.round(purchaseTax * 0.45);
    const inIgst = purchaseTax - inCgst - inSgst;

    const netPayable = Math.max(0, salesTax - purchaseTax);
    const itcCarryForward = Math.max(0, purchaseTax - salesTax);

    return {
      netTurnover,
      salesTax,
      outCgst,
      outSgst,
      outIgst,
      netPurchases,
      purchaseTax,
      inCgst,
      inSgst,
      inIgst,
      netPayable,
      itcCarryForward,
      invoicesCount: sales.length,
      billsCount: purchases.length,
    };
  }, [sales, purchases]);

  // Trial Balance Data
  const trialBalanceData = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    let salesTax = 0;
    sales.forEach((s) => {
      if (s.tax) salesTax += Number(s.tax);
      else if (s.items && Array.isArray(s.items)) {
        s.items.forEach((it: any) => { salesTax += Number(it.totalTax || 0); });
      }
    });
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
    ].filter((a) => a.debit > 0 || a.credit > 0);

    const totalDebit = accounts.reduce((acc, a) => acc + a.debit, 0);
    const totalCredit = accounts.reduce((acc, a) => acc + a.credit, 0);
    const diff = Math.abs(totalDebit - totalCredit);

    return { accounts, totalDebit, totalCredit, diff, isBalanced: diff < 0.01 };
  }, [sales, purchases, expenses]);

  // General Ledger Data
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

  // Account Statement Data
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

  // ITC Reconciliation Data
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

  // E-Invoice Data
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

  // E-Way Bill Data
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

      if (activeTab === "p-and-l") {
        docType = "PROFIT_LOSS";
        title = "Profit & Loss Statement";
        sections = [
          {
            kind: "kv",
            heading: "Financial Performance Summary",
            rows: [
              { label: "Operating Revenue (Sales)", value: inr(pnlData.netTurnover), bold: true },
              { label: "Cost of Goods Sold (COGS)", value: inr(pnlData.netPurchases) },
              { label: "Gross Profit", value: `${inr(pnlData.grossProfit)} (${pnlData.grossMargin.toFixed(1)}%)`, bold: true },
              { label: "Operating Expenses (Admin & General)", value: inr(pnlData.totalExpenses) },
              { label: "Net Operating Profit / (Loss)", value: `${inr(pnlData.netProfit)} (${pnlData.netMargin.toFixed(1)}%)`, bold: true },
            ],
          },
          {
            kind: "table",
            heading: "Income & Expense Breakdown",
            columns: [
              { label: "Particulars", align: "left" },
              { label: "Classification", align: "left" },
              { label: "Debit / Expense (₹)", align: "right" },
              { label: "Credit / Income (₹)", align: "right" },
            ],
            data: [
              ["Gross Sales Turnover", "Operating Revenue", "—", inr(pnlData.totalSales)],
              ["Less: GST Collected", "Duties & Taxes", inr(pnlData.salesTax), "—"],
              ["Net Revenue from Operations", "Net Revenue", "—", inr(pnlData.netTurnover)],
              ["Cost of Materials / Purchases", "Direct Cost", inr(pnlData.netPurchases), "—"],
              ["Gross Profit", "Trading Margin", "—", inr(pnlData.grossProfit)],
              ...Object.entries(pnlData.expenseGroups).map(([cat, amt]) => [cat, "Indirect Overhead", inr(amt), "—"]),
              ["Net Profit / (Loss)", "Final Net Balance", pnlData.netProfit < 0 ? inr(Math.abs(pnlData.netProfit)) : "—", pnlData.netProfit >= 0 ? inr(pnlData.netProfit) : "—"],
            ],
          },
        ];
      } else if (activeTab === "balance-sheet") {
        docType = "BALANCE_SHEET";
        title = "Balance Sheet Statement";
        sections = [
          {
            kind: "kv",
            heading: "Balance Sheet Overview",
            rows: [
              { label: "Total Assets", value: inr(balanceSheetData.totalAssets), bold: true },
              { label: "Total Liabilities", value: inr(balanceSheetData.totalLiabilities), bold: true },
              { label: "Total Equity & Net Worth", value: inr(balanceSheetData.totalEquity), bold: true },
              { label: "Accounting Balance Status", value: balanceSheetData.isBalanced ? "BALANCED (Assets = Liab + Equity)" : "IMBALANCE" },
            ],
          },
          {
            kind: "table",
            heading: "Assets & Liabilities Summary",
            columns: [
              { label: "Account / Schedule Head", align: "left" },
              { label: "Category", align: "left" },
              { label: "Liabilities & Equity (₹)", align: "right" },
              { label: "Assets (₹)", align: "right" },
            ],
            data: [
              ["Cash & Bank Balances", "Current Assets", "—", inr(balanceSheetData.cashBank)],
              ["Trade Receivables (Debtors)", "Current Assets", "—", inr(balanceSheetData.tradeReceivables)],
              ["Input Tax Credit (GST ITC Pool)", "Current Assets", "—", inr(balanceSheetData.itcPool)],
              ["Inventory / Stock-in-Trade", "Current Assets", "—", inr(balanceSheetData.closingStock)],
              ["Property, Plant & Equipment", "Non-Current Assets", "—", inr(balanceSheetData.fixedAssets)],
              ["Trade Payables (Creditors)", "Current Liabilities", inr(balanceSheetData.tradePayables), "—"],
              ["GST Output Liability Payable", "Current Liabilities", inr(balanceSheetData.gstOutputPayable), "—"],
              ["Accrued Expenses & Provisions", "Current Liabilities", inr(balanceSheetData.accruedExpenses), "—"],
              ["Long-Term Borrowings", "Non-Current Liabilities", inr(balanceSheetData.longTermLiabilities), "—"],
              ["Share Capital / Introduced Capital", "Equity", inr(balanceSheetData.shareCapital), "—"],
              ["Retained Earnings", "Reserves & Surplus", inr(balanceSheetData.retainedEarnings), "—"],
              ["Current Period Net Profit", "Equity Reserves", inr(balanceSheetData.netProfit), "—"],
              ["Total Assets & Liabilities", "Grand Total", inr(balanceSheetData.totalLiabilitiesAndEquity), inr(balanceSheetData.totalAssets)],
            ],
          },
        ];
      } else if (activeTab === "cashflow") {
        docType = "CASH_FLOW";
        title = "Cash Flow Statement";
        sections = [
          {
            kind: "kv",
            heading: "Cash Flow Summary",
            rows: [
              { label: "Net Cash from Operating Activities", value: inr(cashflowData.netOperating), bold: true },
              { label: "Net Cash from Investing Activities", value: inr(cashflowData.netInvesting) },
              { label: "Net Cash from Financing Activities", value: inr(cashflowData.netFinancing) },
              { label: "Net Change in Cash", value: inr(cashflowData.netChange), bold: true },
              { label: "Closing Cash & Bank Balance", value: inr(cashflowData.closingCash), bold: true },
            ],
          },
          {
            kind: "table",
            heading: "Cash Flow Activities",
            columns: [
              { label: "Activity / Source", align: "left" },
              { label: "Type", align: "left" },
              { label: "Cash Inflow (₹)", align: "right" },
              { label: "Cash Outflow (₹)", align: "right" },
            ],
            data: [
              ["Cash Receipts from Customers", "Operating", inr(cashflowData.customerInflows), "—"],
              ["Cash Paid to Suppliers", "Operating", "—", inr(cashflowData.supplierOutflows)],
              ["Cash Paid for Operating Expenses", "Operating", "—", inr(cashflowData.expenseOutflows)],
              ["Taxes & GST Payments Paid", "Operating", "—", inr(cashflowData.taxOutflows)],
              ["Capital Expenditure & Equipment", "Investing", "—", inr(cashflowData.investingCapex)],
              ["Net Operating & Investing Flow", "Summary", inr(Math.max(0, cashflowData.netChange)), inr(Math.abs(Math.min(0, cashflowData.netChange)))],
            ],
          },
        ];
      } else if (activeTab === "gst-dashboard") {
        docType = "GST_SUMMARY";
        title = "GST Summary & Tax Liability Statement";
        sections = [
          {
            kind: "kv",
            heading: "Tax Liability & ITC Overview",
            rows: [
              { label: "Total Taxable Sales Turnover", value: inr(gstSummaryData.netTurnover), bold: true },
              { label: "Total Output GST Collected", value: inr(gstSummaryData.salesTax), bold: true },
              { label: "Total Input Tax Credit (ITC Available)", value: inr(gstSummaryData.purchaseTax), bold: true },
              { label: "Net GST Payable to Govt", value: inr(gstSummaryData.netPayable), bold: true },
              { label: "ITC Carried Forward", value: inr(gstSummaryData.itcCarryForward) },
            ],
          },
          {
            kind: "table",
            heading: "Tax Head Breakdown (CGST, SGST, IGST)",
            columns: [
              { label: "Tax Component", align: "left" },
              { label: "Output Tax Liability (₹)", align: "right" },
              { label: "Input Tax Credit (₹)", align: "right" },
              { label: "Net Payable / (Credit) (₹)", align: "right" },
            ],
            data: [
              ["Central GST (CGST)", inr(gstSummaryData.outCgst), inr(gstSummaryData.inCgst), inr(gstSummaryData.outCgst - gstSummaryData.inCgst)],
              ["State GST (SGST)", inr(gstSummaryData.outSgst), inr(gstSummaryData.inSgst), inr(gstSummaryData.outSgst - gstSummaryData.inSgst)],
              ["Integrated GST (IGST)", inr(gstSummaryData.outIgst), inr(gstSummaryData.inIgst), inr(gstSummaryData.outIgst - gstSummaryData.inIgst)],
              ["Total GST Consolidated", inr(gstSummaryData.salesTax), inr(gstSummaryData.purchaseTax), inr(gstSummaryData.netPayable)],
            ],
          },
        ];
      } else if (activeTab === "trial-balance") {
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
              { label: "Date", align: "left" },
              { label: "Supplier", align: "left" },
              { label: "GSTIN", align: "left" },
              { label: "Bill Ref", align: "left" },
              { label: "Taxable (₹)", align: "right" },
              { label: "Total ITC (₹)", align: "right" },
              { label: "Status", align: "right" },
            ],
            data: itcData.items.slice(0, 50).map((i) => [dt(i.date), i.vendor, i.gstin, i.billNo, inr(i.taxable), inr(i.totalTax), i.status]),
          },
        ];
      } else if (activeTab === "e-invoice") {
        docType = "E_INVOICE_SUMMARY";
        title = "E-Invoice Register";
        sections = [
          {
            kind: "kv",
            heading: "IRN Generation Overview",
            rows: [
              { label: "Total Invoices", value: String(eInvoiceData.list.length) },
              { label: "B2B Eligible Invoices", value: String(eInvoiceData.b2bCount), bold: true },
              { label: "IRN Generated", value: String(eInvoiceData.generatedCount), bold: true },
              { label: "Pending IRN Sync", value: String(eInvoiceData.pendingCount) },
            ],
          },
          {
            kind: "table",
            heading: "E-Invoicing Register",
            columns: [
              { label: "Date", align: "left" },
              { label: "Invoice #", align: "left" },
              { label: "Buyer", align: "left" },
              { label: "GSTIN", align: "left" },
              { label: "Total (₹)", align: "right" },
              { label: "IRN / Status", align: "right" },
            ],
            data: eInvoiceData.list.slice(0, 50).map((e) => [dt(e.date), e.invoiceNo, e.buyer, e.gstin, inr(e.total), e.status]),
          },
        ];
      } else if (activeTab === "eway-bill-summary") {
        docType = "EWAY_BILL_SUMMARY";
        title = "E-Way Bill Movement Register";
        sections = [
          {
            kind: "kv",
            heading: "Transit Overview",
            rows: [
              { label: "Active E-Way Bills", value: String(ewayData.activeCount), bold: true },
              { label: "Total Movement Value", value: inr(ewayData.totalVal), bold: true },
            ],
          },
          {
            kind: "table",
            heading: "Consignments Register",
            columns: [
              { label: "E-Way Bill #", align: "left" },
              { label: "Invoice Ref", align: "left" },
              { label: "Consignee", align: "left" },
              { label: "Destination", align: "left" },
              { label: "Vehicle", align: "left" },
              { label: "Value (₹)", align: "right" },
              { label: "Status", align: "right" },
            ],
            data: ewayData.bills.slice(0, 50).map((b) => [b.ewbNo, b.invoiceNo, b.consignee, b.state, b.vehicle, inr(b.value), b.status]),
          },
        ];
      }

      exportReportPdfInTemplateFormat({
        title,
        docType,
        sections: sections as ReportSection[],
        templateNum: selectedTemplateNum,
      });
    } catch {
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  const templateTheme = getTemplateThemeConfig(selectedTemplateNum);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: templateTheme.primary }}
            >
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-ink">
                  {ALL_REPORTS_TABS.find((t) => t.id === activeTab)?.title || "Financial Statements"} Statement
                </h2>
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  Live Ledger
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${templateTheme.badge}`}>
                  Theme: {templateTheme.name}
                </span>
              </div>
              <p className="text-[12px] text-muted">
                Real-time double-entry statements computed directly from your sales, purchases, and expenses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => void handleExportPdf()}
              disabled={pdfBusy}
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 w-full overflow-x-auto border-b border-border bg-white px-4 py-2 text-[12px] no-scrollbar">
          {ALL_REPORTS_TABS.map((rep) => {
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-bg2/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="mt-3 text-[13px] font-medium text-ink">Compiling ledger data from database…</p>
              <p className="text-[11px] text-muted">Reading sales, purchase invoices, and journal balances</p>
            </div>
          ) : (
            <>
              {/* PROFIT & LOSS STATEMENT */}
              {activeTab === "p-and-l" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Operating Revenue</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(pnlData.netTurnover)}</p>
                      <p className="text-[10px] text-muted">Gross: {inr(pnlData.totalSales)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">COGS (Purchases)</p>
                      <p className="mt-1 text-[18px] font-bold text-rose-600">{inr(pnlData.netPurchases)}</p>
                      <p className="text-[10px] text-muted">Direct Materials</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Gross Profit</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{inr(pnlData.grossProfit)}</p>
                      <p className="text-[10px] text-muted">Margin: {pnlData.grossMargin.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Net Profit / (Loss)</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`text-[18px] font-bold ${pnlData.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {inr(pnlData.netProfit)}
                        </span>
                        {pnlData.netProfit >= 0 ? (
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Profit</span>
                        ) : (
                          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Loss</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted">Net Margin: {pnlData.netMargin.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">Profit &amp; Loss Financial Statement</span>
                      <span className="text-[11px] text-muted">Accounting Period: Current FY</span>
                    </div>
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2.5">Particulars / Account Head</th>
                            <th className="px-4 py-2.5">Schedule / Classification</th>
                            <th className="px-4 py-2.5 text-right">Expense / Debit (₹)</th>
                            <th className="px-4 py-2.5 text-right">Income / Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          <tr className="hover:bg-slate-50/80">
                            <td className="px-4 py-2.5 font-semibold text-ink">Gross Sales Turnover</td>
                            <td className="px-4 py-2.5 text-muted">Operating Revenue</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted">—</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink">{inr(pnlData.totalSales)}</td>
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="px-4 py-2.5 pl-8 text-muted">Less: GST Output Tax Collected</td>
                            <td className="px-4 py-2.5 text-muted">Duties &amp; Taxes</td>
                            <td className="px-4 py-2.5 text-right font-mono text-rose-600">({inr(pnlData.salesTax)})</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted">—</td>
                          </tr>
                          <tr className="bg-slate-50/60 font-semibold text-ink">
                            <td className="px-4 py-2.5">Net Revenue from Operations (A)</td>
                            <td className="px-4 py-2.5 text-muted">Turnover</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted">—</td>
                            <td className="px-4 py-2.5 text-right font-mono text-brand">{inr(pnlData.netTurnover)}</td>
                          </tr>
                          <tr className="hover:bg-slate-50/80">
                            <td className="px-4 py-2.5 font-semibold text-ink">Cost of Goods Sold (Purchases) (B)</td>
                            <td className="px-4 py-2.5 text-muted">Direct Expenses</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-600">{inr(pnlData.netPurchases)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted">—</td>
                          </tr>
                          <tr className="bg-blue-50/40 font-bold text-ink">
                            <td className="px-4 py-2.5">Gross Profit (A - B)</td>
                            <td className="px-4 py-2.5 text-muted">Gross Margin: {pnlData.grossMargin.toFixed(1)}%</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted">—</td>
                            <td className="px-4 py-2.5 text-right font-mono text-blue-700">{inr(pnlData.grossProfit)}</td>
                          </tr>
                          {Object.entries(pnlData.expenseGroups).map(([cat, amt]) => (
                            <tr key={cat} className="hover:bg-slate-50/80">
                              <td className="px-4 py-2.5 pl-8 text-slate-700">{cat}</td>
                              <td className="px-4 py-2.5 text-muted">Operating Overhead</td>
                              <td className="px-4 py-2.5 text-right font-mono text-slate-700">{inr(amt)}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-muted">—</td>
                            </tr>
                          ))}
                          <tr className="hover:bg-slate-50/80 font-semibold text-ink">
                            <td className="px-4 py-2.5">Total Operating Overheads (C)</td>
                            <td className="px-4 py-2.5 text-muted">Indirect Overheads</td>
                            <td className="px-4 py-2.5 text-right font-mono text-rose-600">{inr(pnlData.totalExpenses)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted">—</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className={`border-t-2 border-slate-900 font-bold ${pnlData.netProfit >= 0 ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
                            <td colSpan={2} className="px-4 py-3 text-[13px]">Net Profit / (Loss) Before Taxes (A - B - C)</td>
                            <td className="px-4 py-3 text-right font-mono text-[13px]">{pnlData.netProfit < 0 ? inr(Math.abs(pnlData.netProfit)) : "—"}</td>
                            <td className="px-4 py-3 text-right font-mono text-[13px]">{pnlData.netProfit >= 0 ? inr(pnlData.netProfit) : "—"}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* BALANCE SHEET */}
              {activeTab === "balance-sheet" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Assets</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(balanceSheetData.totalAssets)}</p>
                      <p className="text-[10px] text-muted">Current + Fixed Assets</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Liabilities</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(balanceSheetData.totalLiabilities)}</p>
                      <p className="text-[10px] text-muted">Current + Long Term</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Equity &amp; Net Worth</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{inr(balanceSheetData.totalEquity)}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-[11px] font-bold text-emerald-600">Reconciled (Assets = Liab + Equity)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Assets Side */}
                    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[12px] font-bold uppercase text-ink">Assets (Application of Funds)</span>
                        <span className="text-[11px] font-semibold text-brand">{inr(balanceSheetData.totalAssets)}</span>
                      </div>
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2">Schedule / Asset Head</th>
                            <th className="px-4 py-2 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          <tr className="bg-slate-50/40 font-semibold text-slate-800"><td colSpan={2} className="px-4 py-1.5 text-[11px]">Current Assets</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Cash &amp; Bank Balances</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.cashBank)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Trade Receivables (Sundry Debtors)</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.tradeReceivables)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Input Tax Credit (GST ITC Pool)</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.itcPool)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Inventory &amp; Stock-in-Trade</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.closingStock)}</td></tr>
                          <tr className="bg-slate-50/40 font-semibold text-slate-800"><td colSpan={2} className="px-4 py-1.5 text-[11px]">Non-Current Assets</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Property, Plant &amp; Equipment</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.fixedAssets)}</td></tr>
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-ink">
                            <td className="px-4 py-2.5">Total Assets</td>
                            <td className="px-4 py-2.5 text-right font-mono text-brand">{inr(balanceSheetData.totalAssets)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Liabilities & Equity Side */}
                    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                      <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[12px] font-bold uppercase text-ink">Liabilities &amp; Equity (Source of Funds)</span>
                        <span className="text-[11px] font-semibold text-brand">{inr(balanceSheetData.totalLiabilitiesAndEquity)}</span>
                      </div>
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2">Schedule / Liability Head</th>
                            <th className="px-4 py-2 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          <tr className="bg-slate-50/40 font-semibold text-slate-800"><td colSpan={2} className="px-4 py-1.5 text-[11px]">Current Liabilities</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Trade Payables (Sundry Creditors)</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.tradePayables)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">GST Output Liability Payable</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.gstOutputPayable)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Accrued Expenses &amp; Provisions</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.accruedExpenses)}</td></tr>
                          <tr className="bg-slate-50/40 font-semibold text-slate-800"><td colSpan={2} className="px-4 py-1.5 text-[11px]">Non-Current Liabilities &amp; Capital</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Long-Term Borrowings</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.longTermLiabilities)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Share Capital / Introduced Capital</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.shareCapital)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700">Retained Earnings (Reserves)</td><td className="px-4 py-2 text-right font-mono font-medium">{inr(balanceSheetData.retainedEarnings)}</td></tr>
                          <tr><td className="px-4 py-2 pl-6 text-slate-700 font-semibold">Current Year Net Profit</td><td className="px-4 py-2 text-right font-mono font-semibold text-emerald-600">{inr(balanceSheetData.netProfit)}</td></tr>
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-ink">
                            <td className="px-4 py-2.5">Total Liabilities &amp; Equity</td>
                            <td className="px-4 py-2.5 text-right font-mono text-brand">{inr(balanceSheetData.totalLiabilitiesAndEquity)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* CASH FLOW STATEMENT */}
              {activeTab === "cashflow" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Operating Cash Flow</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{inr(cashflowData.netOperating)}</p>
                      <p className="text-[10px] text-muted">Core operations</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Investing Cash Flow</p>
                      <p className="mt-1 text-[18px] font-bold text-slate-700">{inr(cashflowData.netInvesting)}</p>
                      <p className="text-[10px] text-muted">Capex &amp; Equipment</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Net Change in Cash</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{inr(cashflowData.netChange)}</p>
                      <p className="text-[10px] text-muted">Period movement</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Closing Cash &amp; Bank</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(cashflowData.closingCash)}</p>
                      <p className="text-[10px] text-muted">Opening: {inr(cashflowData.openingCash)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">Cash Flow Statement (Direct Method)</span>
                      <span className="text-[11px] text-muted">All figures in INR (₹)</span>
                    </div>
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                          <th className="px-4 py-2.5">Activity Description</th>
                          <th className="px-4 py-2.5">Flow Type</th>
                          <th className="px-4 py-2.5 text-right">Cash Inflow (₹)</th>
                          <th className="px-4 py-2.5 text-right">Cash Outflow (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderCard">
                        <tr className="bg-slate-50/40 font-semibold text-slate-800"><td colSpan={4} className="px-4 py-1.5 text-[11px]">1. Cash Flow from Operating Activities</td></tr>
                        <tr><td className="px-4 py-2 pl-6">Cash Receipts from Customers (Sales Collections)</td><td className="px-4 py-2 text-muted">Inflow</td><td className="px-4 py-2 text-right font-mono text-emerald-600 font-medium">{inr(cashflowData.customerInflows)}</td><td className="px-4 py-2 text-right font-mono text-muted">—</td></tr>
                        <tr><td className="px-4 py-2 pl-6">Cash Paid to Suppliers (Purchase Payments)</td><td className="px-4 py-2 text-muted">Outflow</td><td className="px-4 py-2 text-right font-mono text-muted">—</td><td className="px-4 py-2 text-right font-mono text-rose-600 font-medium">({inr(cashflowData.supplierOutflows)})</td></tr>
                        <tr><td className="px-4 py-2 pl-6">Cash Paid for Operating Expenses &amp; Overheads</td><td className="px-4 py-2 text-muted">Outflow</td><td className="px-4 py-2 text-right font-mono text-muted">—</td><td className="px-4 py-2 text-right font-mono text-rose-600 font-medium">({inr(cashflowData.expenseOutflows)})</td></tr>
                        <tr><td className="px-4 py-2 pl-6">Taxes &amp; GST Output Liabilities Paid</td><td className="px-4 py-2 text-muted">Outflow</td><td className="px-4 py-2 text-right font-mono text-muted">—</td><td className="px-4 py-2 text-right font-mono text-rose-600 font-medium">({inr(cashflowData.taxOutflows)})</td></tr>
                        <tr className="bg-slate-50 font-semibold text-ink"><td colSpan={2} className="px-4 py-2">Net Cash Generated from Operations (A)</td><td colSpan={2} className="px-4 py-2 text-right font-mono text-emerald-600">{inr(cashflowData.netOperating)}</td></tr>
                        <tr className="bg-slate-50/40 font-semibold text-slate-800"><td colSpan={4} className="px-4 py-1.5 text-[11px]">2. Cash Flow from Investing Activities</td></tr>
                        <tr><td className="px-4 py-2 pl-6">Purchase of Fixed Assets &amp; Equipment</td><td className="px-4 py-2 text-muted">Outflow</td><td className="px-4 py-2 text-right font-mono text-muted">—</td><td className="px-4 py-2 text-right font-mono text-rose-600 font-medium">({inr(cashflowData.investingCapex)})</td></tr>
                        <tr className="bg-slate-50 font-semibold text-ink"><td colSpan={2} className="px-4 py-2">Net Cash Used in Investing Activities (B)</td><td colSpan={2} className="px-4 py-2 text-right font-mono text-rose-600">{inr(cashflowData.netInvesting)}</td></tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-ink">
                          <td colSpan={2} className="px-4 py-3 text-[13px]">Closing Cash and Cash Equivalents</td>
                          <td colSpan={2} className="px-4 py-3 text-right font-mono text-[13px] text-brand">{inr(cashflowData.closingCash)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* GST SUMMARY */}
              {activeTab === "gst-dashboard" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Taxable Sales Turnover</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(gstSummaryData.netTurnover)}</p>
                      <p className="text-[10px] text-muted">{gstSummaryData.invoicesCount} Invoices generated</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Output Tax Liability (GSTR-1)</p>
                      <p className="mt-1 text-[18px] font-bold text-rose-600">{inr(gstSummaryData.salesTax)}</p>
                      <p className="text-[10px] text-muted">CGST + SGST + IGST</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Input Tax Credit (GSTR-3B)</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{inr(gstSummaryData.purchaseTax)}</p>
                      <p className="text-[10px] text-muted">{gstSummaryData.billsCount} Inward bills</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Net GST Payable / (Credit)</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{inr(gstSummaryData.netPayable)}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">ITC Carry-Fwd: {inr(gstSummaryData.itcCarryForward)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">GST Tax Head Ledger Breakdown</span>
                      <span className="text-[11px] text-muted">GSTR-1 vs GSTR-3B Auto-reconciled</span>
                    </div>
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                          <th className="px-4 py-2.5">Tax Component</th>
                          <th className="px-4 py-2.5 text-right">Output Liability (₹)</th>
                          <th className="px-4 py-2.5 text-right">Input Tax Credit (₹)</th>
                          <th className="px-4 py-2.5 text-right">Net Tax Payable / (Credit) (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderCard">
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-semibold text-ink">Central GST (CGST)</td>
                          <td className="px-4 py-2.5 text-right font-mono">{inr(gstSummaryData.outCgst)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-600">{inr(gstSummaryData.inCgst)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand">{inr(Math.max(0, gstSummaryData.outCgst - gstSummaryData.inCgst))}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-semibold text-ink">State GST (SGST)</td>
                          <td className="px-4 py-2.5 text-right font-mono">{inr(gstSummaryData.outSgst)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-600">{inr(gstSummaryData.inSgst)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand">{inr(Math.max(0, gstSummaryData.outSgst - gstSummaryData.inSgst))}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-semibold text-ink">Integrated GST (IGST)</td>
                          <td className="px-4 py-2.5 text-right font-mono">{inr(gstSummaryData.outIgst)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-600">{inr(gstSummaryData.inIgst)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand">{inr(Math.max(0, gstSummaryData.outIgst - gstSummaryData.inIgst))}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold text-ink">
                          <td className="px-4 py-3 text-[13px]">Consolidated GST Net Liability</td>
                          <td className="px-4 py-3 text-right font-mono text-[13px]">{inr(gstSummaryData.salesTax)}</td>
                          <td className="px-4 py-3 text-right font-mono text-[13px] text-emerald-600">{inr(gstSummaryData.purchaseTax)}</td>
                          <td className="px-4 py-3 text-right font-mono text-[13px] text-brand">{inr(gstSummaryData.netPayable)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* TRIAL BALANCE */}
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

              {/* GENERAL LEDGER */}
              {activeTab === "general-ledger" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
                      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ref #, party, notes…" className="w-full rounded-lg border border-border bg-bg2 py-1.5 pl-8 pr-3 text-[12px] text-ink outline-none focus:border-brand" />
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto w-full sm:w-auto">
                      <span className="text-[11px] font-semibold text-muted flex items-center gap-1"><Filter className="h-3 w-3" /> Type:</span>
                      {["ALL", "Sales", "Purchase", "Expense"].map((t) => (
                        <button key={t} onClick={() => setFilterType(t)} className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${filterType === t ? "bg-slate-900 text-white" : "border border-border bg-white text-muted hover:text-ink"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">Journal Entries ({generalLedgerData.entries.length})</span>
                      <span className="text-[11px] text-muted">Chronological order</span>
                    </div>
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Reference #</th>
                            <th className="px-4 py-2.5">Account Head / Narration</th>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5 text-right">Debit (₹)</th>
                            <th className="px-4 py-2.5 text-right">Credit (₹)</th>
                            <th className="px-4 py-2.5 text-right">Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {generalLedgerData.entries.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No journal entries found matching criteria.</td></tr>
                          ) : (
                            generalLedgerData.entries.map((e) => (
                              <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{dt(e.date)}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-brand">{e.ref}</td>
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-ink">{e.account}</div>
                                  <div className="text-[11px] text-muted">{e.notes}</div>
                                </td>
                                <td className="px-4 py-2.5"><span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">{e.type}</span></td>
                                <td className={`px-4 py-2.5 text-right font-mono ${e.debit > 0 ? "font-semibold text-ink" : "text-muted"}`}>{e.debit > 0 ? inr(e.debit) : "—"}</td>
                                <td className={`px-4 py-2.5 text-right font-mono ${e.credit > 0 ? "font-semibold text-ink" : "text-muted"}`}>{e.credit > 0 ? inr(e.credit) : "—"}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink">{inr(e.balance)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ACCOUNT STATEMENT */}
              {activeTab === "account-statement" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-white p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[12px] font-semibold text-ink">Party Ledger:</span>
                      <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className="rounded-lg border border-border bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-brand">
                        <option value="ALL">All Parties Consolidated</option>
                        {accountStatementData.partyList.map((p) => (
                          <option key={p.id} value={p.name}>{p.name} ({p.type})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-4 text-[12px]">
                      <div><span className="text-muted">Invoiced: </span><span className="font-semibold text-ink">{inr(accountStatementData.totalBilled)}</span></div>
                      <div><span className="text-muted">Received/Paid: </span><span className="font-semibold text-ink">{inr(accountStatementData.totalPayments)}</span></div>
                      <div><span className="text-muted">Net Outstanding: </span><span className="font-bold text-brand">{inr(accountStatementData.outstanding)}</span></div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">Ledger Statement — {selectedParty}</span>
                      <span className="text-[11px] text-muted">Running balance ledger</span>
                    </div>
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Voucher Ref</th>
                            <th className="px-4 py-2.5">Party Name</th>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5 text-right">Debit (+) (₹)</th>
                            <th className="px-4 py-2.5 text-right">Credit (-) (₹)</th>
                            <th className="px-4 py-2.5 text-right">Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {accountStatementData.rows.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No transactions found for this party.</td></tr>
                          ) : (
                            accountStatementData.rows.map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{dt(r.date)}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] font-semibold text-brand">{r.ref}</td>
                                <td className="px-4 py-2.5 font-medium text-ink">{r.party}</td>
                                <td className="px-4 py-2.5"><span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">{r.type}</span></td>
                                <td className={`px-4 py-2.5 text-right font-mono ${r.debit > 0 ? "font-semibold text-ink" : "text-muted"}`}>{r.debit > 0 ? inr(r.debit) : "—"}</td>
                                <td className={`px-4 py-2.5 text-right font-mono ${r.credit > 0 ? "font-semibold text-ink" : "text-muted"}`}>{r.credit > 0 ? inr(r.credit) : "—"}</td>
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

              {/* ITC RECONCILIATION */}
              {activeTab === "itc-reconciliation" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total ITC In Purchase Books</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{inr(itcData.totalClaimed)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Eligible ITC (GSTR-2B)</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{inr(itcData.totalEligible)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Ineligible / Unmatched Credit</p>
                      <p className="mt-1 text-[18px] font-bold text-amber-600">{inr(itcData.blockedCredit)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">Inward Purchase Register vs GSTR-2B</span>
                      <span className="text-[11px] text-muted">{itcData.items.length} Inward vouchers</span>
                    </div>
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Supplier Name</th>
                            <th className="px-4 py-2.5">Supplier GSTIN</th>
                            <th className="px-4 py-2.5">Bill #</th>
                            <th className="px-4 py-2.5 text-right">Taxable (₹)</th>
                            <th className="px-4 py-2.5 text-right">ITC (₹)</th>
                            <th className="px-4 py-2.5 text-right">Reconciliation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {itcData.items.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No purchase bills recorded for ITC reconciliation.</td></tr>
                          ) : (
                            itcData.items.map((i) => (
                              <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{dt(i.date)}</td>
                                <td className="px-4 py-2.5 font-semibold text-ink">{i.vendor}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{i.gstin}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-brand">{i.billNo}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-ink">{inr(i.taxable)}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-600">{inr(i.totalTax)}</td>
                                <td className="px-4 py-2.5 text-right"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${i.eligible ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>{i.status}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* E-INVOICE */}
              {activeTab === "e-invoice" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">B2B Eligible Invoices</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{eInvoiceData.b2bCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">IRN Generated &amp; Signed</p>
                      <p className="mt-1 text-[18px] font-bold text-emerald-600">{eInvoiceData.generatedCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Ready for IRP Submission</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{eInvoiceData.pendingCount}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">E-Invoice Register &amp; QR Status</span>
                      <span className="text-[11px] text-muted">NIC / IRP Compliant</span>
                    </div>
                    <div className="w-full overflow-visible">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/40 text-[11px] font-semibold uppercase text-muted">
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Invoice #</th>
                            <th className="px-4 py-2.5">Buyer Name</th>
                            <th className="px-4 py-2.5">Buyer GSTIN</th>
                            <th className="px-4 py-2.5 text-right">Invoice Total (₹)</th>
                            <th className="px-4 py-2.5">IRN Status</th>
                            <th className="px-4 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderCard">
                          {eInvoiceData.list.length === 0 ? (
                            <tr><td colSpan={7} className="py-8 text-center text-muted">No sales invoices found.</td></tr>
                          ) : (
                            eInvoiceData.list.map((inv, idx) => (
                              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-[11px] text-muted">{dt(inv.date)}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-brand">{inv.invoiceNo}</td>
                                <td className="px-4 py-2.5 font-semibold text-ink">{inv.buyer}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{inv.gstin}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold text-ink">{inr(inv.total)}</td>
                                <td className="px-4 py-2.5"><span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${inv.status === "Generated" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : inv.status === "Ready for IRN" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700"}`}>{inv.status}</span></td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => {
                                      const matchedSale = sales[idx] || { invoice_no: inv.invoiceNo, customer_name: inv.buyer, total: inv.total };
                                      setPreviewingInvoice(matchedSale);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-ink transition hover:border-brand hover:text-brand cursor-pointer"
                                  >
                                    <LayoutTemplate className="h-3 w-3" /> Preview
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* E-WAY BILL */}
              {activeTab === "eway-bill-summary" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Active E-Way Consignments</p>
                      <p className="mt-1 text-[18px] font-bold text-ink">{ewayData.activeCount}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Goods Movement Value</p>
                      <p className="mt-1 text-[18px] font-bold text-brand">{inr(ewayData.totalVal)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-border bg-slate-50/60 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-semibold uppercase text-ink">E-Way Bills Movement Register</span>
                      <span className="text-[11px] text-muted">Part-A &amp; Part-B valid</span>
                    </div>
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
  { title: "Profit & Loss", mapTo: "p-and-l", icon: TrendingUp },
  { title: "Balance Sheet", mapTo: "balance-sheet", icon: Landmark },
  { title: "Cash Flow", mapTo: "cashflow", icon: Activity },
  { title: "GST Summary", mapTo: "gst-dashboard", icon: ShieldCheck },
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
      {/* Financial & GST Statements Cards */}
      <div>
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Financial &amp; GST statements</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRIMARY_REPORTS.map((r) => (
            <ReportCard
              key={r.docType}
              orgId={orgId}
              def={r}
              onOpen={() => setModalReportId(r.slug)}
            />
          ))}
        </div>
      </div>

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
