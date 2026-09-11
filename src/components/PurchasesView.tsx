"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, Calendar, Settings, Sparkles, FileText, Upload, Trash2 } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function PurchasesView({
  orgId,
  onNewPurchase,
}: {
  orgId: string;
  onNewPurchase: () => void;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("vertofi_local_purchases");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState({ start: "2026-09-01", end: "2026-09-03" });
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);

  function handleDeletePurchase(r: Record<string, unknown>) {
    if (!confirm("Are you sure you want to delete this purchase record?")) return;
    const targetId = String(r.id ?? r.bill_no ?? r.purchase_no);
    setRows((prev) => {
      const updated = prev.filter((item) => String(item.id ?? item.bill_no ?? item.purchase_no) !== targetId);
      try {
        localStorage.setItem("vertofi_local_purchases", JSON.stringify(updated));
      } catch (_e) {}
      return updated;
    });
    const oid = orgId || "demo-business-org";
    void fetch(`/api/v1/accounting/${oid}/purchases/${encodeURIComponent(targetId)}`, { method: "DELETE" }).catch(() => {});
  }

  useEffect(() => {
    let alive = true;
    api.acc
      .purchases(orgId)
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) setRows(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [orgId]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const pNo = String(r.bill_no ?? r.purchase_no ?? r.number ?? "").toLowerCase();
      const supp = String(r.vendor_name ?? r.supplier_name ?? "").toLowerCase();
      return pNo.includes(q) || supp.includes(q);
    });
  }, [rows, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["Purchase Number", "Supplier", "Date", "Amount", "Status"];
    const csvRows = rows.map((r) => [
      `"${String(r.bill_no ?? r.purchase_no ?? "—")}"`,
      `"${String(r.vendor_name ?? r.supplier_name ?? "—")}"`,
      `"${String(r.date ?? "—").slice(0, 10)}"`,
      `"${Number(r.total ?? 0)}"`,
      `"${String(r.status ?? "PAID")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchases_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full space-y-4">
      {/* Command Center Card */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-slate-700">Command Center</span>
          <span className="text-slate-300">—</span>
          <span>Create Tax Invoice · New Quotation · Show overdue customers · Generate P&L</span>
        </div>
        <button className="rounded bg-[#1378F8] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-600 transition">
          Run
        </button>
      </div>

      {/* Upload Bill Card */}
      <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <FileText className="h-5 w-5 text-[#1378F8]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Upload a purchase bill</h3>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Drop a vendor bill (PDF/JPG/PNG). Vertofi extracts the line items, GST & totals into a reviewable draft — no typing.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-slate-900">Vendor purchase bill</p>
            <p className="text-[12px] text-slate-500">PDF, JPG or PNG</p>
          </div>
          <button className="flex items-center gap-2 rounded-md border border-slate-200 px-4 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
            <Upload className="h-4 w-4" /> Upload
          </button>
        </div>
      </div>

      <Card className="p-6">
        {/* Header Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Manage Purchase</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-brand-50/20 px-4 py-2 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            onClick={onNewPurchase}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Purchase
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Date range picker */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 shadow-sm">
          <Calendar className="h-4 w-4 text-muted shrink-0" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="text-xs text-ink bg-transparent outline-none"
          />
          <span className="text-xs text-muted">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="text-xs text-ink bg-transparent outline-none"
          />
          <Search className="h-3.5 w-3.5 text-muted ml-1" />
        </div>

        {/* Search box & Page size select */}
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
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
            <tr>
              <th className="px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Purchase Number <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Supplier <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Date <ArrowUpDown className="h-3 w-3 text-muted/60" />
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
              <th className="px-3 py-2.5 text-center">Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted">
                  Loading purchases…
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
                <tr key={`${String(r.id || r.bill_no || "pur")}-${idx}`} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-brand">{String(r.bill_no ?? r.purchase_no ?? "PUR-001")}</td>
                  <td className="px-3 py-3 font-medium text-ink">{String(r.vendor_name ?? r.supplier_name ?? "—")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.date ?? "Today").slice(0, 10)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.total ?? 0))}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {String(r.status ?? "PAID")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(r)}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink cursor-pointer group"
                        title="View Details & Settings"
                      >
                        <Settings className="h-4 w-4 mx-auto group-hover:rotate-45 transition-transform duration-200" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePurchase(r)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                        title="Delete Purchase"
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
      </Card>

      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="Purchase"
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
