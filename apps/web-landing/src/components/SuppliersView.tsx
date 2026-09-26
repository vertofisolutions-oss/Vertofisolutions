"use client";
import { useMemo, useState, useEffect } from "react";
import { Plus, Download, Search, ArrowUpDown, UserMinus } from "lucide-react";

function dedupeSuppliers(list: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const item of list) {
    const key = String(item.id || `${item.name}-${item.phone || item.mobile || ""}`);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function SuppliersView({
  orgId,
  rows = [],
  loading = false,
  reload,
  onNewSupplier,
}: {
  orgId: string;
  rows?: Record<string, unknown>[];
  loading?: boolean;
  reload?: () => void;
  onNewSupplier?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplierList, setSupplierList] = useState<Record<string, unknown>[]>(() => {
    let combined: Record<string, unknown>[] = Array.isArray(rows) && rows.length > 0 ? [...rows] : [];
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("vertofi_local_suppliers") || "[]");
        if (Array.isArray(stored) && stored.length > 0) {
          combined = [...stored, ...combined];
        }
      } catch {}
    }
    // Removed mock data
    return dedupeSuppliers(combined);
  });

  useEffect(() => {
    if (Array.isArray(rows) && rows.length > 0) {
      setSupplierList((prev) => dedupeSuppliers([...rows, ...prev]));
    }
  }, [rows]);

  const filteredRows = useMemo(() => {
    return supplierList.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const name = String(r.name ?? r.supplier_name ?? "").toLowerCase();
      const legal = String(r.legal_name ?? "").toLowerCase();
      const phone = String(r.phone ?? r.mobile ?? "").toLowerCase();
      const gstin = String(r.gstin ?? "").toLowerCase();
      return name.includes(q) || legal.includes(q) || phone.includes(q) || gstin.includes(q);
    });
  }, [supplierList, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["Name", "Legal Name", "Email", "Phone", "GSTIN / UIN", "Return Status", "Status"];
    const csvRows = rows.map((r) => [
      `"${String(r.name ?? r.supplier_name ?? "—")}"`,
      `"${String(r.legal_name ?? "—")}"`,
      `"${String(r.email ?? "—")}"`,
      `"${String(r.phone ?? r.mobile ?? "—")}"`,
      `"${String(r.gstin ?? "—")}"`,
      `"—"`, // Return Status placeholder
      `"${String(r.status ?? "ACTIVE")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `suppliers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function toggleAll() {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r, i) => String(r.id ?? i))));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  return (
    <div className="w-full space-y-4">
      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
        
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
          <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">Manage Suppliers</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#3182ce] px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-xs cursor-pointer"
            >
              Export <Download className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onNewSupplier}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-xs font-bold text-white transition hover:bg-green-600 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add New Supplier
            </button>

            <button
              type="button"
              onClick={() => alert("Select suppliers to deactivate")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            >
              <UserMinus className="h-4 w-4 text-slate-400" /> De-activate Supplier
            </button>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-px bg-slate-200/80 w-full" />

        {/* Toolbar (Search & Page Size on Right) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-1">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 sm:w-60 px-3.5 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                className="border-l border-slate-300 px-3.5 py-2.5 bg-[#e2e8f0]/60 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-red-500 shadow-2xs cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="w-full overflow-visible rounded-lg border border-slate-200/80 mt-2">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-[#f4f6f8] text-[12px] font-semibold text-slate-700">
              <tr>
                <th className="px-3.5 py-3 text-center w-12 border-r border-slate-200/50">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                      onChange={toggleAll}
                      className="rounded accent-red-500 cursor-pointer"
                    />
                    <span>#</span>
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Name</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Legal Name</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Email</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Phone</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>GSTIN / UIN</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Return Status</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50 text-center">
                  <div className="flex items-center justify-between gap-1">
                    <span>Status</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 text-center">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[13px] text-slate-500">
                    Loading suppliers…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[13px] text-[#006666] font-medium tracking-wide">
                    No data available in table
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, pageSize).map((r, idx) => {
                  const rowKey = `${String(r.id || "sup")}-${idx}`;
                  const rowId = String(r.id ?? idx);
                  const isSelected = selectedIds.has(rowId);
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 text-center text-slate-500 font-medium border-r border-slate-100">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(rowId)}
                            className="rounded accent-red-500 cursor-pointer"
                          />
                          <span>{idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800 border-r border-slate-100">{String(r.name ?? r.supplier_name ?? "—")}</td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100">{String(r.legal_name ?? "—")}</td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100">{String(r.email ?? "—")}</td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100">{String(r.phone ?? r.mobile ?? "—")}</td>
                      <td className="px-3 py-3 font-mono text-slate-600 border-r border-slate-100">{String(r.gstin ?? "—")}</td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100">—</td>
                      <td className="px-3 py-3 text-center border-r border-slate-100">
                        <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          {String(r.status ?? "ACTIVE")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-400">
                        —
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
