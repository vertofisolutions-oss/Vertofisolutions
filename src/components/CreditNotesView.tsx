"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, Calendar, Settings, Trash2 } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function CreditNotesView({
  orgId,
  onNewCreditNote,
}: {
  orgId: string;
  onNewCreditNote: () => void;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState({ start: "2026-09-01", end: "2026-09-03" });
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.acc
      .documents(orgId)
      .then((docs) => {
        if (!alive) return;
        const cnList = Array.isArray(docs)
          ? docs.filter((d) => String(d.doc_type || d.type || "").toUpperCase().includes("CREDIT_NOTE"))
          : [];
        setRows(cnList);
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
      const cnNo = String(r.doc_number ?? r.credit_note_no ?? r.number ?? "").toLowerCase();
      const origInv = String(r.reference ?? r.original_invoice_no ?? "").toLowerCase();
      const cust = String(r.customer_name ?? r.party_name ?? "").toLowerCase();
      return cnNo.includes(q) || origInv.includes(q) || cust.includes(q);
    });
  }, [rows, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["Credit Note No.", "Original Invoice No.", "Invoice Type", "Customer", "Date", "Return Period", "Amount", "Status"];
    const csvRows = rows.map((r) => [
      `"${String(r.doc_number ?? r.credit_note_no ?? "—")}"`,
      `"${String(r.reference ?? "—")}"`,
      `"${String(r.doc_type ?? "Credit Note")}"`,
      `"${String(r.date ?? "—").slice(0, 10)}"`,
      `"${String(r.return_period ?? "09-2026")}"`,
      `"${Number(r.total ?? 0)}"`,
      `"${String(r.status ?? "ISSUED")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `credit_notes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleDelete(record: Record<string, unknown>) {
    const docNo = String(record.doc_number ?? record.number ?? "this credit note");
    if (typeof window !== "undefined" && !window.confirm(`Are you sure you want to delete ${docNo}?`)) {
      return;
    }
    setRows((prev) => prev.filter((it) => it.id !== record.id && it !== record));
    if (selectedRecord && (selectedRecord.id === record.id || selectedRecord === record)) {
      setSelectedRecord(null);
    }
  }

  return (
    <Card className="p-6 bg-white border border-border space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Manage Credit Notes</h2>
          <p className="text-xs text-muted mt-0.5">Track, reconcile and settle issued credit notes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand transition cursor-pointer shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={onNewCreditNote}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1378F8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Create Credit Note
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-muted shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-muted" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="bg-transparent text-xs text-ink outline-none cursor-pointer"
            />
            <span>-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="bg-transparent text-xs text-ink outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-white pl-3 pr-8 py-1.5 text-xs text-ink outline-none focus:border-brand shadow-sm"
            />
            <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted" />
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
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
            <tr>
              <th className="px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5">Credit Note No.</th>
              <th className="px-3 py-2.5">Original Invoice No.</th>
              <th className="px-3 py-2.5">Invoice Type</th>
              <th className="px-3 py-2.5">Customer</th>
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Return Period</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-center">Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-xs text-muted">
                  Loading credit notes…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-xs text-muted font-medium">
                  No data available in table
                </td>
              </tr>
            ) : (
              filteredRows.slice(0, pageSize).map((r, idx) => (
                <tr key={`${String(r.id || r.doc_number || "cn")}-${idx}`} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-brand">{String(r.doc_number ?? r.number ?? "CN-001")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.reference ?? "INV-001")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.doc_type ?? "Credit Note")}</td>
                  <td className="px-3 py-3 font-medium text-ink">{String(r.customer_name ?? r.party_name ?? "—")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.date ?? "Today").slice(0, 10)}</td>
                  <td className="px-3 py-3 text-muted">{String(r.return_period ?? "09-2026")}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.total ?? 0))}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {String(r.status ?? "ISSUED")}
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
                        onClick={() => handleDelete(r)}
                        className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                        title="Delete Credit Note"
                      >
                        <Trash2 className="h-4 w-4 mx-auto" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="Credit Note"
        onClose={() => setSelectedRecord(null)}
        onDelete={handleDelete}
      />
    </Card>
  );
}
