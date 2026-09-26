"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Search,
  ArrowUpDown,
  ShoppingCart,
  Tag,
  AlertCircle,
  Settings,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function InventoryView({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("vertofi_local_inventory");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Discard legacy seed items
          const isOldSeed = parsed.every((it: Record<string, unknown>) =>
            ["inv-1", "inv-2", "inv-3"].includes(String(it.id))
          );
          if (isOldSeed) {
            localStorage.removeItem("vertofi_local_inventory");
            return [];
          }
          return parsed.map((it: Record<string, unknown>) => {
            const name = String(it.name || it.item_name || "Inventory Item");
            const code = String(it.code || it.sku || "SKU-001");
            const selling_price = Number(
              it.selling_price ??
                it.rate ??
                (it.value ? Math.round(Number(it.value) / Math.max(Number(it.qty || 1), 1)) : 0)
            );
            const purchase_price = Number(
              it.purchase_price ?? (selling_price > 0 ? Math.round(selling_price * 0.75) : 0)
            );
            return {
              ...it,
              name,
              item_name: name,
              code,
              sku: code,
              selling_price,
              purchase_price,
            };
          });
        }
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | "batch" | null>(null);

  useEffect(() => {
    let alive = true;

    function syncInventory() {
      if (typeof window === "undefined") return;
      try {
        const stored = localStorage.getItem("vertofi_local_inventory");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setItems((prev) => {
              const map = new Map<string, Record<string, unknown>>();
              for (const item of parsed) {
                const key = String(item.id || item.code || item.name);
                if (key) map.set(key, item);
              }
              for (const item of prev) {
                const key = String(item.id || item.code || item.name);
                if (key && !map.has(key)) map.set(key, item);
              }
              return Array.from(map.values());
            });
          }
        }
      } catch {}
    }

    syncInventory();

    api.acc
      .inventory(orgId)
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) {
          setItems((prev) => {
            const map = new Map<string, Record<string, unknown>>();
            for (const item of prev) {
              const key = String(item.id || item.code || item.name);
              if (key) map.set(key, item);
            }
            for (const item of data) {
              const key = String(item.id || item.code || item.name);
              if (key && !map.has(key)) map.set(key, item);
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vertofi_local_inventory") syncInventory();
    };
    const handleCustom = () => syncInventory();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("vertofi-inventory-changed", handleCustom);

    return () => {
      alive = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vertofi-inventory-changed", handleCustom);
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
      const name = String(r.name ?? r.item_name ?? "").toLowerCase();
      const code = String(r.code ?? r.sku ?? r.hsn ?? "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [items, search]);

  function toggleAll() {
    if (filteredRows.length > 0 && selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r, idx) => String(r.id ?? idx))));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    if (items.length === 0) return;
    const headers = ["Product Image", "Name", "Qty", "Code", "Selling Price", "Purchase Price"];
    const csvRows = items.map((r) => [
      `"N/A"`,
      `"${String(r.name ?? r.item_name ?? "—")}"`,
      `"${Number(r.qty ?? r.stock ?? 0)}"`,
      `"${String(r.code ?? r.sku ?? r.hsn ?? "—")}"`,
      `"${Number(r.selling_price ?? r.rate ?? 0)}"`,
      `"${Number(r.purchase_price ?? 0)}"`,
    ]);
    const content =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function performDelete(target: Record<string, unknown> | "batch") {
    let updated: Record<string, unknown>[] = [];
    if (target === "batch") {
      selectedIds.forEach((id) => {
        api.acc.deleteInventory(orgId, id).catch(() => {});
      });
      updated = items.filter((r, idx) => !selectedIds.has(String(r.id ?? idx)));
      setSelectedIds(new Set());
    } else {
      if (target.id) {
        api.acc.deleteInventory(orgId, String(target.id)).catch(() => {});
      }
      updated = items.filter((it) => it.id !== target.id && it !== target);
      if (target.id) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(target.id));
          return next;
        });
      }
    }

    setItems(updated);
    try {
      localStorage.setItem("vertofi_local_inventory", JSON.stringify(updated));
    } catch {}

    if (selectedRecord && (target === "batch" || selectedRecord.id === target.id || selectedRecord === target)) {
      setSelectedRecord(null);
    }
    setDeleteTarget(null);
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

      {/* Main Manage Inventory Card */}
      <Card className="p-6">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-ink">Manage Inventory</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setDeleteTarget("batch")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 cursor-pointer shadow-sm animate-in fade-in"
              >
                <Trash2 className="h-4 w-4 text-rose-600" /> Delete Selected ({selectedIds.size})
              </button>
            )}
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
        <div className="mt-4 w-full overflow-visible rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-3 py-2.5 text-center w-12">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="checkbox"
                      checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                      onChange={toggleAll}
                      className="rounded accent-brand cursor-pointer h-3.5 w-3.5"
                      title="Select All"
                    />
                    <span>#</span>
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Product Image <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
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
                <th className="px-3 py-2.5 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted">
                    Loading inventory…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-muted">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <p className="font-semibold text-slate-700">No inventory items found</p>
                      <p className="text-muted">Items generated via manual entry or AI will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, pageSize).map((r, idx) => {
                  const rowId = String(r.id ?? idx);
                  const isSelected = selectedIds.has(rowId);
                  const name = String(r.name ?? r.item_name ?? "—");
                  const code = String(r.code ?? r.sku ?? r.hsn ?? "—");
                  const sellingPrice = Number(
                    r.selling_price ??
                      r.rate ??
                      (r.value ? Math.round(Number(r.value) / Math.max(Number(r.qty || 1), 1)) : 0)
                  );
                  const purchasePrice = Number(
                    r.purchase_price ?? (sellingPrice > 0 ? Math.round(sellingPrice * 0.75) : 0)
                  );

                  return (
                    <tr
                      key={`${String(r.id || r.sku || "item")}-${idx}`}
                      className={`hover:bg-slate-50 transition ${isSelected ? "bg-brand-50/20" : ""}`}
                    >
                      <td className="px-3 py-3 text-center text-muted font-medium">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(rowId)}
                            className="rounded accent-brand cursor-pointer h-3.5 w-3.5"
                          />
                          <span>{idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-8 w-8 rounded bg-slate-100 border border-border grid place-items-center text-[10px] text-muted font-medium">
                          N/A
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink">{name}</td>
                      <td className="px-3 py-3 font-medium text-ink">{Number(r.qty ?? r.stock ?? 0)}</td>
                      <td className="px-3 py-3 text-muted font-mono">{code}</td>
                      <td className="px-3 py-3 text-right font-semibold text-ink">{inr(sellingPrice)}</td>
                      <td className="px-3 py-3 text-right text-muted">{inr(purchasePrice)}</td>
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
                            onClick={() => setDeleteTarget(r)}
                            className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Delete Inventory Item"
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

      {/* Record Settings Details Modal with Delete Option */}
      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="Inventory Item"
        onClose={() => setSelectedRecord(null)}
        onDelete={(rec) => {
          setDeleteTarget(rec);
        }}
      />

      {/* In-App Confirmation Modal for Single or Batch Deletion */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-xs">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {deleteTarget === "batch" ? "Delete Selected Items" : "Delete Inventory Item"}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {deleteTarget === "batch" ? (
                    <>
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-slate-900">{selectedIds.size} selected items</span>? This
                      action will permanently remove them from inventory tracking.
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-slate-900">
                        {String(deleteTarget.name ?? deleteTarget.item_name ?? "this item")}
                      </span>{" "}
                      ({String(deleteTarget.code ?? deleteTarget.sku ?? "N/A")})? This action cannot be undone.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDelete(deleteTarget)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition cursor-pointer shadow-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
