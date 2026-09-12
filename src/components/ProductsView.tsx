"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, ShoppingCart, Tag, Trash2, Settings, AlertCircle } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

function dedupeProducts(list: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const item of list) {
    const key = String(item.id || `${item.name}-${item.code || ""}`);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function ProductsView({
  orgId,
  rows = [],
  loading = false,
  reload,
  onNewProduct,
}: {
  orgId: string;
  rows?: Record<string, unknown>[];
  loading?: boolean;
  reload?: () => void;
  onNewProduct?: () => void;
}) {
  const [items, setItems] = useState<Record<string, unknown>[]>(() => {
    let combined: Record<string, unknown>[] = Array.isArray(rows) && rows.length > 0 ? [...rows] : [];
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("vertofi_local_products") || "[]");
        if (Array.isArray(stored) && stored.length > 0) {
          const filtered = stored.filter(
            (it: Record<string, unknown>) => !["pr-1", "pr-2", "pr-3"].includes(String(it.id))
          );
          if (filtered.length !== stored.length) {
            localStorage.setItem("vertofi_local_products", JSON.stringify(filtered));
          }
          combined = [...filtered, ...combined];
        }
      } catch {}
    }
    // No seed data — only user-created products are shown
    return dedupeProducts(combined);
  });
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let alive = true;

    function syncProducts() {
      if (typeof window === "undefined") return;
      try {
        const stored = JSON.parse(localStorage.getItem("vertofi_local_products") || "[]");
        if (Array.isArray(stored)) {
          setItems((prev) => dedupeProducts([...stored, ...prev]));
        }
      } catch {}
    }

    syncProducts();

    api.acc
      .products(orgId)
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) {
          setItems((prev) => dedupeProducts([...prev, ...data]));
        }
      })
      .catch(() => {});

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vertofi_local_products") syncProducts();
    };
    const handleCustom = () => syncProducts();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("vertofi-products-changed", handleCustom);

    return () => {
      alive = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vertofi-products-changed", handleCustom);
    };
  }, [orgId]);

  const kpis = useMemo(() => {
    let inStock = 0;
    let outOfStock = 0;
    const total = items.length;

    for (const item of items) {
      const qty = Number(item.qty ?? item.stock ?? 0);
      if (qty > 0) inStock++;
      else outOfStock++;
    }

    return { inStock, outOfStock, total };
  }, [items]);

  const filteredRows = useMemo(() => {
    return items.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const name = String(r.name ?? "").toLowerCase();
      const code = String(r.code ?? r.hsn ?? "").toLowerCase();
      const cat = String(r.category ?? "").toLowerCase();
      return name.includes(q) || code.includes(q) || cat.includes(q);
    });
  }, [items, search]);

  function exportCsv() {
    if (items.length === 0) return;
    const headers = ["Name", "Qty", "Code", "Category", "Selling Price", "Purchase Price", "Tax %"];
    const csvRows = items.map((r) => [
      `"${String(r.name ?? "—")}"`,
      `"${Number(r.qty ?? r.stock ?? 0)}"`,
      `"${String(r.code ?? r.hsn ?? "—")}"`,
      `"${String(r.category ?? "General")}"`,
      `"${Number(r.selling_price ?? r.rate ?? 0)}"`,
      `"${Number(r.purchase_price ?? 0)}"`,
      `"${Number(r.tax_rate ?? 18)}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products_${Date.now()}.csv`);
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

  function handleDelete(record: Record<string, unknown>) {
    const name = String(record.name ?? "this product");
    if (typeof window !== "undefined" && !window.confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }
    setItems((prev) => {
      const updated = prev.filter((it) => it.id !== record.id && it !== record);
      try {
        localStorage.setItem("vertofi_local_products", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedRecord && (selectedRecord.id === record.id || selectedRecord === record)) {
      setSelectedRecord(null);
    }
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) {
      alert("Please select at least one product to delete.");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(`Are you sure you want to delete ${selectedIds.size} selected products?`)) {
      return;
    }
    setItems((prev) => {
      const updated = prev.filter((r, idx) => !selectedIds.has(String(r.id ?? idx)));
      try {
        localStorage.setItem("vertofi_local_products", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: In Stock */}
        <Card className="p-5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink">{kpis.inStock}</p>
              <p className="text-xs font-semibold text-muted">In Stock</p>
            </div>
          </div>
        </Card>

        {/* Card 2: Out Of Stock */}
        <Card className="p-5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink">{kpis.outOfStock}</p>
              <p className="text-xs font-semibold text-muted">Out Of Stock</p>
            </div>
          </div>
        </Card>

        {/* Card 3: Total */}
        <Card className="p-5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink">{kpis.total}</p>
              <p className="text-xs font-semibold text-muted">Total</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Manage Products Card */}
      <Card className="p-6">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">Manage Products</h2>
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
              onClick={onNewProduct}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add New Product
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition cursor-pointer shadow-sm ${
                selectedIds.size > 0
                  ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  : "border-border bg-white text-muted hover:bg-slate-50"
              }`}
            >
              <Trash2 className={`h-4 w-4 ${selectedIds.size > 0 ? "text-rose-600" : "text-muted"}`} />
              Delete Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
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
                <th className="px-3 py-2.5 text-center w-12">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="checkbox"
                      checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                      onChange={toggleAll}
                      className="rounded accent-brand cursor-pointer"
                    />
                    <span>#</span>
                  </div>
                </th>
                <th className="px-3 py-2.5">Image</th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Name <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Qty <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Code <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Category <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 cursor-pointer">
                    Selling Price <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 cursor-pointer">
                    Purchase Price <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer">
                    Tax % <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted">
                    Loading products…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted font-medium">
                    No data available in table
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, pageSize).map((r, idx) => {
                  const rowKey = `${String(r.id || "prod")}-${idx}`;
                  const rowId = String(r.id ?? idx);
                  const isSelected = selectedIds.has(rowId);
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 text-center text-muted font-medium">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(rowId)}
                            className="rounded accent-brand cursor-pointer"
                          />
                          <span>{idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {r.image || r.imageUrl ? (
                          <img
                            src={String(r.image || r.imageUrl)}
                            alt={String(r.name || "Product")}
                            className="h-8 w-8 rounded object-cover border border-border shadow-xs"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-slate-100 border border-border grid place-items-center text-[10px] text-muted font-medium">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink">{String(r.name ?? "—")}</td>
                      <td className="px-3 py-3 font-medium text-ink">{Number(r.qty ?? r.stock ?? 0)}</td>
                      <td className="px-3 py-3 text-muted font-mono">{String(r.code ?? r.hsn ?? "—")}</td>
                      <td className="px-3 py-3 text-muted">{String(r.category ?? "General")}</td>
                      <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.selling_price ?? r.rate ?? 0))}</td>
                      <td className="px-3 py-3 text-right text-muted">{inr(Number(r.purchase_price ?? 0))}</td>
                      <td className="px-3 py-3 text-center font-medium text-muted">{Number(r.tax_rate ?? 18)}%</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
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
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="Product"
        onClose={() => setSelectedRecord(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
