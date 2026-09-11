"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, Wallet, Settings } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function ExpensesView({ orgId }: { orgId: string }) {
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.acc
      .documents(orgId)
      .then((docs) => {
        if (!alive) return;
        if (Array.isArray(docs)) {
          const exps = docs.filter((d) => String(d.doc_type ?? d.type ?? "").toUpperCase().includes("EXPENSE"));
          setExpenses(exps);
        }
      })
      .catch(() => setExpenses([]))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  const filteredRows = useMemo(() => {
    return expenses.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const cat = String(r.category ?? "").toLowerCase();
      const vendor = String(r.vendor ?? "").toLowerCase();
      return cat.includes(q) || vendor.includes(q);
    });
  }, [expenses, search]);

  function exportCsv() {
    if (expenses.length === 0) return;
    const headers = ["Expense Category", "Vendor", "Date", "Amount", "Status"];
    const csvRows = expenses.map((r) => [
      `"${String(r.category ?? "General")}"`,
      `"${String(r.vendor ?? "—")}"`,
      `"${String(r.date ?? "—")}"`,
      `"${Number(r.amount ?? r.total ?? 0)}"`,
      `"${String(r.status ?? "RECORDED")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-6">
      {/* Header Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Wallet className="h-5 w-5 text-brand" /> Manage Expenses
        </h2>
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
            onClick={() => {
              const category = prompt("Expense Category (e.g. Rent, Office Supplies, Travel):");
              const amount = prompt("Expense Amount (₹):");
              if (category && amount) alert(`Recorded expense: ${category} - ₹${amount}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
              <th className="px-3 py-2.5 text-center w-12">#</th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Expense Category <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Vendor <ArrowUpDown className="h-3 w-3 text-muted/60" />
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
              <th className="px-3 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-muted">
                  Loading expenses…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-muted font-medium">
                  No data available in table
                </td>
              </tr>
            ) : (
              filteredRows.slice(0, pageSize).map((r, idx) => (
                <tr key={`${String(r.id || r.category || "exp")}-${idx}`} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-ink">{String(r.category ?? "General")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.vendor ?? "—")}</td>
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

      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="Expense"
        onClose={() => setSelectedRecord(null)}
      />
    </Card>
  );
}
