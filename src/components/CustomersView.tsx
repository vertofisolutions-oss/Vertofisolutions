"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download, Search, ArrowUpDown, UserX, Settings, Trash2 } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { AddCustomerModal } from "./AddCustomerModal";
import { CustomerDetailsModal, type CustomerRecord } from "./CustomerDetailsModal";

function dedupeCustomers(list: Record<string, unknown>[]): Record<string, unknown>[] {
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

export function CustomersView({
  orgId,
  rows,
  loading,
  reload,
  onNewCustomer,
}: {
  orgId: string;
  rows: Record<string, unknown>[];
  loading: boolean;
  reload?: () => void;
  onNewCustomer?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  function handleDeleteCustomer(r: Record<string, unknown>) {
    const custName = String(r.name ?? r.customer_name ?? "this customer");
    if (!confirm(`Are you sure you want to delete ${custName}?`)) return;
    const targetId = String(r.id ?? "");
    setCustomerList((prev) => {
      const updated = prev.filter((item) => {
        if (targetId && String(item.id) === targetId) return false;
        if (!targetId && String(item.name ?? item.customer_name) === custName) return false;
        return true;
      });
      try {
        localStorage.setItem("vertofi_local_customers", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (targetId) {
      const oid = orgId || "demo-business-org";
      void fetch(`/api/v1/crm/${oid}/customers/${encodeURIComponent(targetId)}`, { method: "DELETE" }).catch(() => {});
    }
  }
  const [customerList, setCustomerList] = useState<Record<string, unknown>[]>(() => {
    let combined: Record<string, unknown>[] = Array.isArray(rows) && rows.length > 0 ? [...rows] : [];
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("vertofi_local_customers") || "[]");
        if (Array.isArray(stored) && stored.length > 0) {
          combined = [...stored, ...combined];
        }
      } catch {}
    }
    // Removed mock data
    return dedupeCustomers(combined);
  });

  useEffect(() => {
    if (Array.isArray(rows) && rows.length > 0) {
      setCustomerList((prev) => dedupeCustomers([...rows, ...prev]));
    }
  }, [rows]);

  const filteredRows = useMemo(() => {
    return customerList.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const name = String(r.name ?? r.customer_name ?? "").toLowerCase();
      const legal = String(r.legal_name ?? "").toLowerCase();
      const phone = String(r.phone ?? r.mobile ?? "").toLowerCase();
      const gstin = String(r.gstin ?? "").toLowerCase();
      return name.includes(q) || legal.includes(q) || phone.includes(q) || gstin.includes(q);
    });
  }, [customerList, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["Name", "Legal Name", "Phone", "GSTIN / UIN", "Customer Status"];
    const csvRows = rows.map((r) => [
      `"${String(r.name ?? r.customer_name ?? "—")}"`,
      `"${String(r.legal_name ?? "—")}"`,
      `"${String(r.phone ?? r.mobile ?? "—")}"`,
      `"${String(r.gstin ?? "—")}"`,
      `"${String(r.status ?? "ACTIVE")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customers_${Date.now()}.csv`);
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
    <Card className="p-6">
      {/* Header Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Manage Customers</h2>
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
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add New Customer
          </button>
          <button
            type="button"
            onClick={() => alert("Select customers to deactivate")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-xs font-medium text-ink transition hover:bg-slate-50 cursor-pointer shadow-sm"
          >
            <UserX className="h-4 w-4 text-muted" /> De-activate Customer
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
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
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Name <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Legal Name <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Phone <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  GSTIN / UIN <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer">
                  Customer Status <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted">
                  Loading customers…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted font-medium">
                  No data available in table
                </td>
              </tr>
            ) : (
              filteredRows.slice(0, pageSize).map((r, idx) => {
                const rowKey = `${String(r.id || "cust")}-${idx}`;
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
                    <td className="px-3 py-3 font-semibold text-ink">{String(r.name ?? r.customer_name ?? "—")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.legal_name ?? "—")}</td>
                    <td className="px-3 py-3 text-muted">{String(r.phone ?? r.mobile ?? "—")}</td>
                    <td className="px-3 py-3 font-mono text-muted">{String(r.gstin ?? "—")}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {String(r.status ?? "ACTIVE")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(r as CustomerRecord)}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink cursor-pointer group"
                          title="View Customer Details & Settings"
                        >
                          <Settings className="h-4 w-4 mx-auto group-hover:rotate-45 transition-transform duration-200" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(r)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <AddCustomerModal
        orgId={orgId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCustomerAdded={(newCust) => {
          setCustomerList((prev) => dedupeCustomers([newCust, ...prev]));
          if (reload) reload();
        }}
      />

      <CustomerDetailsModal
        isOpen={Boolean(selectedCustomer)}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onUpdateCustomer={(updated) => {
          setCustomerList((prev) => {
            const next = prev.map((c) => (String(c.id) === String(updated.id) ? { ...c, ...updated } : c));
            try {
              localStorage.setItem("vertofi_local_customers", JSON.stringify(next));
            } catch {}
            return next;
          });
          setSelectedCustomer(null);
        }}
        onNewInvoice={(cust) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("vertofi:workspace-nav", {
                detail: { section: "sales", action: "create-invoice" },
              })
            );
          }
        }}
      />
    </Card>
  );
}
