"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, ShieldCheck, AlertTriangle, TrendingUp, Download, Search, ArrowUpDown, Calendar, Settings, MoreHorizontal, Eye, RefreshCw, Mail, XCircle } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";
import { RecordSettingsModal } from "./RecordSettingsModal";

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

export function DebitNotesView({
  orgId,
  onNewDebitNote,
}: {
  orgId: string;
  onNewDebitNote: () => void;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState({ start: "2026-09-01", end: "2026-09-03" });
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  function handleDownload(r: Record<string, unknown>) {
    // If there is no specific preview/PDF view yet, we just alert or do standard view
    alert("Download functionality for Debit Note is being configured.");
  }

  function handleDuplicate(r: Record<string, unknown>) {
    const newId = "dn-" + Date.now();
    const newNo = String(r.dn_no ?? "DN") + "-COPY";
    const clone = { ...r, id: newId, dn_no: newNo };
    setRows((prev) => {
      const updated = [clone, ...prev];
      return updated;
    });
    alert("Successfully duplicated as " + newNo);
  }

  function handleEmail(r: Record<string, unknown>) {
    const custEmail = String(r.customer_email ?? r.vendor_email ?? "");
    const invNo = String(r.dn_no ?? "Debit Note");
    const amount = Number(r.total ?? r.amount ?? 0);
    const subject = encodeURIComponent("Debit Note " + invNo + " from Vertofi");
    const body = encodeURIComponent("Dear Customer,\n\nPlease find attached the details for Debit Note " + invNo + " amounting to " + amount + ".\n\nThank you.");
    window.location.href = "mailto:" + custEmail + "?subject=" + subject + "&body=" + body;
  }


  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.acc
      .documents(orgId)
      .then((docs) => {
        if (!alive) return;
        const dnList = Array.isArray(docs)
          ? docs.filter((d) => String(d.doc_type || d.type || "").toUpperCase().includes("DEBIT_NOTE"))
          : [];
        setRows(dnList);
      })
      .catch(() => setRows([]))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  
  const kpis = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    let monthCount = 0, totalAmt = 0, gstAmt = 0, pendingCount = 0;
    for (const r of rows) {
      const t = Number(r.total || r.amount || 0);
      totalAmt += t;
      if (String(r.date || "").startsWith(ym)) monthCount++;
      if (String(r.status || "").toUpperCase() === "PENDING") pendingCount++;
      gstAmt += Number(r.tax || r.totalTax || 0);
    }
    return { monthCount, totalAmt, pendingCount, gstAmt };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      const dnNo = String(r.doc_number ?? r.debit_note_no ?? r.number ?? "").toLowerCase();
      const pNo = String(r.reference ?? r.purchase_no ?? "").toLowerCase();
      const supp = String(r.vendor_name ?? r.supplier_name ?? r.customer_name ?? "").toLowerCase();
      return dnNo.includes(q) || pNo.includes(q) || supp.includes(q);
    });
  }, [rows, search]);

  function exportCsv() {
    if (rows.length === 0) return;
    const headers = ["Debit Note No.", "Purchase No.", "Supplier", "Date", "Amount", "Status"];
    const csvRows = rows.map((r) => [
      `"${String(r.doc_number ?? r.debit_note_no ?? "—")}"`,
      `"${String(r.reference ?? "—")}"`,
      `"${String(r.vendor_name ?? r.supplier_name ?? "—")}"`,
      `"${String(r.date ?? "—").slice(0, 10)}"`,
      `"${Number(r.total ?? 0)}"`,
      `"${String(r.status ?? "ISSUED")}"`,
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `debit_notes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-6">
      {/* Header Title & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Purchase Returns / Debit Notes</h2>
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
            onClick={onNewDebitNote}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Debit Notes
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
      <div className="mt-4 w-full overflow-visible rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-bg2 text-[11px] font-semibold text-muted">
            <tr>
              <th className="px-3 py-2.5 text-center">No</th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Debit Note No. <ArrowUpDown className="h-3 w-3 text-muted/60" />
                </div>
              </th>
              <th className="px-3 py-2.5">
                <div className="flex items-center gap-1 cursor-pointer">
                  Purchase No. <ArrowUpDown className="h-3 w-3 text-muted/60" />
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
                <td colSpan={8} className="py-8 text-center text-xs text-muted">
                  Loading debit notes…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-muted font-medium">
                  No data available in table
                </td>
              </tr>
            ) : (
              filteredRows.slice(0, pageSize).map((r, idx) => (
                <tr key={`${String(r.id || r.doc_number || "dn")}-${idx}`} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 text-center text-muted font-medium">{idx + 1}</td>
                  <td className="px-3 py-3 font-semibold text-brand">{String(r.doc_number ?? r.debit_note_no ?? "DN-001")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.reference ?? "PUR-001")}</td>
                  <td className="px-3 py-3 font-medium text-ink">{String(r.vendor_name ?? r.supplier_name ?? "—")}</td>
                  <td className="px-3 py-3 text-muted">{String(r.date ?? "Today").slice(0, 10)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{inr(Number(r.total ?? 0))}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {String(r.status ?? "ISSUED")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rowKey = String(r.id || r.invoice_no || r.bill_no || r.proforma_no || r.cn_no || r.dn_no || r.dc_no || "doc");
                            setOpenDropdownId(openDropdownId === rowKey ? null : rowKey);
                          }}
                          className="inline-flex items-center justify-center p-1 text-blue-500 hover:text-blue-700 transition cursor-pointer"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        
                        {openDropdownId === String(r.id || r.invoice_no || r.bill_no || r.proforma_no || r.cn_no || r.dn_no || r.dc_no || "doc") && (
                          <div 
                            className="absolute right-8 top-8 z-50 w-64 rounded-md bg-white shadow-xl border border-slate-200 text-left text-[13px] text-slate-700 font-normal divide-y divide-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={() => { setSelectedRecord(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Eye className="h-4 w-4 text-slate-400" /> View
                            </button>
                            <button onClick={() => { typeof handleDownload === 'function' ? handleDownload(r) : alert('Download ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Download className="h-4 w-4 text-slate-400" /> Download
                            </button>
                            <button onClick={() => { typeof handleDuplicate === 'function' ? handleDuplicate(r) : alert('Duplicate ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Duplicate Debit Note
                            </button>
                            <button onClick={() => { typeof handleEmail === 'function' ? handleEmail(r) : alert('Email ' + r.id); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <Mail className="h-4 w-4 text-slate-400" /> Send Email
                            </button>
                            <button onClick={() => { setSelectedRecord(r); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Edit Debit Note
                            </button>
                            <button onClick={() => { alert("Convert to Sales Return"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Convert to Sales Return
                            </button>
                            <button onClick={() => { alert("Update Return Period"); setOpenDropdownId(null); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                              <RefreshCw className="h-4 w-4 text-slate-400" /> Update Return Period
                            </button>
                            <button onClick={() => { 
                                alert('Cancel ' + r.id);
                                setOpenDropdownId(null); 
                            }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer">
                              <XCircle className="h-4 w-4 text-slate-400" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecordSettingsModal
        isOpen={Boolean(selectedRecord)}
        record={selectedRecord}
        type="Debit Note"
        onClose={() => setSelectedRecord(null)}
      />
    </Card>
  );
}
