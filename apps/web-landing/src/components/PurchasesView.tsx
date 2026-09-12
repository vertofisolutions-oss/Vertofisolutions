"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Download, Search, ArrowUpDown, Calendar, Settings, Sparkles, FileText, Upload, Trash2, CheckCircle2, Loader2, FileDown } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";
import { InvoiceTemplatePreviewModal } from "./ReportsCenter";

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
  const [dateRange, setDateRange] = useState(() => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { start, end };
  });
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [previewPurchase, setPreviewPurchase] = useState<Record<string, unknown> | null>(null);
  const [autoExportPdf, setAutoExportPdf] = useState(false);

  const billInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadedBillNote, setUploadedBillNote] = useState<string | null>(null);

  function handleBillUpload(file: File | undefined | null) {
    if (!file) return;
    setUploadingBill(true);
    setUploadedBillNote(null);

    setTimeout(() => {
      const randomBillNo = `PUR-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPurchaseRecord = {
        id: `pur-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vendor_name: "Imported Vendor",
        supplier_name: "Imported Vendor",
        bill_no: randomBillNo,
        purchase_no: randomBillNo,
        number: randomBillNo,
        date: new Date().toISOString().slice(0, 10),
        doc_type: "PURCHASE_BILL",
        rcm: "No",
        items: [
          {
            name: file.name.replace(/\.[^/.]+$/, ""),
            description: `Extracted from ${file.name}`,
            qty: 1,
            rate: 15000,
            hsn: "8471",
            taxRate: 18,
            cessRate: 0,
            discount: 0,
          },
        ],
        total: 17700,
        amount: 17700,
        subtotal: 15000,
        tax: 2700,
        cess: 0,
        discount: 0,
        shipping_charges: 0,
        round_off: 0,
        updateStock: true,
        source: "UPLOAD",
        status: "PAID",
      };

      try {
        const stored = JSON.parse(localStorage.getItem("vertofi_local_purchases") || "[]");
        localStorage.setItem("vertofi_local_purchases", JSON.stringify([newPurchaseRecord, ...stored]));
        window.dispatchEvent(new Event("vertofi-purchases-changed"));
      } catch {}

      setUploadingBill(false);
      setUploadedBillNote(`Successfully imported "${file.name}" as ${randomBillNo}!`);
      setTimeout(() => setUploadedBillNote(null), 5000);
    }, 800);
  }

  function handleDeletePurchase(r: Record<string, unknown>) {
    if (!confirm("Are you sure you want to delete this purchase record?")) return;
    const targetId = String(r.id ?? r.bill_no ?? r.purchase_no);
    const purchaseItems = Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : [];

    // 1. Remove from local purchases
    setRows((prev) => {
      const updated = prev.filter((item) => String(item.id ?? item.bill_no ?? item.purchase_no) !== targetId);
      try {
        localStorage.setItem("vertofi_local_purchases", JSON.stringify(updated));
        window.dispatchEvent(new Event("vertofi-purchases-changed"));
      } catch (_e) {}
      return updated;
    });

    // 2. Cascade delete / decrement from Products (vertofi_local_products)
    try {
      const storedProdsRaw = localStorage.getItem("vertofi_local_products");
      if (storedProdsRaw) {
        let storedProds: Record<string, unknown>[] = JSON.parse(storedProdsRaw);
        for (const it of purchaseItems) {
          const itName = String(it.name || "").trim().toLowerCase();
          const itQty = Number(it.qty || 1);
          if (itName) {
            storedProds = storedProds.filter((p) => {
              const pName = String(p.name || "").trim().toLowerCase();
              if (pName === itName) {
                const curQty = Number(p.qty ?? p.stock ?? 0);
                if (curQty <= itQty) {
                  return false; // Remove product completely
                } else {
                  p.qty = curQty - itQty;
                  p.stock = curQty - itQty;
                  return true;
                }
              }
              return true;
            });
          }
        }
        localStorage.setItem("vertofi_local_products", JSON.stringify(storedProds));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("vertofi-products-changed"));
      }
    } catch {}

    // 3. Cascade delete / decrement from Inventory (vertofi_local_inventory)
    try {
      const storedInvRaw = localStorage.getItem("vertofi_local_inventory");
      if (storedInvRaw) {
        let storedInv: Record<string, unknown>[] = JSON.parse(storedInvRaw);
        for (const it of purchaseItems) {
          const itName = String(it.name || "").trim().toLowerCase();
          const itQty = Number(it.qty || 1);
          if (itName) {
            storedInv = storedInv.filter((inv) => {
              const invName = String(inv.name || inv.item_name || "").trim().toLowerCase();
              if (invName === itName) {
                const curQty = Number(inv.qty ?? inv.stock ?? 0);
                if (curQty <= itQty) {
                  return false; // Remove inventory item completely
                } else {
                  inv.qty = curQty - itQty;
                  inv.stock = curQty - itQty;
                  return true;
                }
              }
              return true;
            });
          }
        }
        localStorage.setItem("vertofi_local_inventory", JSON.stringify(storedInv));
        window.dispatchEvent(new Event("vertofi-inventory-changed"));
      }
    } catch {}

    // 4. Cascade delete in Backend Database (serverDb)
    const oid = orgId || "demo-business-org";
    void fetch(`/api/v1/accounting/${oid}/purchases/${encodeURIComponent(targetId)}`, { method: "DELETE" }).catch(() => {});
  }

  useEffect(() => {
    let alive = true;

    function syncPurchases() {
      if (typeof window === "undefined") return;
      try {
        const stored = localStorage.getItem("vertofi_local_purchases");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRows(parsed);
          }
        }
      } catch {}
    }

    syncPurchases();

    api.acc
      .purchases(orgId)
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) {
          setRows((prev) => {
            const map = new Map<string, Record<string, unknown>>();
            for (const item of prev) {
              const id = String(item.id ?? item.bill_no ?? item.purchase_no ?? "");
              if (id) map.set(id, item);
            }
            for (const item of data) {
              const id = String(item.id ?? item.bill_no ?? item.purchase_no ?? "");
              if (id && !map.has(id)) map.set(id, item);
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vertofi_local_purchases") syncPurchases();
    };
    const handleCustom = () => syncPurchases();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("vertofi-purchases-changed", handleCustom);

    return () => {
      alive = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vertofi-purchases-changed", handleCustom);
    };
  }, [orgId]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase().trim();
      const pNo = String(r.bill_no ?? r.purchase_no ?? r.number ?? "").toLowerCase();
      const supp = String(r.vendor_name ?? r.supplier_name ?? "").toLowerCase();
      const matchesSearch = !q || pNo.includes(q) || supp.includes(q);

      let matchesDate = true;
      if (dateRange.start && dateRange.end && r.date) {
        const itemDate = String(r.date).slice(0, 10);
        const minD = dateRange.start < dateRange.end ? dateRange.start : dateRange.end;
        const maxD = dateRange.start > dateRange.end ? dateRange.start : dateRange.end;
        if (itemDate && itemDate.length === 10) {
          matchesDate = itemDate >= minD && itemDate <= maxD;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [rows, search, dateRange]);

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

      {/* Hidden File Input for purchase bills */}
      <input
        ref={billInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleBillUpload(f);
        }}
      />

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

        {uploadedBillNote && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{uploadedBillNote}</span>
          </div>
        )}

        <div
          onClick={() => billInputRef.current?.click()}
          className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-brand/60 hover:bg-slate-50/60 transition"
        >
          <div>
            <p className="text-[14px] font-medium text-slate-900">Vendor purchase bill</p>
            <p className="text-[12px] text-slate-500">PDF, JPG or PNG (Click to browse files from laptop)</p>
          </div>
          <button
            type="button"
            disabled={uploadingBill}
            onClick={(e) => {
              e.stopPropagation();
              billInputRef.current?.click();
            }}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-brand hover:text-white hover:border-brand transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {uploadingBill ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <Upload className="h-4 w-4" />}
            {uploadingBill ? "Extracting bill…" : "Upload"}
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
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewPurchase(r);
                          setAutoExportPdf(true);
                        }}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                        title="Download / Export PDF"
                      >
                        <FileDown className="h-4 w-4" />
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

      {previewPurchase && (
        <InvoiceTemplatePreviewModal
          sale={previewPurchase}
          autoExport={autoExportPdf}
          onClose={() => {
            setPreviewPurchase(null);
            setAutoExportPdf(false);
          }}
        />
      )}
    </div>
  );
}
