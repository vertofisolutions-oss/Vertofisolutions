"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  Search,
  ArrowUpDown,
  Calendar,
  Link as LinkIcon,
  X,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Building2,
  Truck,
  DollarSign,
} from "lucide-react";
import { Card, Button } from "@/ui";
import { api } from "@/lib/api";

export interface CancelledEWayBillRecord {
  id: string;
  eway_bill_no: string;
  invoice_no: string;
  customer_name: string;
  customer_gstin?: string;
  supplier_name?: string;
  supplier_gstin?: string;
  date: string;
  cancelled_date: string;
  amount: number;
  vehicle_number?: string;
  transporter_name?: string;
  cancellation_reason?: string;
  status: string;
}

const SAMPLE_CANCELLED_RECORDS: CancelledEWayBillRecord[] = [];

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export function CancelledEWayBillsView({
  orgId,
  onCancelEWayBill,
}: {
  orgId?: string;
  onCancelEWayBill?: () => void;
}) {
  const [rows, setRows] = useState<CancelledEWayBillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("01-09-2026 - 04-09-2026");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof CancelledEWayBillRecord>("cancelled_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Portal Connection State
  const [connectionState, setConnectionState] = useState<"DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR">("DISCONNECTED");
  const [showBanner, setShowBanner] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectGstin, setConnectGstin] = useState("36DJDPB6546R1ZO");
  const [connectUser, setConnectUser] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("vertofi_user_name") || "Business Owner" : "Business Owner"));
  const [connectPass, setConnectPass] = useState("••••••••••••");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // View Details Modal
  const [selectedRecord, setSelectedRecord] = useState<CancelledEWayBillRecord | null>(null);

  // Export State
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    // Read real user-cancelled bills from local storage
    let localCancelled: CancelledEWayBillRecord[] = [];
    try {
      if (typeof window !== "undefined") {
        localCancelled = JSON.parse(localStorage.getItem("vertofi_cancelled_ewaybills") || "[]");
      }
    } catch {}

    if (!orgId) {
      setRows(localCancelled);
      setLoading(false);
      return;
    }

    api.acc
      .documents(orgId)
      .then((docs) => {
        if (!alive) return;
        if (Array.isArray(docs)) {
          const cancelledDocs = docs.filter(
            (d) =>
              String(d.doc_type ?? d.type ?? "").toUpperCase().includes("EWAY") &&
              String(d.status ?? "").toUpperCase() === "CANCELLED"
          );
          const mapped: CancelledEWayBillRecord[] = cancelledDocs.map((d, i) => ({
            id: String(d.id ?? i),
            eway_bill_no: String(d.eway_bill_no ?? ""),
            invoice_no: String(d.invoice_no ?? ""),
            customer_name: String(d.customer_name ?? d.customer ?? "Customer"),
            customer_gstin: String(d.customer_gstin ?? ""),
            supplier_name: String(d.supplier_name ?? (typeof window !== "undefined" ? localStorage.getItem("vertofi_user_name") || "Business Owner" : "Business Owner")),
            supplier_gstin: String(d.supplier_gstin ?? "36DJDPB6546R1ZO"),
            date: String(d.date ?? ""),
            cancelled_date: String(d.cancelled_date ?? ""),
            amount: Number(d.amount ?? d.total ?? 0),
            vehicle_number: String(d.vehicle_number ?? ""),
            transporter_name: String(d.transporter_name ?? ""),
            cancellation_reason: String(d.cancellation_reason ?? "Order Cancelled"),
            status: "CANCELLED",
          }));
          const combined = [...localCancelled];
          for (const m of mapped) {
            if (!combined.some((c) => c.eway_bill_no === m.eway_bill_no && m.eway_bill_no)) {
              combined.push(m);
            }
          }
          setRows(combined);
        } else {
          setRows(localCancelled);
        }
      })
      .catch(() => {
        if (alive) setRows(localCancelled);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  const handleSort = (field: keyof CancelledEWayBillRecord) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((r) => {
        return (
          r.eway_bill_no.toLowerCase().includes(q) ||
          r.invoice_no.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          (r.customer_gstin && r.customer_gstin.toLowerCase().includes(q)) ||
          (r.vehicle_number && r.vehicle_number.toLowerCase().includes(q)) ||
          (r.transporter_name && r.transporter_name.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      const valA = a[sortField] ?? "";
      const valB = b[sortField] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      return sortDir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return result;
  }, [rows, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  function handleConnectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnectionState("CONNECTING");
    setTimeout(() => {
      setConnectionState("CONNECTED");
      setShowBanner(false);
      setShowConnectModal(false);
      triggerToast("E-Way Bill Portal connected successfully!");
    }, 1000);
  }

  function triggerToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function exportCsv() {
    if (filteredAndSortedRows.length === 0) {
      alert("No records available to export.");
      return;
    }
    setExporting(true);
    setTimeout(() => {
      const headers = [
        "E-Way Bill Number",
        "Invoice Number",
        "Customer",
        "Customer GSTIN",
        "Invoice Date",
        "Cancelled Date",
        "Amount",
        "Vehicle Number",
        "Transporter",
        "Reason for Cancellation",
      ];
      const csvRows = filteredAndSortedRows.map((r) => [
        `"${r.eway_bill_no}"`,
        `"${r.invoice_no}"`,
        `"${r.customer_name}"`,
        `"${r.customer_gstin || ""}"`,
        `"${r.date}"`,
        `"${r.cancelled_date}"`,
        `"${r.amount}"`,
        `"${r.vehicle_number || ""}"`,
        `"${r.transporter_name || ""}"`,
        `"${r.cancellation_reason || ""}"`,
      ]);

      const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(content);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `cancelled_eway_bills_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExporting(false);
      triggerToast("Cancelled E-Way Bills exported successfully.");
    }, 600);
  }

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Yellow Connection Warning Alert */}
      {showBanner && connectionState !== "CONNECTED" && (
        <div className="flex items-center justify-between rounded-md border border-[#ff4d4f] bg-[#fffbe6] px-4 py-3 text-xs text-slate-800 shadow-sm mb-4">
          <div className="flex items-center gap-2">
            <span>
              Please connect to E-Way Bill Portal from &quot;Connect to E-way Bill Portal&quot; button.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
            <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">Manage Cancelled E-Way Bills</h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={exporting}
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#3182ce] px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Export"} {!exporting && <Download className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-xs font-bold text-white transition hover:bg-green-600 cursor-pointer shadow-xs"
              >
                {connectionState === "CONNECTED" ? "Portal Connected" : "Connect to E-way Bill Portal"}
              </button>

              <button
                type="button"
                onClick={onCancelEWayBill}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-xs font-bold text-white transition hover:bg-green-600 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" /> Cancel E-way Bill
              </button>
            </div>
          </div>

          {/* Divider line under header */}
          <div className="h-px bg-slate-200/80 w-full" />
        </div>

        {/* Filter Toolbar matching Screenshot layout */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
          {/* Left Side: Date Picker Input with Attached Search Icon Button */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden w-fit">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-52 outline-none text-xs text-slate-800 font-medium bg-transparent"
                placeholder="01-09-2026 - 04-09-2026"
              />
            </div>
            <button
              type="button"
              onClick={() => triggerToast(`Filtering date range: ${dateRange}`)}
              className="border-l border-slate-300 px-3.5 py-2.5 bg-[#e2e8f0]/60 text-slate-600 hover:text-slate-900 cursor-pointer transition"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Right Side: Search Input with Attached Search Icon Button & Page Size Selector */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
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
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-[#f4f6f8] text-[12px] font-semibold text-slate-700">
              <tr>
                <th className="px-3.5 py-3 text-center w-12 border-r border-slate-200/50">#</th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50" onClick={() => handleSort("eway_bill_no")}>
                  <div className="flex items-center gap-1 justify-between">
                    <span>E-Way Bill Number</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50" onClick={() => handleSort("invoice_no")}>
                  <div className="flex items-center gap-1 justify-between">
                    <span>Invoice Number</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50" onClick={() => handleSort("customer_name")}>
                  <div className="flex items-center gap-1 justify-between">
                    <span>Customer</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50" onClick={() => handleSort("date")}>
                  <div className="flex items-center gap-1 justify-between">
                    <span>Invoice Date</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50" onClick={() => handleSort("cancelled_date")}>
                  <div className="flex items-center gap-1 justify-between">
                    <span>Canceled Date</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1 justify-between">
                    <span>Amount</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#006666] mb-3" />
                    Loading cancelled E-Way Bills...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[13px] text-[#006666] font-medium tracking-wide">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-3.5 py-3.5 text-center text-slate-500 font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3.5 font-medium text-slate-800">{r.eway_bill_no}</td>
                    <td className="px-3.5 py-3.5 font-medium text-slate-800">{r.invoice_no}</td>
                    <td className="px-3.5 py-3.5 text-slate-600">
                      <div>{r.customer_name}</div>
                    </td>
                    <td className="px-3.5 py-3.5 text-slate-600">{r.date}</td>
                    <td className="px-3.5 py-3.5 text-slate-600">{r.cancelled_date}</td>
                    <td className="px-3.5 py-3.5 font-medium text-slate-800">{inr(r.amount)}</td>
                    <td className="px-3.5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(r)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#006666] hover:underline cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAndSortedRows.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedRows.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredAndSortedRows.length)} of {filteredAndSortedRows.length} entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-xs transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer shadow-xs transition ${
                    currentPage === pg ? "bg-[#22c55e] text-white border-transparent" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer shadow-xs transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connect Portal Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-red-600" /> Connect to E-Way Bill Portal
              </h3>
              <button type="button" onClick={() => setShowConnectModal(false)} className="text-muted hover:text-ink p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink">GSTIN / UIN <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={connectGstin}
                  onChange={(e) => setConnectGstin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-ink font-mono outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-ink">E-Way Bill Portal Username <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={connectUser}
                  onChange={(e) => setConnectUser(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-ink outline-none focus:border-brand"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-ink">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={connectPass}
                  onChange={(e) => setConnectPass(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-ink outline-none focus:border-brand"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button variant="ghost" onClick={() => setShowConnectModal(false)} type="button">
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={connectionState === "CONNECTING"}
                  className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 cursor-pointer shadow"
                >
                  {connectionState === "CONNECTING" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Connect Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-600" /> Cancelled E-Way Bill Details
              </h3>
              <button type="button" onClick={() => setSelectedRecord(null)} className="text-muted hover:text-ink p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold">E-Way Bill Number</div>
                <div className="font-mono font-bold text-ink text-sm">{selectedRecord.eway_bill_no}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold">Invoice Number</div>
                <div className="font-bold text-ink text-sm">{selectedRecord.invoice_no}</div>
              </div>

              <div className="p-3 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-muted" /> Customer
                </div>
                <div className="font-bold text-ink">{selectedRecord.customer_name}</div>
                <div className="font-mono text-muted text-[11px]">{selectedRecord.customer_gstin}</div>
              </div>

              <div className="p-3 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-muted" /> Supplier
                </div>
                <div className="font-bold text-ink">{selectedRecord.supplier_name}</div>
                <div className="font-mono text-muted text-[11px]">{selectedRecord.supplier_gstin}</div>
              </div>

              <div className="p-3 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted" /> Invoice Date
                </div>
                <div className="font-bold text-ink">{selectedRecord.date}</div>
              </div>

              <div className="p-3 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted" /> Cancelled Date
                </div>
                <div className="font-bold text-red-600">{selectedRecord.cancelled_date}</div>
              </div>

              <div className="p-3 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                  <Truck className="h-3 w-3 text-muted" /> Vehicle & Transporter
                </div>
                <div className="font-bold text-ink">{selectedRecord.vehicle_number}</div>
                <div className="text-muted text-[11px]">{selectedRecord.transporter_name}</div>
              </div>

              <div className="p-3 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-muted uppercase font-bold flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted" /> Total Amount
                </div>
                <div className="font-extrabold text-ink text-sm">{inr(selectedRecord.amount)}</div>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs">
              <div className="text-[10px] text-red-700 uppercase font-bold">Reason for Cancellation</div>
              <div className="font-semibold text-red-950">{selectedRecord.cancellation_reason}</div>
            </div>

            <div className="pt-2 flex justify-end border-t border-border">
              <Button variant="ghost" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
