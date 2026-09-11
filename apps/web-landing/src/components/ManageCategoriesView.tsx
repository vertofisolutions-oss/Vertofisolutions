"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, Settings, Trash2 } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function ManageCategoriesView({
  orgId,
  onNewCategory,
}: {
  orgId: string;
  onNewCategory: () => void;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);

  function handleDeleteCategory(r: Record<string, unknown>) {
    const catName = String(r.name ?? "this category");
    if (!confirm(`Are you sure you want to delete the category "${catName}"?`)) return;
    setRows((prev) => prev.filter((item) => String(item.name) !== String(r.name) && String(item.id) !== String(r.id)));
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.acc
      .products(orgId)
      .then((prods) => {
        if (!alive) return;
        // Group products by category
        const catMap = new Map<string, { totalProducts: number; stockQty: number; worth: number }>();
        if (Array.isArray(prods)) {
          for (const p of prods) {
            const name = String(p.category ?? "Default Category");
            const curr = catMap.get(name) || { totalProducts: 0, stockQty: 0, worth: 0 };
            const q = Number(p.qty ?? p.stock ?? 0);
            const rate = Number(p.selling_price ?? p.rate ?? 0);
            catMap.set(name, {
              totalProducts: curr.totalProducts + 1,
              stockQty: curr.stockQty + q,
              worth: curr.worth + q * rate,
            });
          }
        }
        const list = Array.from(catMap.entries()).map(([name, stat], idx) => ({
          id: `cat-${idx}`,
          name,
          totalProducts: stat.totalProducts,
          stockQty: stat.stockQty,
          worth: stat.worth,
        }));
        setRows(list);
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
      return String(r.name ?? "").toLowerCase().includes(q);
    });
  }, [rows, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["Name", "Total Products", "Stock Quantity", "Worth (Sales/Stock)"];
    const csvRows = rows.map((r) => [
      `"${String(r.name ?? "—")}"`,
      `"${Number(r.totalProducts ?? 0)}"`,
      `"${Number(r.stockQty ?? 0)}"`,
      `"${Number(r.worth ?? 0)}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `product_categories_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-6">
      {/* Header Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Manage Product Categories</h2>
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
            onClick={onNewCategory}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add New Category
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
                  Name <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer">
                  Total Products <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer">
                  Stock Quantity <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1 cursor-pointer">
                  Worth (Sales/Stock) <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-muted">
                  Loading categories…
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
                <tr key={`${String(r.id || r.name || "cat")}-${idx}`} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-ink">{String(r.name ?? "—")}</td>
                  <td className="px-3 py-3 text-center text-muted font-medium">{Number(r.totalProducts ?? 0)}</td>
                  <td className="px-3 py-3 text-center text-muted font-medium">{Number(r.stockQty ?? 0)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.worth ?? 0))}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink cursor-pointer group"
                        title="Settings"
                      >
                        <Settings className="h-4 w-4 mx-auto group-hover:rotate-45 transition-transform duration-200" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(r)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                        title="Delete Category"
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
  );
}
