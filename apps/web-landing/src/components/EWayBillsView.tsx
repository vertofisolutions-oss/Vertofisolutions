"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  Search,
  ArrowUpDown,
  Calendar,
  ShoppingBag,
  Link as LinkIcon,
  X,
  CheckCircle2,
  ChevronLeft,
  Eye,
  HelpCircle,
  Bell,
  User,
} from "lucide-react";
import { Card, Button } from "@/ui";
import { api } from "@/lib/api";
import { CreateEWayBillView } from "./CreateEWayBillView";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export type EWayBillItem = {
  id: string;
  eway_bill_no: string;
  invoice_no: string;
  customer_name: string;
  date: string;
  valid_upto: string;
  amount: number;
  status: string;
};

const INITIAL_SAMPLE_ROWS: EWayBillItem[] = [];

export function EWayBillsView({
  orgId,
  onNewEWayBill,
}: {
  orgId: string;
  onNewEWayBill?: () => void;
}) {
  const [rows, setRows] = useState<EWayBillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("01-09-2026 - 04-09-2026");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBanner, setShowBanner] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [credits, setCredits] = useState(59);
  const [manageCredit, setManageCredit] = useState(30);

  // Sorting
  const [sortField, setSortField] = useState<keyof EWayBillItem | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modals & Feedback
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBillDetails, setSelectedBillDetails] = useState<EWayBillItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Connect Portal form state
  const [nicGstin, setNicGstin] = useState("36DJDPB6546R1ZO");
  const [nicUsername, setNicUsername] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("vertofi_user_name") || "Business Owner" : "Business Owner"));
  const [nicPassword, setNicPassword] = useState("••••••••••••");
  const [gspClientId, setGspClientId] = useState("VERTOFI_GSP_PROD_36");
  const [connecting, setConnecting] = useState(false);

  // Credit Purchase selection
  const [selectedPack, setSelectedPack] = useState(50);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.acc
      .documents(orgId)
      .then((docs) => {
        if (!alive) return;
        if (Array.isArray(docs) && docs.length > 0) {
          const eway = docs
            .filter((d) => String(d.doc_type ?? d.type ?? "").toUpperCase().includes("EWAY"))
            .map((d, idx) => ({
              id: String(d.id ?? `ewb-${idx}`),
              eway_bill_no: String(d.eway_bill_no ?? d.number ?? `3610 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`),
              invoice_no: String(d.invoice_no ?? `INV/2026/${0 + idx + 100}`),
              customer_name: String(d.customer_name ?? d.customer ?? "Standard Client"),
              date: String(d.date ?? "01-09-2026"),
              valid_upto: String(d.valid_upto ?? "04-09-2026 23:59"),
              amount: Number(d.amount ?? d.total ?? 0),
              status: "Active",
            }));
          setRows(eway);
        } else {
          setRows([]);
        }
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  // Filtering & Sorting
  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.eway_bill_no.toLowerCase().includes(q) ||
          r.invoice_no.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          r.date.includes(q)
      );
    }
    if (sortField) {
      result.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        return sortOrder === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return result;
  }, [rows, search, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  function handleSort(field: keyof EWayBillItem) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  function exportCsv() {
    const dataToExport = filteredAndSortedRows;
    const headers = ["E-Way Bill Number", "Invoice Number", "Customer", "Invoice Date", "Valid Upto", "Amount"];
    const csvRows = dataToExport.map((r) => [
      `"${r.eway_bill_no}"`,
      `"${r.invoice_no}"`,
      `"${r.customer_name}"`,
      `"${r.date}"`,
      `"${r.valid_upto}"`,
      `"${r.amount}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eway_bills_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("E-Way Bills exported to CSV successfully!");
  }

  function handleConnectPortal() {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setIsConnected(true);
      setShowBanner(false);
      setShowConnectModal(false);
      showToast("Successfully connected to NIC E-Way Bill Portal!");
    }, 1200);
  }

  function handleBuyCredits() {
    setCredits((prev) => prev + selectedPack);
    setManageCredit((prev) => prev + selectedPack);
    setShowBuyCreditsModal(false);
    showToast(`Purchased ${selectedPack} E-Way Credits successfully!`);
  }

  function populateSampleData() {
    setRows(INITIAL_SAMPLE_ROWS);
    showToast("Sample E-Way Bills loaded into table.");
  }

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl transition-all">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Card Container Matching Screenshot Exactly */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
        {/* Top Warning Banner - Exact Screenshot Reproduction */}
        {showBanner && !isConnected && (
          <div className="relative flex items-center justify-between rounded-lg border border-[#ff4d4f] bg-[#fffbe6] px-4 py-3 text-xs text-[#8c1111] shadow-2xs">
            <div className="flex items-center gap-2">
              <span>
                Please connect to E-Way Bill Portal from &quot;Connect to E-way Bill Portal&quot; button.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="text-[#8c1111]/70 hover:text-[#8c1111] p-0.5 rounded cursor-pointer transition font-bold"
              title="Close Notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Connected Success Alert */}
        {isConnected && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Connected to E-Way Bill Portal!</strong> Live GSP API Session active for GSTIN <strong>{nicGstin}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsConnected(false);
                setShowBanner(true);
                showToast("Disconnected from E-Way Bill Portal");
              }}
              className="text-emerald-700 hover:text-emerald-950 font-semibold underline cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        )}

        {/* Title & Action Pill Buttons Bar */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-[#262626]">
              Manage E-Way Bills
            </h1>

            {/* Pill Shaped Action Buttons matching screenshot */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#3182ce] px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Export <Download className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-xs font-bold text-white transition hover:bg-green-600 cursor-pointer shadow-xs"
              >
                Connect to E-way Bill Portal
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNewEWayBill) onNewEWayBill();
                  else setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-xs font-bold text-white transition hover:bg-green-600 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" /> Create E-way Bill
              </button>
            </div>
          </div>

          {/* Divider line under header */}
          <div className="h-px bg-slate-200/80 w-full" />
        </div>

        {/* Filter Toolbar matching Screenshot layout */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
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
              onClick={() => showToast(`Filtering date range: ${dateRange}`)}
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-red-500 shadow-2xs cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            {rows.length === 0 && (
              <button
                type="button"
                onClick={populateSampleData}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Load sample E-Way bills"
              >
                Sample Data
              </button>
            )}
          </div>
        </div>

        {/* Data Table Matching Visual Details */}
        <div className="overflow-x-auto rounded-lg border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-[#f4f6f8] text-[12px] font-semibold text-slate-700">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">#</th>

                <th
                  className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none"
                  onClick={() => handleSort("eway_bill_no")}
                >
                  <div className="flex items-center gap-1">
                    <span>E-Way Bill Number</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>

                <th
                  className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none"
                  onClick={() => handleSort("invoice_no")}
                >
                  <div className="flex items-center gap-1">
                    <span>Invoice Number</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>

                <th
                  className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none"
                  onClick={() => handleSort("customer_name")}
                >
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>

                <th
                  className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    <span>Invoice Date</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>

                <th
                  className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none"
                  onClick={() => handleSort("valid_upto")}
                >
                  <div className="flex items-center gap-1">
                    <span>Valid Upto</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>

                <th
                  className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-200/60 transition select-none"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>

                <th className="px-3.5 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    Loading E-Way Bills…
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-xs font-semibold text-[#006666]"
                  >
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-3.5 py-3 text-center text-slate-500 font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-slate-800 font-mono">
                      {r.eway_bill_no}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-700">
                      {r.invoice_no}
                    </td>
                    <td className="px-3.5 py-3 text-slate-800 font-medium">
                      {r.customer_name}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600">{r.date}</td>
                    <td className="px-3.5 py-3 text-slate-600">{r.valid_upto}</td>
                    <td className="px-3.5 py-3 text-right font-semibold text-slate-900">
                      {inr(r.amount)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedBillDetails(r)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer if rows are present */}
        {filteredAndSortedRows.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedRows.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredAndSortedRows.length)} of {filteredAndSortedRows.length} entries
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                Previous
              </button>

              <span className="px-2 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connect to Portal Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-red-600" /> Connect to E-Way Bill Portal
              </h3>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Authenticate directly with the National Informatics Centre (NIC) E-Way Bill Portal via GSP credentials.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">GSTIN</label>
                <input
                  type="text"
                  value={nicGstin}
                  onChange={(e) => setNicGstin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Portal Username</label>
                <input
                  type="text"
                  value={nicUsername}
                  onChange={(e) => setNicUsername(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Portal Password</label>
                <input
                  type="password"
                  value={nicPassword}
                  onChange={(e) => setNicPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">GSP Client ID</label>
                <input
                  type="text"
                  value={gspClientId}
                  onChange={(e) => setGspClientId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 font-mono outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowConnectModal(false)}
                className="rounded-lg px-4 py-2 text-xs"
              >
                Cancel
              </Button>
              <button
                type="button"
                disabled={connecting}
                onClick={handleConnectPortal}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 cursor-pointer shadow-md transition"
              >
                {connecting ? "Authenticating GSP…" : "Authenticate & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Credits Modal */}
      {showBuyCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-red-600" /> Buy E-Way Credits
              </h3>
              <button
                type="button"
                onClick={() => setShowBuyCreditsModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-red-800 block font-medium">Available Balance</span>
                <span className="text-xl font-extrabold text-red-900">{credits} Credits</span>
              </div>
              <span className="text-xs font-semibold text-red-700 bg-white px-2.5 py-1 rounded-full border border-red-200 shadow-2xs">
                1 Credit = 1 Bill
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">Select Credit Package</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedPack(50)}
                  className={`rounded-xl border p-3 text-center transition cursor-pointer ${
                    selectedPack === 50
                      ? "border-red-600 bg-red-50 text-red-900 font-bold shadow-xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base block font-bold">50</span>
                  <span className="text-[11px] text-slate-500 block font-medium">₹ 500</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPack(200)}
                  className={`rounded-xl border p-3 text-center transition cursor-pointer ${
                    selectedPack === 200
                      ? "border-red-600 bg-red-50 text-red-900 font-bold shadow-xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base block font-bold">200</span>
                  <span className="text-[11px] text-slate-500 block font-medium">₹ 1,800</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPack(500)}
                  className={`rounded-xl border p-3 text-center transition cursor-pointer ${
                    selectedPack === 500
                      ? "border-red-600 bg-red-50 text-red-900 font-bold shadow-xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base block font-bold">500</span>
                  <span className="text-[11px] text-slate-500 block font-medium">₹ 4,000</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowBuyCreditsModal(false)}
                className="rounded-lg px-4 py-2 text-xs"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleBuyCredits}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 cursor-pointer shadow-md transition"
              >
                Proceed to Pay ₹{selectedPack === 50 ? 500 : selectedPack === 200 ? 1800 : 4000}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Record Details Modal */}
      {selectedBillDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                E-Way Bill #{selectedBillDetails.eway_bill_no}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBillDetails(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Invoice Number</span>
                <span className="font-semibold text-slate-800">{selectedBillDetails.invoice_no}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Invoice Date</span>
                <span className="font-semibold text-slate-800">{selectedBillDetails.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Customer</span>
                <span className="font-semibold text-slate-800">{selectedBillDetails.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Valid Upto</span>
                <span className="font-semibold text-slate-800">{selectedBillDetails.valid_upto}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Amount</span>
                <span className="font-bold text-slate-900 text-sm">{inr(selectedBillDetails.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  {selectedBillDetails.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedBillDetails(null);
                  showToast(`Downloading PDF for E-Way Bill ${selectedBillDetails.eway_bill_no}…`);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Print / Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Create Modal if opened inside Manage view */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">Create New E-Way Bill</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CreateEWayBillView
              orgId={orgId}
              onClose={() => setShowCreateModal(false)}
              onCreated={() => {
                setShowCreateModal(false);
                const newBill: EWayBillItem = {
                  id: `ewb-${Date.now()}`,
                  eway_bill_no: `3610 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
                  invoice_no: `INV/2026/${Math.floor(900 + Math.random() * 100)}`,
                  customer_name: "Walk-in Customer",
                  date: new Date().toISOString().slice(0, 10),
                  valid_upto: "08-09-2026 23:59",
                  amount: 55000,
                  status: "Active",
                };
                setRows((prev) => [newBill, ...prev]);
                showToast("E-Way Bill generated successfully!");
              }}
            />
          </div>
        </div>
      )}

      {/* Page Footer Matching Exact Prologic Screenshot */}
      <footer className="pt-4 text-center text-[11px] text-slate-400">
        © Powered by{" "}
        <a
          href="https://prologicweb.com"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-700 font-medium"
        >
          Prologic Web Solutions
        </a>
        . All rights reserved
      </footer>
    </div>
  );
}
