"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Search, ArrowUpDown } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";

export function StockLogView({ orgId }: { orgId: string }) {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Fetch inventory stock log / adjustments
    api.acc
      .inventory(orgId)
      .then((data) => {
        if (!alive) return;
        // Transform products into sample stock log records if any
        if (Array.isArray(data)) {
          const sampleLogs: Record<string, unknown>[] = [];
          for (const item of data) {
            const stock = Number(item.qty ?? item.stock ?? 0);
            if (stock > 0) {
              sampleLogs.push({
                id: `log-${item.id}`,
                item: String(item.name ?? "—"),
                stockIn: stock,
                stockOut: "—",
                remarks: "Initial Stock / Purchase",
                date: new Date().toLocaleDateString("en-GB"),
              });
            }
          }
          setLogs(sampleLogs);
        }
      })
      .catch(() => setLogs([]))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  const filteredRows = useMemo(() => {
    return logs.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const item = String(r.item ?? "").toLowerCase();
      const remarks = String(r.remarks ?? "").toLowerCase();
      return item.includes(q) || remarks.includes(q);
    });
  }, [logs, search]);

  function exportCsv() {
    if (logs.length === 0) return;
    const headers = ["Item", "Stock In", "Stock Out", "Remarks", "Date"];
    const csvRows = logs.map((r) => [
      `"${String(r.item ?? "—")}"`,
      `"${String(r.stockIn ?? "—")}"`,
      `"${String(r.stockOut ?? "—")}"`,
      `"${String(r.remarks ?? "—")}"`,
      `"${String(r.date ?? "—")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-6">
      {/* Header Title & Action Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Stock Log</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-brand-50/20 px-4 py-2 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" /> Export
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
                  Item <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer">
                  Stock In <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer">
                  Stock Out <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Remarks <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer">
                  Date <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-muted">
                  Loading stock logs…
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
                <tr key={`${String(r.id || r.item || "stock")}-${idx}`} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-ink">{String(r.item ?? "—")}</td>
                  <td className="px-3 py-3 text-center font-bold text-emerald-600">{String(r.stockIn ?? "—")}</td>
                  <td className="px-3 py-3 text-center font-bold text-red-600">{String(r.stockOut ?? "—")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.remarks ?? "—")}</td>
                  <td className="px-3 py-3 text-center text-muted">{String(r.date ?? "—")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
