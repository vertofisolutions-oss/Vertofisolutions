"use client";

import { useState, useEffect } from "react";
import { Plus, Receipt, ShieldCheck, AlertTriangle, TrendingUp, Download, Search, ArrowUpDown, Calendar, Loader2, MoreHorizontal, Eye, RefreshCw, Mail, XCircle } from "lucide-react";
import { Card } from "@/ui";

const inr = (n: number) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;


function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "gold" | "brand" }) {
  return (
    <Card className="py-3 px-4 mb-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <Icon className={"h-4 w-4 " + (tone === "gold" ? "text-gold" : "text-brand")} />
      </div>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
    </Card>
  );
}

export function DeliveryChallansView({
  orgId,
  onNewChallan,
}: {
  orgId: string;
  onNewChallan?: () => void;
}) {
  const [dateRange, setDateRange] = useState("01-09-2026 - 04-09-2026");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const kpis = { monthCount: 0, totalAmt: 0, transitCount: 0, deliveredCount: 0 };

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  function exportCsv() {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert("No data available to export.");
    }, 600);
  }

  return (
    <div className="w-full space-y-4">

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="CHALLANS THIS MONTH" value={String(kpis.monthCount)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL VALUE" value={inr(kpis.totalAmt)} icon={Receipt} tone="brand" />
        <Kpi label="IN TRANSIT" value={String(kpis.transitCount)} icon={AlertTriangle} tone="gold" />
        <Kpi label="DELIVERED" value={String(kpis.deliveredCount)} icon={ShieldCheck} tone="brand" />
      </div>

      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
        
        {/* Header Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
          <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">Delivery Challan</h2>
          
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
              onClick={() => {
                if (onNewChallan) onNewChallan();
                else alert("Create Delivery Challan flow");
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-5 py-2 text-xs font-bold text-white transition hover:bg-green-600 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Delivery Challan
            </button>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-px bg-slate-200/80 w-full" />

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
          {/* Left Side: Date Picker */}
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
              className="border-l border-slate-300 px-3.5 py-2.5 bg-[#e2e8f0]/60 text-slate-600 hover:text-slate-900 cursor-pointer transition"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          {/* Right Side: Search & Page Size */}
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
                <th className="px-3.5 py-3 text-center w-12 border-r border-slate-200/50">#</th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50 w-[14%]">
                  <div className="flex items-center justify-between gap-1">
                    <span>Invoice Number</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Customer</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Invoice Type</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Invoice Date</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Return Period</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50">
                  <div className="flex items-center justify-between gap-1">
                    <span>Amount</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 transition select-none border-r border-slate-200/50 min-w-[140px]">
                  <div className="flex items-center justify-between gap-1">
                    <span>Sales Invoice Number</span> <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="px-3.5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan={9} className="py-12 text-center text-[13px] text-[#006666] font-medium tracking-wide">
                  No data available in table
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
