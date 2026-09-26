"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, Calendar } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function AdvanceAmountView({
  orgId,
  onNewAdvance,
}: {
  orgId: string;
  onNewAdvance: () => void;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState({ start: "2026-09-01", end: "2026-09-03" });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.acc
      .documents(orgId)
      .then((docs) => {
        if (!alive) return;
        const advList = Array.isArray(docs)
          ? docs.filter((d) => String(d.doc_type || d.type || "").toUpperCase().includes("ADVANCE"))
          : [];
        try {
          const local = JSON.parse(localStorage.getItem("vertofi_local_advances") || "[]");
          const localIds = new Set(advList.map((a) => String(a.id || a.reference_id || "")));
          const unmerged = local.filter((l: Record<string, unknown>) => !localIds.has(String(l.id || l.reference_id || "")));
          setRows([...unmerged, ...advList]);
        } catch {
          setRows(advList);
        }
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem("vertofi_local_advances") || "[]");
          setRows(local);
        } catch {
          setRows([]);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const c = String(r.customer_name ?? r.party_name ?? "").trim();
      if (c) set.add(c);
    }
    return Array.from(set);
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase().trim();
      const cust = String(r.customer_name ?? r.party_name ?? "").toLowerCase();
      const ref = String(r.reference_id ?? r.reference ?? "").toLowerCase();
      const invNo = String(r.invoice_no ?? r.number ?? "").toLowerCase();

      if (selectedCustomer !== "ALL" && String(r.customer_name ?? r.party_name ?? "") !== selectedCustomer) {
        return false;
      }

      if (!q) return true;
      return cust.includes(q) || ref.includes(q) || invNo.includes(q);
    });
  }, [rows, search, selectedCustomer]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = [
      "Customer",
      "Reference ID",
      "Payment Date",
      "Tax Type",
      "Total Tax",
      "Total Cess",
      "Total Taxable",
      "Place Of Supply",
      "Invoice Number",
    ];
    const csvRows = rows.map((r) => [
      `"${String(r.customer_name ?? r.party_name ?? "—")}"`,
      `"${String(r.reference_id ?? r.reference ?? "—")}"`,
      `"${String(r.payment_date ?? r.date ?? "—").slice(0, 10)}"`,
      `"${String(r.tax_type ?? "Intra State")}"`,
      `"${Number(r.total_tax ?? 0)}"`,
      `"${Number(r.total_cess ?? 0)}"`,
      `"${Number(r.taxable ?? 0)}"`,
      `"${String(r.place_of_supply ?? "Telangana")}"`,
      `"${String(r.invoice_no ?? "—")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tax_liability_advance_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-6">
      {/* Header Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Tax Liability (Advance Received)</h2>
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
            onClick={onNewAdvance}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] px-4 py-2 text-xs font-semibold text-white transition cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Advance Amount
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        {/* Customer & Status Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-48 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-brand shadow-sm cursor-pointer"
          >
            <option value="ALL">Select Customer</option>
            {customerOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-brand shadow-sm cursor-pointer"
          >
            <option value="ALL">All</option>
            <option value="ADJUSTED">Adjusted</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 w-full overflow-visible rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
            <tr>
              <th className="px-3 py-2.5 text-center">#</th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Customer <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Reference ID <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Payment Date <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Tax Type <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1 cursor-pointer">
                  Total Tax <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1 cursor-pointer">
                  Total Cess <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1 cursor-pointer">
                  Total Taxable <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Place Of Supply <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Invoice Number <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-xs text-muted">
                  Loading advance amounts…
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
                <tr key={`${String(r.id || r.reference_id || "adv")}-${idx}`} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-ink">{String(r.customer_name ?? r.party_name ?? "—")}</td>
                  <td className="px-3 py-3 text-brand font-medium">{String(r.reference_id ?? r.reference ?? "ADV-001")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.payment_date ?? r.date ?? "Today").slice(0, 10)}</td>
                  <td className="px-3 py-3 text-muted">{String(r.tax_type ?? "Intra State")}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.total_tax ?? 0))}</td>
                  <td className="px-3 py-3 text-right text-muted">{inr(Number(r.total_cess ?? 0))}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.taxable ?? 0))}</td>
                  <td className="px-3 py-3 text-muted">{String(r.place_of_supply ?? "Telangana")}</td>
                  <td className="px-3 py-3 font-medium text-brand">{String(r.invoice_no ?? "—")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
