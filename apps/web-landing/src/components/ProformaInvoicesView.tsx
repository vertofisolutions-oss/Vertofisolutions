"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search, Calendar, ArrowUpDown, Eye, Trash2, MoreHorizontal, RefreshCw, Mail, XCircle } from "lucide-react";
import { Card } from "@/ui";
import { StandardGSTInvoiceModal as InvoiceTemplatePreviewModal } from "./StandardGSTInvoiceModal";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const num = (v: unknown) => Number(v ?? 0) || 0;


function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "gold" | "brand" }) {
  return (
    <Card className="py-3 px-4 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <Icon className={"h-4 w-4 " + (tone === "gold" ? "text-gold" : "text-brand")} />
      </div>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
    </Card>
  );
}

export function ProformaInvoicesView({ orgId, rows = [], loading, onNewInvoice, setSelectedRecord, handleDownload, handleDuplicate, handleEmail, handleOpenEdit, handleDeletePurchase, handleDeleteProforma, handleDelete }: {
  orgId: string; rows?: Record<string, unknown>[]; loading?: boolean;
  onNewInvoice: () => void;
  setSelectedRecord?: (record: Record<string, unknown>) => void;
  handleDownload?: (record: Record<string, unknown>) => void;
  handleDuplicate?: (record: Record<string, unknown>) => void;
  handleEmail?: (record: Record<string, unknown>) => void;
  handleOpenEdit?: (record: Record<string, unknown>) => void;
  handleDeletePurchase?: (record: Record<string, unknown>) => void;
  handleDeleteProforma?: (record: Record<string, unknown>) => void;
  handleDelete?: (record: Record<string, unknown>) => void;
}) {
  const [localRows, setLocalRows] = useState<Record<string, unknown>[]>(rows);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [previewingInvoice, setPreviewingInvoice] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  function handleDeleteInvoice(r: Record<string, unknown>) {
    if (!confirm("Are you sure you want to delete this proforma invoice?")) return;
    const targetId = String(r.id ?? r.invoice_no ?? r.invoiceNo);
    setLocalRows((prev) => {
      const updated = prev.filter((item) => {
        const itemKey = String(item.id ?? item.invoice_no ?? item.invoiceNo);
        return itemKey !== targetId;
      });
      try {
        localStorage.setItem("vertofi_local_proforma", JSON.stringify(updated));
        const localSales = localStorage.getItem("vertofi_local_sales");
        if (localSales) {
          const parsed = JSON.parse(localSales);
          if (Array.isArray(parsed)) {
            const newSales = parsed.filter((item) => String(item.id ?? item.invoice_no ?? item.invoiceNo) !== targetId);
            localStorage.setItem("vertofi_local_sales", JSON.stringify(newSales));
          }
        }
      } catch (_e) {}
      return updated;
    });

    const oid = orgId || "demo-business-org";
    void fetch(`/api/v1/accounting/${oid}/sales/${encodeURIComponent(targetId)}`, { method: "DELETE" }).catch(() => {});
  }

  
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let monthProformas = 0, total = 0, convertedCount = 0, localGst = 0;
    for (const r of rows) {
      const t = Number(r.total || r.amount || 0);
      total += t;
      if (String(r.date || "").startsWith(ym)) monthProformas += t;
      if (String(r.status || "").toUpperCase() === "ACCEPTED" || String(r.status || "").toUpperCase() === "CONVERTED") convertedCount++;
      localGst += Number(r.tax || r.totalTax || 0);
    }
    return { monthProformas, total, convertedCount, localGst };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return localRows.filter((r) => {
      const docType = String(r.doc_type ?? r.docType ?? "").toUpperCase();
      if (docType !== "PROFORMA INVOICE") return false;
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const invNo = String(r.invoice_no ?? r.invoiceNo ?? "").toLowerCase();
      const cust = String(r.customer_name ?? r.customerName ?? "").toLowerCase();
      const status = String(r.status ?? "").toLowerCase();
      return invNo.includes(q) || cust.includes(q) || status.includes(q);
    });
  }, [localRows, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["Invoice Number", "Customer", "Invoice Type", "Invoice Date", "Return Period", "Amount", "Invoice Exist"];
    const csvRows = rows.map((r) => [
      `"${String(r.invoice_no ?? "—")}"`,
      `"${String(r.customer_name ?? "—")}"`,
      `"${String(r.doc_type ?? "Proforma Invoice")}"`,
      `"${String(r.date ?? r.issue_date ?? "—").slice(0, 10)}"`,
      `"${String(r.return_period ?? "09-2026")}"`,
      `"${num(r.total)}"`,
      `"No"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `proforma_invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-5 bg-white p-6 rounded-lg min-h-[70vh]">
      {/* Header Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight text-ink">Proforma Sales Invoices</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
          >
            Export <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNewInvoice}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-[13px] font-bold text-white transition hover:bg-green-600 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Proforma Invoice
          </button>
        </div>
      </div>

      <div className="w-full overflow-visible border border-border shadow-sm">
        {/* Filter & Search Toolbar */}
        <div className="flex flex-col gap-3 p-4 bg-white border-b border-border sm:flex-row sm:items-center sm:justify-between">
          {/* Date range picker */}
          <div className="flex items-center rounded border border-border overflow-hidden">
            <div className="flex items-center bg-white px-3 py-1.5 border-r border-border min-w-[200px]">
              <Calendar className="h-4 w-4 text-muted shrink-0 mr-2" />
              <span className="text-[13px] text-ink font-medium">01-09-2026 - 05-09-2026</span>
            </div>
            <button className="bg-slate-100 px-3 py-1.5 hover:bg-slate-200 transition">
              <Search className="h-4 w-4 text-muted" />
            </button>
          </div>

          {/* Search box & Page size select */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded border border-border overflow-hidden">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-48 bg-white px-3 py-1.5 text-[13px] text-ink outline-none"
              />
              <button className="bg-slate-100 px-3 py-1.5 hover:bg-slate-200 border-l border-border transition">
                <Search className="h-4 w-4 text-muted" />
              </button>
            </div>
            <div className="flex items-center rounded border border-border bg-white overflow-hidden">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-1.5 text-[13px] text-ink outline-none cursor-pointer bg-transparent pr-4"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-visible bg-white">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="border-b border-border bg-slate-50 text-[12px] font-bold text-ink">
              <tr>
                <th className="border-r border-border px-3 py-3 w-10 text-center">#</th>
                <th className="border-r border-border px-3 py-3">Invoice Number <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted" /></th>
                <th className="border-r border-border px-3 py-3">Customer <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted" /></th>
                <th className="border-r border-border px-3 py-3">Invoice Type <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted" /></th>
                <th className="border-r border-border px-3 py-3">Invoice Date <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted" /></th>
                <th className="border-r border-border px-3 py-3">Return Period <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted" /></th>
                <th className="border-r border-border px-3 py-3">Amount <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted" /></th>
                <th className="border-r border-border px-3 py-3 text-center">Invoice Exist <ArrowUpDown className="inline h-3 w-3 ml-1 text-muted" /></th>
                <th className="px-3 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[13px] text-muted">Loading...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-[13px] font-medium text-[#0b7482]">No data available in table</td>
                </tr>
              ) : (
                filteredRows.slice(0, pageSize).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="border-r border-border px-3 py-2.5 text-center text-ink">{i + 1}</td>
                    <td className="border-r border-border px-3 py-2.5 font-medium text-brand">
                      {String(r.invoice_no ?? r.invoiceNo ?? "—")}
                    </td>
                    <td className="border-r border-border px-3 py-2.5 text-ink">
                      {String(r.customer_name ?? r.customerName ?? "—")}
                    </td>
                    <td className="border-r border-border px-3 py-2.5 text-ink">
                      {String(r.doc_type ?? "Proforma Invoice")}
                    </td>
                    <td className="border-r border-border px-3 py-2.5 text-ink">
                      {String(r.date ?? r.issue_date ?? "—").slice(0, 10)}
                    </td>
                    <td className="border-r border-border px-3 py-2.5 text-ink">
                      {String(r.return_period ?? "09-2026")}
                    </td>
                    <td className="border-r border-border px-3 py-2.5 text-ink">
                      {inr(num(r.total))}
                    </td>
                    <td className="border-r border-border px-3 py-2.5 text-center text-ink">
                      No
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rowKey = String(r.id || r.invoice_no || r.bill_no || r.proforma_no || r.cn_no || r.dn_no || r.dc_no || "doc");
                            setOpenDropdownId(openDropdownId === rowKey ? null : rowKey);
                          }}
                          className="inline-flex items-center justify-center p-1 text-blue-500 hover:text-blue-700 transition cursor-pointer"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                        {openDropdownId === String(r.id || r.invoice_no || r.bill_no || r.proforma_no || r.cn_no || r.dn_no || r.dc_no || "doc") && (
                          <div 
                            className="absolute right-8 top-8 z-50 w-64 rounded-md bg-white shadow-xl border border-slate-200 text-left text-[13px] text-slate-700 font-normal divide-y divide-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={() => { setPreviewingInvoice(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Eye className="h-4 w-4 text-slate-400" /> View
                            </button>
                            <button onClick={() => { if(handleDownload) handleDownload(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Download className="h-4 w-4 text-slate-400" /> Download
                            </button>
                            <button onClick={() => { if(handleDuplicate) handleDuplicate(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Proforma Invoice
                            </button>
                            <button onClick={() => { if(handleEmail) handleEmail(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Mail className="h-4 w-4 text-slate-400" /> Send Email
                            </button>
                            <button onClick={() => { if(handleOpenEdit) handleOpenEdit(r); else if(setSelectedRecord) setSelectedRecord(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Edit Proforma Invoice
                            </button>
                            <button onClick={() => { alert("Convert to Sales Return"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Convert to Sales Return
                            </button>
                            <button onClick={() => { alert("Update Return Period"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                            </button>
                            <button onClick={() => { 
                                handleDeleteInvoice(r);
                                setOpenDropdownId(null); 
                            }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer">
                              <XCircle className="h-4 w-4 text-slate-400" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Proforma Invoice Preview Modal (Normal PDF, no template strip) */}
      {previewingInvoice && (
        <InvoiceTemplatePreviewModal
          sale={{
            ...previewingInvoice,
            doc_type: "Proforma Invoice",
            isProforma: true,
          }}
          isProforma={true}
          onClose={() => setPreviewingInvoice(null)}
        />
      )}
    </div>
  );
}
