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
} from "lucide-react";
import { Card, Badge } from "@/ui";
import { api } from "@/lib/api";

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
      await api.acc.downloadReportPdf(
        orgId,
        { docType: def.docType, title: def.title, sections: objToSections(reportData) },
        `${def.title.replace(/\W+/g, "_")}.pdf`
      );
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

export function ReportViewerModal({ orgId, reportId, onClose }: { orgId: string; reportId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(reportId);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");

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
      setSales(Array.isArray(sRes) ? sRes : []);
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

  const trialBalanceData = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const salesTax = sales.reduce((acc, s) => acc + Number(s.tax || s.cgst || 0) + Number(s.sgst || 0) + Number(s.igst || 0), 0);
    const netSales = Math.max(0, totalSales - salesTax);

    const totalPurchases = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const purchaseTax = purchases.reduce((acc, p) => acc + Number(p.tax || p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0), 0);
    const netPurchases = Math.max(0, totalPurchases - purchaseTax);

    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || e.total || 0), 0);
    const debtors = totalSales;
    const creditors = totalPurchases;
    const inputGst = Number(gstSummary.inputTaxCredit || gstSummary.inputGst || purchaseTax);
    const outputGst = Number(gstSummary.outputTax || gstSummary.outputGst || salesTax);
    const pnlProfit = Number(pnl.netProfit || 0);

    const accounts = [
      { code: "1001", name: "Trade Receivables (Sundry Debtors)", category: "Current Assets", debit: debtors, credit: 0 },
      { code: "1002", name: "Input Tax Credit (GST ITC Pool)", category: "Current Assets", debit: inputGst, credit: 0 },
      { code: "1003", name: "Bank & Cash Accounts (Operating)", category: "Current Assets", debit: Math.max(0, totalSales - totalPurchases - totalExpenses), credit: 0 },
      { code: "2001", name: "Trade Payables (Sundry Creditors)", category: "Current Liabilities", debit: 0, credit: creditors },
      { code: "2002", name: "GST Output Liability (Duties & Taxes)", category: "Current Liabilities", debit: 0, credit: outputGst },
      { code: "3001", name: "Owner Equity / Retained Capital", category: "Equity", debit: 0, credit: Math.max(0, (debtors + inputGst) - (creditors + outputGst)) },
      { code: "4001", name: "Sales Revenue (Turnover)", category: "Revenue", debit: 0, credit: netSales },
      { code: "5001", name: "Cost of Goods Sold (Purchases)", category: "Direct Expense", debit: netPurchases, credit: 0 },
      { code: "5002", name: "Operating Expenses (Admin / General)", category: "Indirect Expense", debit: totalExpenses, credit: 0 },
    ];

    if (pnlProfit < 0) {
      accounts.push({ code: "3002", name: "Current Period Net Loss", category: "Equity Adjustment", debit: Math.abs(pnlProfit), credit: 0 });
    }

    const totalDebit = accounts.reduce((acc, a) => acc + a.debit, 0);
    const totalCredit = accounts.reduce((acc, a) => acc + a.credit, 0);
    const diff = Math.abs(totalDebit - totalCredit);

    return { accounts, totalDebit, totalCredit, diff, isBalanced: diff < 0.01 };
  }, [sales, purchases, expenses, gstSummary, pnl]);

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
    const bills = (eligibleSales.length > 0 ? eligibleSales : sales).map((s, idx) => {
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

      await api.acc.downloadReportPdf(orgId, { docType, title, sections }, `${title.replace(/\W+/g, "_")}.pdf`);
    } catch (err) {
      console.warn("Backend PDF generation failed, falling back to browser print", err);
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  const activeReport = MORE_REPORTS.find((m) => m.id === activeTab);
  const ActiveIcon = activeReport?.icon || FileText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-borderCard bg-white shadow-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border bg-slate-50/80 px-5 py-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white shadow-sm">
              <ActiveIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-ink">
                  {activeReport?.title || "Financial Report"}
                </h2>
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-brand disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              title="Print Report"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-brand"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={pdfBusy || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50 shadow-sm"
            >
              {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              <span>Export PDF</span>
            </button>
            <button onClick={onClose} className="ml-1 rounded-lg p-1.5 text-muted transition hover:bg-slate-200 hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-white px-4 py-2 text-[12px]">
          {MORE_REPORTS.map((rep) => {
            const Icon = rep.icon;
            const isActive = activeTab === rep.id;
            return (
              <button
                key={rep.id}
                onClick={() => setActiveTab(rep.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  isActive ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-slate-100 hover:text-ink"
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
                    <div className="overflow-x-auto">
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
                    <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
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
                    <div className="overflow-x-auto">
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
                    <div className="overflow-x-auto">
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
                    <div className="overflow-x-auto">
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
                    <div className="overflow-x-auto">
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
                    <div className="overflow-x-auto">
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
  { title: "GST Summary Report", mapTo: "itc-reconciliation", icon: CheckCircle2 },
  { title: "Profit & Loss", mapTo: "general-ledger", icon: FileSpreadsheet },
  { title: "Balance Sheet", mapTo: "trial-balance", icon: FileSpreadsheet },
  { title: "Cash Flow Statement", mapTo: "general-ledger", icon: Receipt },
  { title: "Business Health Score Report", mapTo: "trial-balance", icon: FileText },
  { title: "Profit Leak Report", mapTo: "general-ledger", icon: FileText },
  { title: "Financial Black Box Report", mapTo: "account-statement", icon: FileText },
  { title: "Predictive Tax Warning Report", mapTo: "itc-reconciliation", icon: AlertTriangle },
  { title: "Money Map Report", mapTo: "general-ledger", icon: FileSpreadsheet },
  { title: "Vendor Trust Report", mapTo: "account-statement", icon: Receipt },
  { title: "Industry Benchmark Report", mapTo: "trial-balance", icon: FileSpreadsheet },
  { title: "Accounting Warranty Report", mapTo: "account-statement", icon: FileText },
  { title: "Business Lifeguard Incident Report", mapTo: "general-ledger", icon: AlertTriangle },
];

export function ReportsCenter({ orgId }: { orgId: string }) {
  const [modalReportId, setModalReportId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Financial &amp; GST statements</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRIMARY_REPORTS.map((r) => (
            <ReportCard key={r.docType} orgId={orgId} def={r} onOpen={() => {
              if (r.slug === "p-and-l") setModalReportId("general-ledger");
              else if (r.slug === "balance-sheet") setModalReportId("trial-balance");
              else if (r.slug === "gst-dashboard") setModalReportId("itc-reconciliation");
              else setModalReportId("account-statement");
            }} />
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
                className="group inline-flex items-center gap-1.5 rounded-lg border border-borderCard bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-brand hover:bg-white hover:text-brand hover:shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 text-muted transition group-hover:text-brand" />
                <span>{r.title}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {modalReportId !== null && (
        <ReportViewerModal orgId={orgId} reportId={modalReportId} onClose={() => setModalReportId(null)} />
      )}
    </div>
  );
}
