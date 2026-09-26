"use client";
import { useEffect, useMemo, useState } from "react";
import { Receipt, FileText, ShieldCheck, AlertTriangle, Plus, TrendingUp, Download, Search, ArrowUpDown, Calendar, Trash2, MoreHorizontal, Eye, RefreshCw, Mail, XCircle, LayoutTemplate } from "lucide-react";
import { Button, Card } from "@/ui";
import { api } from "@/lib/api";
import { InvoiceTemplatePreviewModal } from "./ReportsCenter";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const num = (v: unknown) => Number(v ?? 0) || 0;

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Receipt; tone?: "gold" | "brand" }) {
  return (
    <Card className="py-3 px-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <Icon className={`h-4 w-4 ${tone === "gold" ? "text-gold" : "text-brand"}`} />
      </div>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
    </Card>
  );
}

function dedupeInvoices(list: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const item of list) {
    // 1. Exclude any purchase bills from Sales
    const docType = String(item.doc_type || item.docType || "").toUpperCase();
    const invNoRaw = String(item.invoice_no ?? item.invoiceNo ?? "").trim();
    if (docType === "PURCHASE_BILL" || docType === "PURCHASE" || invNoRaw.startsWith("PUR-")) {
      continue;
    }

    // 2. Normalize customer name and invoice number
    const custName = String(item.customer_name || item.customerName || item.name || item.vendor_name || "").toLowerCase().trim();
    const invNo = invNoRaw.toUpperCase();
    const total = String(Math.round(Number(item.total || item.amount || 0)));

    // 3. Strict uniqueness by invoice number and customer + total
    const key = invNo ? `inv:${invNo}` : `cust:${custName}:${total}`;
    const custKey = custName ? `cust:${custName}:${total}` : null;

    if (!seen.has(key) && (!custKey || !seen.has(custKey))) {
      seen.add(key);
      if (custKey) seen.add(custKey);
      out.push({
        ...item,
        customer_name: item.customer_name || item.customerName || "—",
        customerName: item.customer_name || item.customerName || "—",
        invoice_no: item.invoice_no || item.invoiceNo || "INV-001",
        invoiceNo: item.invoice_no || item.invoiceNo || "INV-001",
        doc_type: item.doc_type || item.docType || "Tax Invoice",
      });
    }
  }
  return out;
}

