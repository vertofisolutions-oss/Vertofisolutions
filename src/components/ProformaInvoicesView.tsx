"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search, Calendar, ArrowUpDown, Eye, Trash2 } from "lucide-react";
import { Card } from "@/ui";
import { InvoiceTemplatePreviewModal } from "./ReportsCenter";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const num = (v: unknown) => Number(v ?? 0) || 0;

export function ProformaInvoicesView({ orgId, rows = [], loading, onNewInvoice }: {
  orgId: string; rows?: Record<string, unknown>[]; loading?: boolean;
  onNewInvoice: () => void;
}) {
  const [localRows, setLocalRows] = useState<Record<string, unknown>[]>(rows);
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

  const filteredRows = useMemo(() => {
    return localRows.filter((r) => {
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

      <div className="w-full overflow-hidden border border-border shadow-sm">
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
        <div className="overflow-x-auto bg-white">
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
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setPreviewingInvoice(r)}
                          className="inline-flex items-center gap-1 text-brand hover:underline font-semibold cursor-pointer"
                          title="View Generated Proforma Invoice"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(r)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                          title="Delete Proforma Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
