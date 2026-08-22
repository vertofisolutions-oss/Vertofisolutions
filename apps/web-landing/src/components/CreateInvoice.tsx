"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, FileText, Wand2, Loader2, X, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/ui";
import { api, ApiError } from "@/lib/api";

type Mode = "traditional" | "smart" | "ai";
interface Item { name: string; hsn?: string; qty: number; rate: number; taxRate: number }

const blankItem = (): Item => ({ name: "", qty: 1, rate: 0, taxRate: 18 });

function totals(items: Item[], interState: boolean) {
  let taxable = 0;
  let tax = 0;
  for (const i of items) {
    const t = (i.qty || 0) * (i.rate || 0);
    taxable += t;
    tax += (t * (i.taxRate ?? 18)) / 100;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  const cgst = interState ? 0 : r(tax / 2);
  return { taxable: r(taxable), cgst, sgst: interState ? 0 : r(tax - cgst), igst: interState ? r(tax) : 0, total: r(taxable + tax) };
}

export function CreateInvoice({ orgId, onClose, onCreated, initialCommand }: { orgId: string; onClose: () => void; onCreated: () => void; initialCommand?: string }) {
  const [mode, setMode] = useState<Mode>(initialCommand ? "ai" : "smart");
  const [customer, setCustomer] = useState({ name: "", gstin: "", state: "" });
  const [interState, setInterState] = useState(false);
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [aiText, setAiText] = useState(initialCommand ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstinBusy, setGstinBusy] = useState(false);
  const [gstinNote, setGstinNote] = useState<string | null>(null);
  const [sellerState, setSellerState] = useState<string | null>(null);
  const t = totals(items, interState);

  // Seller's home state → so we can auto-decide intra (CGST+SGST) vs inter (IGST).
  useEffect(() => {
    let alive = true;
    api.mod.org(orgId).then((o) => { if (alive) setSellerState(String((o.state ?? o.gst_state ?? "") || "").trim() || null); }).catch(() => {});
    return () => { alive = false; };
  }, [orgId]);

  function applyInterState(buyerState: string) {
    if (sellerState && buyerState) setInterState(buyerState.trim().toLowerCase() !== sellerState.trim().toLowerCase());
  }

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  /**
   * Fetch the buyer's details straight from the GST network by GSTIN — legal/
   * trade name, state (→ auto intra/inter-state GST), PAN. Degrades honestly when
   * the GSP key isn't configured (still validates + fills state from the GSTIN).
   */
  async function fetchFromGstin() {
    const g = customer.gstin.trim().toUpperCase();
    if (g.length !== 15) { setGstinNote("Enter a 15-character GSTIN."); return; }
    setGstinBusy(true); setGstinNote(null);
    try {
      const p = await api.gst.lookup(g);
      if (!p.structurallyValid) { setGstinNote("That GSTIN doesn't look valid."); return; }
      const name = p.tradeName || p.legalName || customer.name;
      const state = p.address?.state || p.state || customer.state;
      setCustomer({ name, gstin: g, state: state ?? "" });
      if (state) applyInterState(state);
      setGstinNote(
        p.source === "GSP"
          ? `Fetched: ${p.legalName ?? name}${p.status ? ` · ${p.status}` : ""}`
          : `Validated · ${p.state ?? "state"} · PAN ${p.pan ?? "—"}. Add GSP key to fetch the legal name.`,
      );
    } catch (e) {
      setGstinNote(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Couldn't reach the GST network.");
    } finally {
      setGstinBusy(false);
    }
  }

  /** Auto-fill price/HSN/tax from the product master, then auto-detect HSN if still missing. */
  async function autoFillItem(i: number) {
    const it = items[i];
    if (!it?.name?.trim()) return;
    try {
      const prod = await api.acc.lookupProduct(orgId, it.name);
      if (prod) {
        setItem(i, {
          name: String(prod.name ?? it.name),
          rate: it.rate > 0 ? it.rate : Number(prod.rate ?? 0),
          hsn: it.hsn || String(prod.hsn ?? ""),
          taxRate: Number(prod.tax_rate ?? it.taxRate ?? 18),
        });
        if (prod.hsn) return; // catalog already has an HSN
      }
      // No HSN yet → auto-detect (catalog → reference → AI).
      const hsn = await api.acc.detectHsn(orgId, it.name);
      if (hsn) setItem(i, { hsn: it.hsn || hsn.hsn, taxRate: it.taxRate && it.taxRate !== 18 ? it.taxRate : hsn.gstRate });
    } catch { /* ignore */ }
  }

  async function smartFillCustomer() {
    if (!customer.name) return;
    try {
      const c = await api.acc.lookupCustomer(orgId, customer.name);
      if (c) setCustomer({ name: String(c.name), gstin: String(c.gstin ?? ""), state: String(c.state ?? "") });
    } catch {
      /* ignore */
    }
  }

  async function runAi() {
    if (!aiText) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.acc.aiDraft(orgId, aiText, "sales");
      if (r.degraded || !r.draft) {
        setError(r.reason === "ai_unavailable" ? "AI is unavailable — switch to Smart or Traditional mode." : "Couldn't read that — try rephrasing.");
        return;
      }
      const party = r.draft.party ?? {};
      setCustomer({ name: String(party.name ?? ""), gstin: String(party.gstin ?? ""), state: String(party.state ?? "") });
      setItems(r.draft.items.map((it) => ({ name: it.name, qty: it.qty, rate: it.rate, taxRate: it.taxRate })));
      setMode("traditional"); // drop into the editable form for review
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "ai_failed");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api.acc.createSale(orgId, {
        customerName: customer.name,
        items,
        interState,
        source: mode === "ai" ? "AI" : mode === "smart" ? "SMART" : "FORM",
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "create_failed");
    } finally {
      setBusy(false);
    }
  }

  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-borderCard bg-white shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-base font-semibold text-ink">Create Invoice</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        {/* Mode switch */}
        <div className="flex gap-1 border-b border-border bg-bg2 px-6 py-3">
          {([
            { k: "traditional", label: "Traditional", icon: FileText },
            { k: "smart", label: "Smart Form", icon: Wand2 },
            { k: "ai", label: "Create with AI", icon: Sparkles },
          ] as const).map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.k} onClick={() => setMode(m.k)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === m.k ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                <Icon className="h-4 w-4" /> {m.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-5 p-6">
          {mode === "ai" ? (
            <div className="rounded-xl border border-brand/20 bg-brand-50/40 p-4">
              <label className="text-sm font-medium text-ink">✨ Describe the invoice</label>
              <textarea
                className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
                rows={3}
                placeholder="Generate invoice for Ramesh Traders — 50 cement bags at ₹420 per bag."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />
              <Button variant="primary" className="mt-3" disabled={busy || !aiText} onClick={runAi}>
                {busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Reading…</> : "Draft with AI"}
              </Button>
              <p className="mt-2 text-xs text-muted">AI drafts the invoice — you review and confirm before it&apos;s created.</p>
            </div>
          ) : (
            <>
              {/* Customer */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium text-muted">Customer</label>
                  <input className="vf-in" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} onBlur={mode === "smart" ? smartFillCustomer : undefined} placeholder="ABC Traders" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">GSTIN <span className="text-brand">· fetch details</span></label>
                  <div className="flex gap-1.5">
                    <input className="vf-in" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })} placeholder="29ABCDE1234F2Z5" maxLength={15} />
                    <button type="button" onClick={fetchFromGstin} disabled={gstinBusy || customer.gstin.trim().length !== 15} title="Fetch from GST network" className="shrink-0 grid w-10 place-items-center rounded-[10px] border border-border text-brand transition hover:bg-brand-50/60 disabled:opacity-40">
                      {gstinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">State</label>
                  <input className="vf-in" value={customer.state} onChange={(e) => { setCustomer({ ...customer, state: e.target.value }); applyInterState(e.target.value); }} placeholder="Telangana" />
                </div>
              </div>
              {gstinNote && (
                <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> {gstinNote}
                </p>
              )}

              {/* Items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-ink">Items</label>
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" checked={interState} onChange={(e) => setInterState(e.target.checked)} /> Inter-state (IGST)
                  </label>
                </div>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2">
                      <input className="vf-in col-span-4" placeholder="Item — type to auto-fill price & HSN" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} onBlur={() => autoFillItem(i)} />
                      <input className="vf-in col-span-2" placeholder="HSN — auto" value={it.hsn ?? ""} onChange={(e) => setItem(i, { hsn: e.target.value })} title="HSN/SAC — auto-detected, editable" />
                      <input className="vf-in col-span-1" type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                      <input className="vf-in col-span-2" type="number" placeholder="Rate" value={it.rate} onChange={(e) => setItem(i, { rate: Number(e.target.value) })} />
                      <input className="vf-in col-span-2" type="number" placeholder="GST%" value={it.taxRate} onChange={(e) => setItem(i, { taxRate: Number(e.target.value) })} />
                      <button className="col-span-1 grid place-items-center text-muted hover:text-danger" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setItems([...items, blankItem()])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand"><Plus className="h-4 w-4" /> Add item</button>
              </div>

              {/* Totals */}
              <div className="rounded-xl border border-borderCard bg-bg2 p-4 text-sm">
                <Row label="Taxable" value={inr(t.taxable)} />
                {interState ? <Row label="IGST" value={inr(t.igst)} /> : <><Row label="CGST" value={inr(t.cgst)} /><Row label="SGST" value={inr(t.sgst)} /></>}
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold text-ink"><span>Total</span><span>{inr(t.total)}</span></div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger">{error.replaceAll("_", " ")}</p>}

          {mode !== "ai" && (
            <Button variant="primary" className="w-full" disabled={busy || !customer.name || t.total <= 0} onClick={create}>
              {busy ? "Creating…" : "Generate Invoice"}
            </Button>
          )}
        </div>

        <style>{`.vf-in{width:100%;border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;font-size:14px;color:#0F172A;outline:none}.vf-in:focus{border-color:#1378F8}`}</style>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted"><span>{label}</span><span className="text-ink">{value}</span></div>;
}
