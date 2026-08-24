"use client";
import { useEffect, useMemo, useState } from "react";
import { Receipt, FileText, ShieldCheck, AlertTriangle, Plus, TrendingUp } from "lucide-react";
import { Button, Card } from "@/ui";
import { api } from "@/lib/api";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const num = (v: unknown) => Number(v ?? 0) || 0;

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Receipt; tone?: "gold" | "brand" }) {
  return (
    <Card className="py-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <Icon className={`h-4 w-4 ${tone === "gold" ? "text-gold" : "text-brand"}`} />
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
    </Card>
  );
}

export function SalesView({ orgId, rows = [], loading, onNewInvoice, onNewDoc }: {
  orgId: string; rows?: Record<string, unknown>[]; loading?: boolean;
  onNewInvoice: () => void; onNewDoc: (type: string) => void;
}) {
  const [gst, setGst] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { api.mod.gstSummary(orgId).then(setGst).catch(() => setGst(null)); }, [orgId]);

  const kpis = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let monthSales = 0, total = 0, unpaidCount = 0, unpaidAmt = 0;
    const byCustomer: Record<string, number> = {};
    for (const r of rows) {
      const t = num(r.total);
      total += t;
      if (String(r.date ?? "").startsWith(ym)) monthSales += t;
      if (String(r.status ?? "").toUpperCase() !== "PAID") { unpaidCount++; unpaidAmt += t; }
      const c = String(r.customer_name ?? "—");
      byCustomer[c] = (byCustomer[c] ?? 0) + t;
    }
    const topCustomers = Object.entries(byCustomer).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const gstCollected = gst ? num(gst.cgst) + num(gst.sgst) + num(gst.igst) + num(gst.total_tax) + num(gst.outputTax) : 0;
    return { monthSales, total, count: rows.length, unpaidCount, unpaidAmt, topCustomers, gstCollected };
  }, [rows, gst]);

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="SALES THIS MONTH" value={inr(kpis.monthSales)} icon={TrendingUp} tone="brand" />
        <Kpi label="TOTAL INVOICED" value={inr(kpis.total)} icon={Receipt} tone="brand" />
        <Kpi label="GST COLLECTED" value={kpis.gstCollected ? inr(kpis.gstCollected) : "—"} icon={ShieldCheck} tone="gold" />
        <Kpi label="UNPAID INVOICES" value={`${kpis.unpaidCount} · ${inr(kpis.unpaidAmt)}`} icon={AlertTriangle} tone="brand" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="primary" onClick={onNewInvoice} className="gap-1.5 font-semibold">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
        <button
          type="button"
          onClick={() => onNewDoc("QUOTATION")}
          className="rounded-lg border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition hover:border-brand"
        >
          New Quotation
        </button>
        <button
          type="button"
          onClick={() => onNewDoc("CREDIT_NOTE")}
          className="rounded-lg border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition hover:border-brand"
        >
          New Credit Note
        </button>
        <button
          type="button"
          onClick={() => onNewDoc("PROFORMA")}
          className="rounded-lg border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition hover:border-brand"
        >
          New Proforma
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Top customers widget */}
        <Card className="lg:col-span-1">
          <h3 className="text-[14px] font-semibold text-ink">Top customers</h3>
          {kpis.topCustomers.length === 0 ? (
            <p className="mt-3 text-[12px] text-muted">No sales yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {kpis.topCustomers.map(([name, amt]) => {
                const max = kpis.topCustomers[0]![1] || 1;
                return (
                  <li key={name}>
                    <div className="flex justify-between text-[12px]"><span className="truncate pr-2 text-ink">{name}</span><span className="font-medium text-ink">{inr(amt)}</span></div>
                    <span className="mt-1 block h-1.5 rounded-full bg-bg2"><span className="block h-full rounded-full bg-gradient-to-r from-[#1378F8] to-[#5BA3FF]" style={{ width: `${(amt / max) * 100}%` }} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Recent invoices */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-ink">Recent invoices</h3>
            <FileText className="h-4 w-4 text-muted" />
          </div>
          {loading ? <p className="mt-3 text-[12px] text-muted">Loading…</p> : rows.length === 0 ? (
            <p className="mt-3 text-[12px] text-muted">No invoices yet — create your first from the actions above.</p>
          ) : (
            <div className="mt-3 overflow-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                  <tr><th className="py-1.5 pr-3">Invoice</th><th className="px-3">Customer</th><th className="px-3 text-right">Total</th><th className="px-3">Status</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r) => (
                    <tr key={String(r.id)} className="border-b border-borderCard">
                      <td className="py-2 pr-3 font-medium text-ink">{String(r.invoice_no ?? "—")}</td>
                      <td className="px-3 text-muted">{String(r.customer_name ?? "—")}</td>
                      <td className="px-3 text-right text-ink">{inr(num(r.total))}</td>
                      <td className="px-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${String(r.status).toUpperCase() === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{String(r.status ?? "ISSUED")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
