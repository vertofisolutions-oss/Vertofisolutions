"use client";
import { useEffect, useMemo, useState } from "react";
import { Users, IndianRupee, AlertTriangle, Plus, Search, Loader2, FileText, Receipt } from "lucide-react";
import { Button, Card } from "@/ui";
import { api, ApiError } from "@/lib/api";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const num = (v: unknown) => Number(v ?? 0) || 0;

interface Agg { revenue: number; outstanding: number; count: number; last: string | null }

/** Customers as an intelligence screen: per-customer revenue, outstanding and
 *  last activity (derived from real invoices), GSTIN-autofill add, and quick
 *  actions (new invoice, account statement via the report engine). */
export function CustomersView({ orgId, rows, loading, reload, onNewInvoice }: {
  orgId: string; rows: Record<string, unknown>[]; loading: boolean; reload: () => void; onNewInvoice: (customer?: string) => void;
}) {
  const [sales, setSales] = useState<Record<string, unknown>[]>([]);
  const [f, setF] = useState({ name: "", gstin: "", state: "" });
  const [gstinBusy, setGstinBusy] = useState(false);
  const [gstinNote, setGstinNote] = useState<string | null>(null);
  const [stmtBusy, setStmtBusy] = useState<string | null>(null);

  useEffect(() => { api.acc.sales(orgId).then(setSales).catch(() => setSales([])); }, [orgId]);

  // Aggregate invoices by (lowercased) customer name.
  const byName = useMemo(() => {
    const m: Record<string, Agg> = {};
    for (const s of sales) {
      const key = String(s.customer_name ?? "").toLowerCase();
      if (!key) continue;
      const a = (m[key] ??= { revenue: 0, outstanding: 0, count: 0, last: null });
      a.revenue += num(s.total); a.count++;
      if (String(s.status ?? "").toUpperCase() !== "PAID") a.outstanding += num(s.total);
      const d = String(s.date ?? "");
      if (d && (!a.last || d > a.last)) a.last = d;
    }
    return m;
  }, [sales]);

  const kpis = useMemo(() => {
    let receivable = 0, withSales = 0;
    for (const a of Object.values(byName)) { receivable += a.outstanding; if (a.count > 0) withSales++; }
    return { customers: rows.length, receivable, withSales };
  }, [byName, rows.length]);

  async function fetchGstin() {
    const g = f.gstin.trim().toUpperCase();
    if (g.length !== 15) { setGstinNote("Enter a 15-character GSTIN."); return; }
    setGstinBusy(true); setGstinNote(null);
    try {
      const p = await api.gst.lookup(g);
      if (!p.structurallyValid) { setGstinNote("That GSTIN doesn't look valid."); return; }
      setF({ name: p.tradeName || p.legalName || f.name, gstin: g, state: p.address?.state || p.state || f.state });
      setGstinNote(p.source === "GSP" ? `Found: ${p.legalName ?? p.tradeName ?? "taxpayer"}` : `Validated · ${p.state ?? "state"} · PAN ${p.pan ?? "—"}`);
    } catch (e) { setGstinNote(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Couldn't reach the GST network."); }
    finally { setGstinBusy(false); }
  }

  async function add() {
    if (!f.name) return;
    try { await api.acc.addCustomer(orgId, f); setF({ name: "", gstin: "", state: "" }); setGstinNote(null); reload(); } catch { /* */ }
  }

  /** Generate + download an Account Statement for one customer via the report engine. */
  async function statement(name: string) {
    setStmtBusy(name);
    try {
      const mine = sales.filter((s) => String(s.customer_name ?? "").toLowerCase() === name.toLowerCase());
      const agg = byName[name.toLowerCase()] ?? { revenue: 0, outstanding: 0, count: 0, last: null };
      await api.acc.downloadReportPdf(orgId, {
        docType: "ACCOUNT_STATEMENT",
        title: "Account Statement",
        subtitle: name,
        sections: [
          { kind: "kv", heading: "Summary", rows: [
            { label: "Total billed", value: inr(agg.revenue), bold: true },
            { label: "Outstanding", value: inr(agg.outstanding), bold: true },
            { label: "Invoices", value: String(agg.count) },
          ] },
          { kind: "table", heading: "Invoices", columns: [
            { label: "Date", align: "left", w: 90 }, { label: "Invoice", align: "left", w: 140 },
            { label: "Status", align: "center", w: 80 }, { label: "Amount", align: "right" },
          ], data: mine.map((s) => [String(s.date ?? "").slice(0, 10), String(s.invoice_no ?? "—"), String(s.status ?? "ISSUED"), inr(num(s.total))]),
            total: ["", "", "Total", inr(agg.revenue)] },
        ],
      }, `Statement-${name.replace(/[^\w]/g, "_")}.pdf`);
    } catch { /* surfaced by the download helper */ }
    finally { setStmtBusy(null); }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card className="py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Customers</p><p className="mt-1 text-2xl font-bold text-ink">{kpis.customers}</p></Card>
        <Card className="py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Total receivable</p><p className={`mt-1 text-2xl font-bold ${kpis.receivable ? "text-danger" : "text-ink"}`}>{inr(kpis.receivable)}</p></Card>
        <Card className="py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Active (with sales)</p><p className="mt-1 text-2xl font-bold text-ink">{kpis.withSales}</p></Card>
      </div>

      <Card>
        <h2 className="text-[14px] font-semibold text-ink">Add customer</h2>
        {gstinNote && <p className="mt-1 text-[12px] text-muted">{gstinNote}</p>}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_auto_1fr_1fr_auto]">
          <input className="vf-cin" placeholder="GSTIN — fetch to autofill" value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} maxLength={15} />
          <button type="button" onClick={fetchGstin} disabled={gstinBusy || f.gstin.trim().length !== 15} className="grid w-10 place-items-center rounded-[10px] border border-border text-brand disabled:opacity-40">{gstinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</button>
          <input className="vf-cin" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="vf-cin" placeholder="State" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
          <Button variant="primary" onClick={add}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-[14px] font-semibold text-ink">Customers</h3>
        {loading ? <p className="mt-3 text-[12px] text-muted">Loading…</p> : rows.length === 0 ? (
          <p className="mt-3 text-[12px] text-muted">No customers yet.</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                <tr><th className="py-1.5 pr-3">Customer</th><th className="px-3">GSTIN</th><th className="px-3 text-right">Revenue</th><th className="px-3 text-right">Outstanding</th><th className="px-3">Last activity</th><th className="px-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const a = byName[String(c.name ?? "").toLowerCase()] ?? { revenue: 0, outstanding: 0, count: 0, last: null };
                  const name = String(c.name ?? "—");
                  return (
                    <tr key={String(c.id)} className="border-b border-borderCard">
                      <td className="py-2 pr-3 font-medium text-ink">{name}<div className="text-[11px] font-normal text-muted">{String(c.state ?? "")}</div></td>
                      <td className="px-3 font-mono text-[11px] text-muted">{String(c.gstin ?? "—")}</td>
                      <td className="px-3 text-right text-ink">{inr(a.revenue)}</td>
                      <td className={`px-3 text-right ${a.outstanding ? "font-semibold text-danger" : "text-muted"}`}>{inr(a.outstanding)}</td>
                      <td className="px-3 text-muted">{a.last ? a.last.slice(0, 10) : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => onNewInvoice(name)} className="mr-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand" title="New invoice"><Receipt className="h-3.5 w-3.5" />Invoice</button>
                        <button onClick={() => statement(name)} disabled={stmtBusy === name} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink hover:text-brand disabled:opacity-50" title="Account statement PDF">{stmtBusy === name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}Statement</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <style>{`.vf-cin{width:100%;border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;font-size:14px;outline:none}.vf-cin:focus{border-color:#1378F8}`}</style>
    </div>
  );
}