export function SalesView({ orgId, rows = [], loading, onNewInvoice, onNewDoc }: {
  orgId: string; rows?: Record<string, unknown>[]; loading?: boolean;
  onNewInvoice: () => void; onNewDoc: (type: string) => void;
}) {
  const [gst, setGst] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState({ start: "2026-09-01", end: "2026-09-03" });
  const [localRows, setLocalRows] = useState<Record<string, unknown>[]>(() => dedupeInvoices(rows));
  const [editingInvoice, setEditingInvoice] = useState<Record<string, unknown> | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  function handleDownload(r: Record<string, unknown>) {
    setPreviewingInvoice(r);
    setTimeout(() => {
      const el = document.getElementById("printable-invoice-a4");
      if (el) {
        import("@/lib/exportTemplatePdf").then(({ printElementAsPdf }) => {
          printElementAsPdf(el, String(r.invoice_no ?? "Invoice"));
        });
      }
    }, 500);
  }

  function handleDuplicate(r: Record<string, unknown>) {
    const newId = "inv-" + Date.now();
    const newNo = String(r.invoice_no ?? "INV") + "-COPY";
    const clone = { ...r, id: newId, invoice_no: newNo, number: newNo };
    setLocalRows((prev) => {
      const updated = [clone, ...prev];
      try { localStorage.setItem("vertofi_local_sales", JSON.stringify(updated)); } catch {}
      return updated;
    });
    alert("Successfully duplicated as " + newNo);
  }

  function handleEmail(r: Record<string, unknown>) {
    const custEmail = String(r.customer_email ?? r.customerEmail ?? "");
    const invNo = String(r.invoice_no ?? "Invoice");
    const amount = Number(r.total ?? r.amount ?? 0);
    const subject = encodeURIComponent("Invoice " + invNo + " from Vertofi");
    const body = encodeURIComponent("Dear Customer,\n\nPlease find attached the details for Invoice " + invNo + " amounting to " + amount + ".\n\nThank you.");
    window.location.href = "mailto:" + custEmail + "?subject=" + subject + "&body=" + body;
  }

  const [previewingInvoice, setPreviewingInvoice] = useState<Record<string, unknown> | null>(null);
  const [editForm, setEditForm] = useState<{
    id: string;
    invoice_no: string;
    customer_name: string;
    doc_type: string;
    date: string;
    total: number;
    status: string;
  }>({
    id: "",
    invoice_no: "",
    customer_name: "",
    doc_type: "Tax Invoice",
    date: "",
    total: 0,
    status: "ISSUED",
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    function load() {
      try {
        const local = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        setLocalRows(dedupeInvoices([...local, ...rows]));
      } catch {
        setLocalRows(dedupeInvoices(rows));
      }
    }
    load();
    window.addEventListener("storage", load);
    window.addEventListener("vertofi-sales-changed", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("vertofi-sales-changed", load);
    };
  }, [rows]);

  useEffect(() => { api.mod.gstSummary(orgId).then(setGst).catch(() => setGst(null)); }, [orgId]);

  function handleOpenEdit(r: Record<string, unknown>) {
    setEditingInvoice(r);
    setEditForm({
      id: String(r.id ?? r.invoice_no ?? Math.random()),
      invoice_no: String(r.invoice_no ?? r.invoiceNo ?? "INV-001"),
      customer_name: String(r.customer_name ?? r.customerName ?? ""),
      doc_type: String(r.doc_type ?? r.docType ?? "Tax Invoice"),
      date: String(r.date ?? r.issue_date ?? new Date().toISOString()).slice(0, 10),
      total: num(r.total),
      status: String(r.status ?? "ISSUED").toUpperCase(),
    });
    setSavedSuccess(false);
  }

  function handleSaveEdit() {
    setLocalRows((prev) => {
      const updated = prev.map((item) => {
        const itemKey = String(item.id ?? item.invoice_no ?? item.invoiceNo);
        if (itemKey === editForm.id || String(item.invoice_no) === editForm.invoice_no) {
          return {
            ...item,
            invoice_no: editForm.invoice_no,
            customer_name: editForm.customer_name,
            doc_type: editForm.doc_type,
            date: editForm.date,
            total: editForm.total,
            status: editForm.status,
          };
        }
        return item;
      });
      try {
        localStorage.setItem("vertofi_local_sales", JSON.stringify(updated));
      } catch (_e) {}
      return updated;
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setEditingInvoice(null);
    }, 600);
  }

  function handleDeleteInvoice(r: Record<string, unknown>) {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    const targetId = String(r.id ?? "");
    const targetInvNo = String(r.invoice_no ?? r.invoiceNo ?? r.id ?? "");

    // 1. Remove from local component state
    setLocalRows((prev) => {
      const updated = prev.filter((item) => {
        const itemId = String(item.id ?? "");
        const itemInvNo = String(item.invoice_no ?? item.invoiceNo ?? "");
        if (targetId && itemId === targetId) return false;
        if (targetInvNo && itemInvNo === targetInvNo) return false;
        return true;
      });
      try {
        localStorage.setItem("vertofi_local_sales", JSON.stringify(updated));
      } catch (_e) {}
      return updated;
    });

    // 2. Remove from all possible local storage invoice stores
    try {
      const docStores = [
        "vertofi_local_sales",
        "vertofi_saved_documents",
        "vertofi_generated_invoices",
        "vertofi_invoices",
        "vertofi_proforma_invoices",
      ];
      for (const storeKey of docStores) {
        const raw = localStorage.getItem(storeKey);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const filtered = list.filter((item) => {
                const itemId = String(item.id ?? "");
                const itemInvNo = String(item.invoice_no ?? item.invoiceNo ?? item.number ?? "");
                if (targetId && itemId === targetId) return false;
                if (targetInvNo && itemInvNo === targetInvNo) return false;
                return true;
              });
              localStorage.setItem(storeKey, JSON.stringify(filtered));
            }
          } catch {}
        }
      }
    } catch {}

    // 3. Broadcast global deletion event so Workspace, Dashboard, and other open views update immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("vertofi:invoice-deleted", {
          detail: { id: targetId, invoice_no: targetInvNo },
        })
      );
      window.dispatchEvent(new Event("storage"));
    }

    // 4. Send asynchronous DELETE requests to server API
    const oid = orgId || "demo-business-org";
    if (targetId) {
      void fetch(`/api/v1/accounting/${oid}/sales/${encodeURIComponent(targetId)}`, { method: "DELETE" }).catch(() => {});
    }
    if (targetInvNo && targetInvNo !== targetId) {
      void fetch(`/api/v1/accounting/${oid}/sales/${encodeURIComponent(targetInvNo)}`, { method: "DELETE" }).catch(() => {});
    }
  }

  const kpis = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let monthSales = 0, total = 0, unpaidCount = 0, unpaidAmt = 0, localGst = 0;
    const byCustomer: Record<string, number> = {};
    for (const r of localRows) {
      const t = num(r.total);
      total += t;
      if (String(r.date ?? "").startsWith(ym)) monthSales += t;
      if (String(r.status ?? "").toUpperCase() !== "PAID") { unpaidCount++; unpaidAmt += t; }
      const c = String(r.customer_name ?? "—");
      byCustomer[c] = (byCustomer[c] ?? 0) + t;
      
      localGst += num(r.totalTax);
    }
    const topCustomers = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const apiGst = gst ? num(gst.cgst) + num(gst.sgst) + num(gst.igst) + num(gst.total_tax) + num(gst.outputTax) : 0;
    const gstCollected = apiGst > 0 ? apiGst : localGst;
    return { monthSales, total, count: localRows.length, unpaidCount, unpaidAmt, topCustomers, gstCollected };
  }, [localRows, gst]);

  const filteredRows = useMemo(() => {
    const deduped = dedupeInvoices(localRows);
    return deduped.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const invNo = String(r.invoice_no ?? r.invoiceNo ?? "").toLowerCase();
      const cust = String(r.customer_name ?? r.customerName ?? "").toLowerCase();
      const status = String(r.status ?? "").toLowerCase();
      return invNo.includes(q) || cust.includes(q) || status.includes(q);
    });
  }, [localRows, search]);

  function exportCsv() {
    if (localRows.length === 0) return;
    const headers = ["Invoice Number", "Customer", "Invoice Type", "Invoice Date", "Return Period", "Amount", "Status"];
    const csvRows = localRows.map((r) => [
      `"${String(r.invoice_no ?? "—")}"`,
      `"${String(r.customer_name ?? "—")}"`,
      `"${String(r.doc_type ?? "Tax Invoice")}"`,
      `"${String(r.date ?? r.issue_date ?? "—").slice(0, 10)}"`,
      `"${String(r.return_period ?? "09-2026")}"`,
      `"${num(r.total)}"`,
      `"${String(r.status ?? "ISSUED")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="SALES THIS MONTH" value={inr(kpis.monthSales)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL INVOICED" value={inr(kpis.total)} icon={Receipt} tone="brand" />
        <Kpi label="GST COLLECTED" value={kpis.gstCollected ? inr(kpis.gstCollected) : "—"} icon={ShieldCheck} tone="gold" />
        <Kpi label="UNPAID INVOICES" value={`${kpis.unpaidCount} · ${inr(kpis.unpaidAmt)}`} icon={AlertTriangle} tone="brand" />
      </div>

      {/* Main Manage Sales Invoices Card */}
      <Card className="p-6">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">Manage Sales Invoices</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3182ce] px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button
              type="button"
              onClick={onNewInvoice}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-xs font-bold text-white transition hover:bg-green-600 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Invoice
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 pb-2">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden w-fit">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{dateRange.start} - {dateRange.end}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 sm:w-60 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand"
              />
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-visible rounded-lg border border-border mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">#</th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Invoice Number <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Customer <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Invoice Type <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Invoice Date <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Return Period <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 cursor-pointer">
                    Amount <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer">
                    Status <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted">
                    Loading invoices…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted font-medium">
                    No data available in table
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, pageSize).map((r, idx) => {
                  const rowKey = `${String(r.id || r.invoice_no || "inv")}-${idx}`;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                    <td className="px-3 py-3 font-semibold text-brand">{String(r.invoice_no ?? r.invoiceNo ?? "INV-001")}</td>
                    <td className="px-3 py-3 font-medium text-ink">{String(r.customer_name ?? r.customerName ?? "—")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.doc_type ?? r.docType ?? "Tax Invoice")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.date ?? r.issue_date ?? "Today").slice(0, 10)}</td>
                    <td className="px-3 py-3 text-muted">{String(r.return_period ?? "09-2026")}</td>
                    <td className="px-3 py-3 text-right font-semibold text-ink">{inr(num(r.total))}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          String(r.status).toUpperCase() === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {String(r.status ?? "ISSUED")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rowKey = String(r.id || r.invoice_no || "inv");
                            setOpenDropdownId(openDropdownId === rowKey ? null : rowKey);
                          }}
                          className="inline-flex items-center justify-center p-1 text-blue-500 hover:text-blue-700 transition"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                        {openDropdownId === String(r.id || r.invoice_no || "inv") && (
                          <div 
                            className="absolute right-8 top-8 z-50 w-64 rounded-md bg-white shadow-xl border border-slate-200 text-left text-[13px] text-slate-700 font-normal divide-y divide-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={() => { setPreviewingInvoice(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Eye className="h-4 w-4 text-slate-400" /> View
                            </button>
                            <button onClick={() => { handleDownload && handleDownload(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Download className="h-4 w-4 text-slate-400" /> Download
                            </button>
                            <button onClick={() => { handleDuplicate && handleDuplicate(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Invoice
                            </button>
                            <button onClick={() => { handleEmail && handleEmail(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <Mail className="h-4 w-4 text-slate-400" /> Send Email
                            </button>
                            <button onClick={() => { handleOpenEdit(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Edit Invoice
                            </button>
                            <button onClick={() => { alert("Convert to Sales Return"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Convert to Sales Return
                            </button>
                            <button onClick={() => { alert("Update Return Period"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                            </button>
                            <button onClick={() => { handleDeleteInvoice && handleDeleteInvoice(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-slate-700">
                              <XCircle className="h-4 w-4 text-slate-400" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Invoice Pop-up Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">View / Edit Invoice Details</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{editForm.invoice_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {savedSuccess && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
                Invoice details updated successfully!
              </div>
            )}

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Customer Name</label>
                <input
                  type="text"
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Invoice Number</label>
                  <input
                    type="text"
                    value={editForm.invoice_no}
                    onChange={(e) => setEditForm({ ...editForm, invoice_no: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Invoice Type</label>
                  <select
                    value={editForm.doc_type}
                    onChange={(e) => setEditForm({ ...editForm, doc_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand"
                  >
                    <option value="Tax Invoice">Tax Invoice</option>
                    <option value="Proforma Invoice">Proforma Invoice</option>
                    <option value="Bill of Supply">Bill of Supply</option>
                    <option value="Delivery Challan">Delivery Challan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Invoice Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.total}
                    onChange={(e) => setEditForm({ ...editForm, total: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand"
                >
                  <option value="ISSUED">ISSUED</option>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-full bg-[#1378F8] px-5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-600 shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {previewingInvoice && (
        <InvoiceTemplatePreviewModal
          sale={previewingInvoice}
          onClose={() => setPreviewingInvoice(null)}
        />
      )}
    </div>
  );
}
