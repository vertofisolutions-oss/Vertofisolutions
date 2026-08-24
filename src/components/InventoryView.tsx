"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, AlertTriangle, Warehouse, History, X } from "lucide-react";
import { Button, Card, EmptyState } from "@/ui";
import { api } from "@/lib/api";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function InvTile({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warn" }) {
  return (
    <Card className="py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${tone === "danger" ? "text-danger" : tone === "warn" ? "text-gold" : "text-ink"}`}>{value}</p>
    </Card>
  );
}

/** Comprehensive inventory: valuation tiles, stock list with low-stock alerts,
 *  per-product stock ledger, manual adjustments, and warehouses. */
export function InventoryView({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"stock" | "low" | "warehouses">("stock");
  const [val, setVal] = useState<{ skus: number; totalQty: number; totalValue: number; lowStock: number; outOfStock: number } | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [low, setLow] = useState<Record<string, unknown>[]>([]);
  const [warehouses, setWarehouses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState<Record<string, unknown> | null>(null);
  const [ledgerFor, setLedgerFor] = useState<Record<string, unknown> | null>(null);
  const [whName, setWhName] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [v, s, l, w] = await Promise.allSettled([
        api.acc.inventoryValuation(orgId), api.acc.inventory(orgId), api.acc.lowStock(orgId), api.acc.warehouses(orgId),
      ]);
      if (v.status === "fulfilled") setVal(v.value);
      setRows(s.status === "fulfilled" ? s.value : []);
      setLow(l.status === "fulfilled" ? l.value : []);
      setWarehouses(w.status === "fulfilled" ? w.value : []);
    } finally { setLoading(false); }
  }, [orgId]);
  useEffect(() => { void reload(); }, [reload]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InvTile label="STOCK VALUE" value={val ? inr(val.totalValue) : "₹0"} />
        <InvTile label="SKUS" value={val ? String(val.skus) : "0"} />
        <InvTile label="LOW STOCK" value={val ? String(val.lowStock) : "0"} tone={val && val.lowStock > 0 ? "warn" : undefined} />
        <InvTile label="OUT OF STOCK" value={val ? String(val.outOfStock) : "0"} tone={val && val.outOfStock > 0 ? "danger" : undefined} />
      </div>

      <div className="flex gap-1 border-b border-border">
        {([["stock", "Stock"], ["low", "Low stock"], ["warehouses", "Warehouses"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-[13px] font-semibold transition ${tab === k ? "border-b-2 border-brand text-brand" : "text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>

      {tab === "stock" && (
        <Card>
          {loading ? <p className="text-[12px] text-muted">Loading…</p> : rows.length === 0 ? (
            <EmptyState title="No products in stock" description="Add products and record purchases — stock tracks automatically." />
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <tr><th className="py-2 pr-3">Product</th><th className="px-3">HSN</th><th className="px-3 text-right">Stock</th><th className="px-3 text-right">Avg cost</th><th className="px-3 text-right">Value</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={String(r.id)} className={`border-b border-borderCard ${r.low_stock ? "bg-amber-50/40" : ""}`}>
                      <td className="py-2 pr-3 font-medium text-ink">{String(r.name)}{r.low_stock ? <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-gold" /> : null}</td>
                      <td className="px-3 text-muted">{String(r.hsn ?? "—")}</td>
                      <td className="px-3 text-right text-ink">{String(r.stock ?? 0)} {String(r.unit ?? "")}</td>
                      <td className="px-3 text-right text-muted">{inr(Number(r.avg_cost))}</td>
                      <td className="px-3 text-right text-ink">{inr(Number(r.stock_value))}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setLedgerFor(r)} className="mr-2 text-muted hover:text-brand" title="Stock ledger"><History className="inline h-4 w-4" /></button>
                        <button onClick={() => setAdjust(r)} className="text-[12px] font-semibold text-brand">Adjust</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "low" && (
        <Card>
          {low.length === 0 ? (
            <EmptyState title="Nothing to reorder" description="Products at or below their reorder level appear here." />
          ) : (
            <ul className="divide-y divide-borderCard">
              {low.map((r) => (
                <li key={String(r.id)} className="flex items-center justify-between py-2.5">
                  <div><p className="text-[13px] font-medium text-ink">{String(r.name)}</p><p className="text-[11px] text-muted">Stock {String(r.stock)} · reorder at {String(r.reorder_level)}</p></div>
                  <button onClick={() => setAdjust(r)} className="border border-border px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-brand">Add stock</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "warehouses" && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <input className="vf-win flex-1" placeholder="New warehouse name" value={whName} onChange={(e) => setWhName(e.target.value)} />
            <Button variant="primary" disabled={!whName.trim()} onClick={async () => { await api.acc.createWarehouse(orgId, { name: whName.trim() }); setWhName(""); void reload(); }}><Plus className="mr-1 h-4 w-4" />Add</Button>
          </div>
          {warehouses.length === 0 ? <p className="text-[12px] text-muted">No warehouses yet — add one above to organize stock by location.</p> : (
            <ul className="divide-y divide-borderCard">
              {warehouses.map((w) => (
                <li key={String(w.id)} className="flex items-center gap-2 py-2.5 text-[13px]">
                  <Warehouse className="h-4 w-4 text-muted" /><span className="font-medium text-ink">{String(w.name)}</span>
                  {w.is_default ? <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand">Default</span> : null}
                  <span className="text-muted">{[w.city, w.state].filter(Boolean).join(", ")}</span>
                </li>
              ))}
            </ul>
          )}
          <style>{`.vf-win{border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;font-size:14px;outline:none}.vf-win:focus{border-color:#1378F8}`}</style>
        </Card>
      )}

      {adjust && <AdjustModal orgId={orgId} product={adjust} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); void reload(); }} />}
      {ledgerFor && <LedgerDrawer orgId={orgId} product={ledgerFor} onClose={() => setLedgerFor(null)} />}
    </div>
  );
}

function AdjustModal({ orgId, product, onClose, onDone }: { orgId: string; product: Record<string, unknown>; onClose: () => void; onDone: () => void }) {
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [qty, setQty] = useState(""); const [rate, setRate] = useState(""); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await api.acc.adjustStock(orgId, { productId: product.id, direction, qty: Number(qty), rate: rate ? Number(rate) : undefined, reason: reason || undefined }); onDone(); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-borderCard bg-white p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-semibold text-ink">Adjust stock — {String(product.name)}</h3><button onClick={onClose} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button></div>
        <div className="mb-3 flex gap-2">
          {(["IN", "OUT"] as const).map((d) => (
            <button key={d} onClick={() => setDirection(d)} className={`flex-1 rounded-lg border py-2 text-[13px] font-semibold ${direction === d ? "border-brand bg-brand-50 text-brand" : "border-border text-muted"}`}>{d === "IN" ? "Stock in" : "Stock out"}</button>
          ))}
        </div>
        <input className="vf-win mb-2 w-full" placeholder="Quantity" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        {direction === "IN" && <input className="vf-win mb-2 w-full" placeholder="Cost per unit (optional → updates avg cost)" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />}
        <input className="vf-win mb-3 w-full" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="primary" className="w-full" disabled={busy || !qty} onClick={save}>{busy ? "Saving…" : "Save adjustment"}</Button>
        <style>{`.vf-win{border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;font-size:14px;outline:none}.vf-win:focus{border-color:#1378F8}`}</style>
      </div>
    </div>
  );
}

function LedgerDrawer({ orgId, product, onClose }: { orgId: string; product: Record<string, unknown>; onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  useEffect(() => { api.acc.stockLedger(orgId, String(product.id)).then(setRows).catch(() => setRows([])); }, [orgId, product.id]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-auto bg-white p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-semibold text-ink">Stock ledger — {String(product.name)}</h3><button onClick={onClose} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button></div>
        {rows === null ? <p className="text-[12px] text-muted">Loading…</p> : rows.length === 0 ? <p className="text-[12px] text-muted">No movements yet.</p> : (
          <ul className="divide-y divide-borderCard text-[13px]">
            {rows.map((r) => (
              <li key={String(r.id)} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-ink">{String(r.movement_type)} <span className={r.direction === "IN" ? "text-emerald-600" : "text-danger"}>{r.direction === "IN" ? "+" : "−"}{String(r.qty)}</span></p>
                  <p className="text-[11px] text-muted">{new Date(String(r.created_at)).toLocaleString("en-IN")} {r.note ? `· ${String(r.note)}` : ""}</p>
                </div>
                <span className="text-muted">bal {String(r.balance_qty)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
