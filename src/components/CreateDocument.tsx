"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, X, Download, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/ui";
import { api, ApiError } from "@/lib/api";

interface Item { name: string; hsn?: string; unit?: string; qty: number; rate: number; taxRate: number; auto?: boolean }
type DocTypeInfo = { type: string; title: string; category: string; description: string; taxTable: boolean; postsToLedger: boolean; needsReference: boolean };

const CATEGORY_LABEL: Record<string, string> = {
  SALES: "Sales", ADJUSTMENT: "Credit / Debit Notes", PRE_SALE: "Quotes & Estimates",
  VOUCHER: "Vouchers", PURCHASE: "Purchase", LOGISTICS: "Logistics",
};
const CATEGORY_ORDER = ["SALES", "ADJUSTMENT", "PRE_SALE", "VOUCHER", "PURCHASE", "LOGISTICS"];

const blankItem = (): Item => ({ name: "", hsn: "", unit: "NOS", qty: 1, rate: 0, taxRate: 18 });

function totals(items: Item[], interState: boolean, taxed: boolean) {
  let taxable = 0, tax = 0;
  for (const i of items) {
    const t = (i.qty || 0) * (i.rate || 0);
    taxable += t;
    if (taxed) tax += (t * (i.taxRate ?? 18)) / 100;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  const cgst = interState ? 0 : r(tax / 2);
  return { taxable: r(taxable), cgst, sgst: interState ? 0 : r(tax - cgst), igst: interState ? r(tax) : 0, total: r(taxable + tax) };
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function CreateDocument({ orgId, presetType, onClose, onCreated }: { orgId: string; presetType?: string; onClose: () => void; onCreated?: () => void }) {
  const [catalog, setCatalog] = useState<DocTypeInfo[]>([]);
  const [docType, setDocType] = useState(presetType ?? "TAX_INVOICE");
  const [party, setParty] = useState({ name: "", gstin: "", state: "", address: "", phone: "", email: "" });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [partyAuto, setPartyAuto] = useState(false);
  const [interState, setInterState] = useState(false);
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; download: () => Promise<void> } | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { void api.acc.docTypes().then(setCatalog).catch(() => setCatalog([])); }, []);

  const info = useMemo(() => catalog.find((c) => c.type === docType), [catalog, docType]);
  const taxed = info?.taxTable ?? true;
  const t = totals(items, interState, taxed);

  function setItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function smartFillCustomer() {
    if (!party.name) return;
    try {
      const c = await api.acc.lookupCustomer(orgId, party.name);
      if (c) {
        setCustomerId(String(c.id ?? "") || null);
        setPartyAuto(true);
        setParty((p) => ({
          ...p,
          name: String(c.name ?? p.name),
          gstin: String(c.gstin ?? p.gstin ?? ""),
          state: String(c.state ?? p.state ?? ""),
          address: String(c.address ?? p.address ?? ""),
          phone: String(c.phone ?? p.phone ?? ""),
          email: String(c.email ?? p.email ?? ""),
        }));
      }
    } catch { /* ignore */ }
  }

  /** Auto-fill an item's price/HSN/tax/unit from the product master (zero AI). */
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
          unit: String(prod.unit ?? it.unit ?? "NOS"),
          taxRate: Number(prod.tax_rate ?? it.taxRate ?? 18),
          auto: true,
        });
      }
    } catch { /* ignore */ }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      if (docType === "TAX_INVOICE" || docType === "B2C_INVOICE") {
        const r = await api.acc.createSale(orgId, { customerName: party.name, customerId: customerId ?? undefined, items, interState, source: "FORM" });
        const saleId = String(r.id);
        const number = String(r.invoiceNo ?? r.invoice_no ?? "Invoice");
        setDone({ number, download: () => api.acc.downloadSalesPdf(orgId, saleId, `${number.replace(/[^\w.-]/g, "_")}.pdf`, docType) });
      } else {
        const r = await api.acc.createDocument(orgId, {
          type: docType,
          party: { name: party.name, gstin: party.gstin || undefined, state: party.state || undefined, address: party.address || undefined, phone: party.phone || undefined, email: party.email || undefined },
          items, interState, reference: reference || undefined, notes: notes || undefined,
        });
        setDone({ number: r.number, download: () => api.acc.downloadDocPdf(orgId, r.id, `${r.number.replace(/[^\w.-]/g, "_")}.pdf`) });
      }
      onCreated?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "create_failed");
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const by: Record<string, DocTypeInfo[]> = {};
    for (const c of catalog) (by[c.category] ??= []).push(c);
    return by;
  }, [catalog]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-borderCard bg-white shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-ink"><FileText className="h-4 w-4 text-brand" /> Create Document</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="space-y-5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold text-ink">{info?.title ?? "Document"} created</p>
              <p className="mt-1 text-sm text-muted">Number <span className="font-semibold text-ink">{done.number}</span></p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="primary" disabled={downloading} onClick={async () => { setDownloading(true); try { await done.download(); } catch (e) { setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "download failed"); } finally { setDownloading(false); } }}>
                {downloading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Preparing…</> : <><Download className="mr-1 h-4 w-4" /> Download PDF</>}
              </Button>
              <Button variant="ghost" onClick={onClose}>Done</Button>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        ) : (
          <div className="space-y-5 p-6">
            {/* Document type picker */}
            <div>
              <label className="text-xs font-medium text-muted">Document type</label>
              <select className="vf-in mt-1" value={docType} onChange={(e) => { setDocType(e.target.value); setDone(null); }}>
                {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
                  <optgroup key={cat} label={CATEGORY_LABEL[cat] ?? cat}>
                    {grouped[cat]!.map((c) => <option key={c.type} value={c.type}>{c.title}</option>)}
                  </optgroup>
                ))}
              </select>
              {info && <p className="mt-1 text-xs text-muted">{info.description}{!taxed && " · no GST table"}</p>}
            </div>

            {/* Party — type the name, we auto-fill the rest from your records */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted">
                  {info?.category === "PURCHASE" ? "Vendor / Supplier" : "Party"}
                  {partyAuto && <span className="ml-1 text-brand">· auto-filled</span>}
                </label>
                <input className="vf-in" value={party.name} onChange={(e) => { setParty({ ...party, name: e.target.value }); setPartyAuto(false); setCustomerId(null); }} onBlur={smartFillCustomer} placeholder="Start typing a saved customer…" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">GSTIN</label>
                <input className="vf-in" value={party.gstin} onChange={(e) => setParty({ ...party, gstin: e.target.value })} placeholder="29ABCDE1234F2Z5" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">State</label>
                <input className="vf-in" value={party.state} onChange={(e) => setParty({ ...party, state: e.target.value })} placeholder="Telangana" />
              </div>
            </div>
            {(party.address || party.phone || party.email) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input className="vf-in" value={party.address} onChange={(e) => setParty({ ...party, address: e.target.value })} placeholder="Address" />
                <input className="vf-in" value={party.phone} onChange={(e) => setParty({ ...party, phone: e.target.value })} placeholder="Phone" />
                <input className="vf-in" value={party.email} onChange={(e) => setParty({ ...party, email: e.target.value })} placeholder="Email" />
              </div>
            )}

            {info?.needsReference && (
              <div>
                <label className="text-xs font-medium text-muted">Against invoice no. (reference)</label>
                <input className="vf-in" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="INV-2026-0001" />
              </div>
            )}

            {/* Items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-ink">Items</label>
                {taxed && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" checked={interState} onChange={(e) => setInterState(e.target.checked)} /> Inter-state (IGST)
                  </label>
                )}
              </div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i}>
                    <div className="grid grid-cols-12 gap-2">
                      <input className="vf-in col-span-4" placeholder="Item — type to auto-fill price" value={it.name} onChange={(e) => setItem(i, { name: e.target.value, auto: false })} onBlur={() => autoFillItem(i)} />
                      <input className="vf-in col-span-2" placeholder="HSN" value={it.hsn ?? ""} onChange={(e) => setItem(i, { hsn: e.target.value })} />
                      <input className="vf-in col-span-2" type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                      <input className="vf-in col-span-2" type="number" placeholder="Rate" value={it.rate} onChange={(e) => setItem(i, { rate: Number(e.target.value), auto: false })} />
                      {taxed
                        ? <input className="vf-in col-span-1" type="number" placeholder="GST%" value={it.taxRate} onChange={(e) => setItem(i, { taxRate: Number(e.target.value) })} />
                        : <div className="col-span-1 grid place-items-center text-[10px] text-muted">—</div>}
                      <button className="col-span-1 grid place-items-center text-muted hover:text-danger" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {it.auto && <p className="mt-0.5 pl-1 text-[11px] text-brand">✓ price &amp; tax auto-filled from your products</p>}
                  </div>
                ))}
              </div>
              <button onClick={() => setItems([...items, blankItem()])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand"><Plus className="h-4 w-4" /> Add item</button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted">Notes (optional)</label>
              <input className="vf-in" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms, delivery notes, etc." />
            </div>

            {/* Totals */}
            <div className="rounded-xl border border-borderCard bg-bg2 p-4 text-sm">
              <Row label="Taxable" value={inr(t.taxable)} />
              {taxed && (interState ? <Row label="IGST" value={inr(t.igst)} /> : <><Row label="CGST" value={inr(t.cgst)} /><Row label="SGST" value={inr(t.sgst)} /></>)}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold text-ink"><span>Total</span><span>{inr(taxed ? t.total : t.taxable)}</span></div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button variant="primary" className="w-full" disabled={busy || !party.name || t.taxable <= 0} onClick={create}>
              {busy ? "Generating…" : `Generate ${info?.title ?? "Document"}`}
            </Button>
          </div>
        )}

        <style>{`.vf-in{width:100%;border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;font-size:14px;color:#0F172A;outline:none}.vf-in:focus{border-color:#1378F8}`}</style>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-muted"><span>{label}</span><span className="text-ink">{value}</span></div>;
}
