"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, Calendar, Link as LinkIcon, Settings, X, FileCheck2 } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function EInvoicingView({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("01-09-2026 - 04-09-2026");
  const [pageSize, setPageSize] = useState(10);
  const [showBanner, setShowBanner] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      api.acc.sales(orgId).catch(() => []),
      api.acc.documents(orgId).catch(() => []),
    ])
      .then(([sales, docs]) => {
        if (!alive) return;
        const result: Record<string, unknown>[] = [];

        // E-invoices from documents
        if (Array.isArray(docs)) {
          const einvoices = docs.filter((d) => String(d.doc_type ?? d.type ?? "").toUpperCase().includes("EINVOICE"));
          result.push(...einvoices);
        }

        // Real user-generated invoices from sales (manual & AI generated)
        if (Array.isArray(sales)) {
          for (const s of sales) {
            const invNo = String(s.invoice_no ?? s.invoiceNo ?? "");
            if (!result.some((r) => String(r.invoice_no ?? "") === invNo)) {
              result.push({
                id: s.id,
                irn: s.irn ?? s.irn_number ?? `36${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                invoice_no: invNo || "INV/2026/001",
                customer_name: s.customer_name ?? s.customerName ?? s.customer ?? "Customer",
                date: s.invoice_date ?? s.date ?? new Date().toLocaleDateString("en-IN"),
                ack_date: s.ack_date ?? s.date ?? new Date().toLocaleDateString("en-IN"),
                amount: Number(s.total_amount ?? s.total ?? 0),
                status: s.status ?? "GENERATED",
              });
            }
          }
        }

        setRows(result);
      })
      .catch(() => setRows([]))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [orgId]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const irn = String(r.irn ?? r.number ?? "").toLowerCase();
      const inv = String(r.invoice_no ?? "").toLowerCase();
      const cust = String(r.customer_name ?? r.customer ?? "").toLowerCase();
      return irn.includes(q) || inv.includes(q) || cust.includes(q);
    });
  }, [rows, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["IRN Number", "Invoice Number", "Customer", "Invoice Date", "Ack Date", "Amount"];
    const csvRows = rows.map((r) => [
      `"${String(r.irn ?? "—")}"`,
      `"${String(r.invoice_no ?? "—")}"`,
      `"${String(r.customer_name ?? r.customer ?? "—")}"`,
      `"${String(r.date ?? "—")}"`,
      `"${String(r.ack_date ?? "—")}"`,
      `"${Number(r.amount ?? r.total ?? 0)}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `einvoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full space-y-4">
      {/* Top Banner */}
      {showBanner && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
          <span>
            Please connect to E-Invoice Portal from <strong className="font-semibold text-amber-950">&quot;Connect to E-Invoice Portal&quot;</strong> button.
          </span>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="text-amber-700 hover:text-amber-950 p-0.5 rounded cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="p-6">
        {/* Header Title & Top Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-brand" /> Manage E-Invoices
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-brand-50/20 px-4 py-2 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white cursor-pointer shadow-sm"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              type="button"
              onClick={() => alert("Connecting to E-Invoice Portal...")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 cursor-pointer shadow-sm"
            >
              <LinkIcon className="h-3.5 w-3.5" /> Connect to E-Invoice Portal
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center rounded-lg border border-border bg-white shadow-sm overflow-hidden w-fit">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink">
              <Calendar className="h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-44 outline-none text-xs text-ink bg-transparent"
              />
            </div>
            <button type="button" className="border-l border-border px-3 py-1.5 bg-slate-50 text-muted hover:text-ink cursor-pointer">
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-lg border border-border bg-white pl-3 pr-8 py-1.5 text-xs text-ink outline-none focus:border-brand shadow-sm"
              />
              <Search className="absolute right-2.5 h-3.5 w-3.5 text-muted" />
            </div>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:border-brand shadow-sm cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 w-full overflow-visible rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">#</th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    IRN Number <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
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
                    Invoice Date <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 cursor-pointer">
                    Amount <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted">
                    Loading e-invoices…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted font-medium">
                    No data available in table
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, pageSize).map((r, idx) => (
                  <tr key={`${String(r.id || r.irn || "einv")}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                    <td className="px-3 py-3 font-mono font-semibold text-ink">{String(r.irn ?? "—")}</td>
                    <td className="px-3 py-3 font-semibold text-ink">{String(r.invoice_no ?? "—")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.customer_name ?? r.customer ?? "—")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.date ?? "—")}</td>
                    <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.amount ?? r.total ?? 0))}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(r)}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink cursor-pointer group"
                        title="View Details & Settings"
                      >
                        <Settings className="h-4 w-4 mx-auto group-hover:rotate-45 transition-transform duration-200" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="E-Invoice"
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
