"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  Search,
  ArrowUpDown,
  Wallet,
  Settings,
  Trash2,
  X,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  FileText,
  TrendingUp,
  Receipt,
  Building2,
} from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

const EXPENSE_CATEGORIES = [
  "Office Rent",
  "Salaries & Wages",
  "Electricity & Utilities",
  "Internet & Telecommunications",
  "Travel & Conveyance",
  "Advertising & Marketing",
  "Software & Cloud Subscriptions",
  "Legal & Professional Fees",
  "Repairs & Maintenance",
  "Printing & Stationery",
  "Bank & Payment Gateway Charges",
  "Food & Refreshments",
  "Logistics & Freight",
  "Insurance",
  "Miscellaneous Expense",
];

const PAYMENT_MODES = [
  "Bank Transfer (NEFT / RTGS / IMPS)",
  "UPI / QR",
  "Credit Card",
  "Debit Card",
  "Cash",
  "Cheque",
];

export function ExpensesView({ orgId }: { orgId: string }) {
  const [expenses, setExpenses] = useState<Record<string, unknown>[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("vertofi_local_expenses");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);

  // Add Expense Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync with API & Local Storage
  useEffect(() => {
    let alive = true;

    function syncExpenses() {
      if (typeof window === "undefined") return;
      try {
        const local = localStorage.getItem("vertofi_local_expenses");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            setExpenses(parsed);
          }
        }
      } catch {}
    }

    // Read initial local
    syncExpenses();

    // Fetch from backend API
    const oid = orgId || "demo-business-org";
    api.acc
      .expenses(oid)
      .then((serverDocs) => {
        if (!alive) return;
        if (Array.isArray(serverDocs) && serverDocs.length > 0) {
          setExpenses((prev) => {
            const map = new Map<string, Record<string, unknown>>();
            // Keep local changes prioritized
            for (const item of prev) {
              const id = String(item.id || item._id || "");
              if (id) map.set(id, item);
            }
            // Add server records if not present
            for (const item of serverDocs) {
              const id = String(item.id || item._id || "");
              if (id && !map.has(id)) {
                map.set(id, item);
              }
            }
            const merged = Array.from(map.values());
            try {
              localStorage.setItem("vertofi_local_expenses", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {
        // Fallback gracefully to local storage
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    // Listen for cross-tab or in-page updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vertofi_local_expenses") syncExpenses();
    };
    const handleCustomSync = () => syncExpenses();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("vertofi-expenses-changed", handleCustomSync);

    return () => {
      alive = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vertofi-expenses-changed", handleCustomSync);
    };
  }, [orgId]);

  function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid expense amount greater than 0");
      return;
    }

    const finalCategory = category === "Other" ? customCategory.trim() || "General Expense" : category;
    if (!finalCategory) {
      setFormError("Please specify an expense category");
      return;
    }

    setSubmitting(true);

    const expenseId = `EXP-${Date.now().toString().slice(-6)}`;
    const newExpenseRecord: Record<string, unknown> = {
      id: expenseId,
      doc_type: "EXPENSE",
      category: finalCategory,
      vendor: vendor.trim() || "General Payee",
      date: date || new Date().toISOString().split("T")[0],
      amount: numAmount,
      total: numAmount,
      payment_mode: paymentMode,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      status: "RECORDED",
      created_at: new Date().toISOString(),
    };

    // Update state & localStorage immediately
    setExpenses((prev) => {
      const updated = [newExpenseRecord, ...prev.filter((p) => p.id !== expenseId)];
      try {
        localStorage.setItem("vertofi_local_expenses", JSON.stringify(updated));
        window.dispatchEvent(new Event("vertofi-expenses-changed"));
      } catch {}
      return updated;
    });

    // Send to backend API asynchronously
    const oid = orgId || "demo-business-org";
    api.acc
      .addExpense(oid, newExpenseRecord)
      .catch(() => {
        // Local state already updated
      })
      .finally(() => {
        setSubmitting(false);
        setIsModalOpen(false);
        // Reset form
        setVendor("");
        setAmount("");
        setReference("");
        setNotes("");
        setCustomCategory("");
      });
  }

  function handleDeleteExpense(record: Record<string, unknown>) {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    const targetId = String(record.id || record._id || "");
    if (!targetId) return;

    setExpenses((prev) => {
      const updated = prev.filter((item) => String(item.id || item._id) !== targetId);
      try {
        localStorage.setItem("vertofi_local_expenses", JSON.stringify(updated));
        window.dispatchEvent(new Event("vertofi-expenses-changed"));
      } catch {}
      return updated;
    });

    if (selectedRecord && String(selectedRecord.id || selectedRecord._id) === targetId) {
      setSelectedRecord(null);
    }

    const oid = orgId || "demo-business-org";
    void fetch(`/api/v1/accounting/${oid}/expenses/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    let total = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    let monthTotal = 0;
    const categoryMap: Record<string, number> = {};

    for (const item of expenses) {
      const amt = Number(item.amount ?? item.total ?? 0);
      total += amt;
      const d = String(item.date ?? "");
      if (d.startsWith(currentMonth)) {
        monthTotal += amt;
      }
      const cat = String(item.category ?? "General");
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
    }

    let topCat = "—";
    let topCatAmt = 0;
    for (const [cat, amt] of Object.entries(categoryMap)) {
      if (amt > topCatAmt) {
        topCat = cat;
        topCatAmt = amt;
      }
    }

    return {
      total,
      monthTotal,
      count: expenses.length,
      topCat,
    };
  }, [expenses]);

  const filteredRows = useMemo(() => {
    return expenses.filter((r) => {
      const q = search.toLowerCase().trim();
      const cat = String(r.category ?? "").toLowerCase();
      const vendor = String(r.vendor ?? "").toLowerCase();
      const ref = String(r.reference ?? "").toLowerCase();
      const payMode = String(r.payment_mode ?? "").toLowerCase();

      const matchesSearch = !q || cat.includes(q) || vendor.includes(q) || ref.includes(q) || payMode.includes(q);
      const matchesCategory = categoryFilter === "ALL" || String(r.category ?? "") === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  function exportCsv() {
    if (expenses.length === 0) return;
    const headers = ["Expense ID", "Category", "Vendor / Payee", "Date", "Amount", "Payment Mode", "Reference", "Status"];
    const csvRows = expenses.map((r) => [
      `"${String(r.id ?? "")}"`,
      `"${String(r.category ?? "General")}"`,
      `"${String(r.vendor ?? "—")}"`,
      `"${String(r.date ?? "—")}"`,
      `"${Number(r.amount ?? r.total ?? 0)}"`,
      `"${String(r.payment_mode ?? "—")}"`,
      `"${String(r.reference ?? "—")}"`,
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
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-l-4 border-l-brand flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Total Recorded Expenses</p>
            <p className="mt-1 text-2xl font-bold text-ink">{inr(metrics.total)}</p>
          </div>
          <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
            <Wallet className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">This Month Expenses</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{inr(metrics.monthTotal)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Top Spend Category</p>
            <p className="mt-1 text-base font-bold text-emerald-700 truncate max-w-[170px]" title={metrics.topCat}>
              {metrics.topCat}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <Receipt className="h-6 w-6" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Total Entries</p>
            <p className="mt-1 text-2xl font-bold text-purple-700">{metrics.count}</p>
          </div>
          <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
            <Building2 className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Main Expense Table Card */}
      <Card className="p-6">
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
              <Wallet className="h-5 w-5 text-brand" /> Manage Expenses
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Record business operating expenses, utility bills, and vendor payments for accurate accounting &amp; P&amp;L reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={expenses.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-sm transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-4 w-4 text-muted" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand/90 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-brand shadow-sm cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search vendor, category, note..."
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
                  <div className="flex items-center gap-1">
                    Expense Category <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    Vendor / Payee <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    Date <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5">Payment Mode</th>
                <th className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    Amount <ArrowUpDown className="h-3 w-3 text-muted/60" />
                  </div>
                </th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted">
                    Loading expenses…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full bg-slate-100 p-3 text-muted">
                        <Wallet className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-ink">No expenses recorded</p>
                      <p className="text-xs text-muted max-w-sm">
                        Keep track of overheads, rent, salaries, and operating expenses by clicking &ldquo;Add Expense&rdquo;.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand/90 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add First Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, pageSize).map((r, idx) => (
                  <tr key={`${String(r.id || r.category || "exp")}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                    <td className="px-3 py-3 font-semibold text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        {String(r.category ?? "General")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted">{String(r.vendor ?? "—")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.date ?? "—")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.payment_mode ?? "Bank Transfer")}</td>
                    <td className="px-3 py-3 text-right font-bold text-ink">
                      {inr(Number(r.amount ?? r.total ?? 0))}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        {String(r.status ?? "RECORDED")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(r)}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink cursor-pointer group"
                          title="View Details"
                        >
                          <Settings className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-200" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(r)}
                          className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-brand/10 p-2 text-brand">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Record Business Expense</h3>
                  <p className="text-xs text-muted">Add an expense to keep your accounts and P&amp;L accurate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-slate-200/60 hover:text-ink transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Expense Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm font-medium"
                    required
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Other">Other / Custom Category...</option>
                  </select>
                </div>
                {category === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                    required
                  />
                )}
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 5000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs font-bold text-ink outline-none focus:border-brand shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Vendor / Payee */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Vendor / Paid To <span className="text-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Landlord, Airtel, AWS, Staples"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                />
              </div>

              {/* Payment Mode & Reference */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Payment Method</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                    >
                      {PAYMENT_MODES.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Ref / Bill # <span className="text-muted font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <input
                      type="text"
                      placeholder="e.g. BILL-9821"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Notes / Description <span className="text-muted font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or expense description..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand shadow-sm resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-muted hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Settings Modal */}
      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="Expense"
        onClose={() => setSelectedRecord(null)}
        onDelete={(rec) => handleDeleteExpense(rec)}
      />
    </div>
  );
}
