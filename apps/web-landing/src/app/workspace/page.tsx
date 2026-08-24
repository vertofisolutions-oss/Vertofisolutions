"use client";
import { Suspense, useCallback, useEffect, useRef, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutGrid, Receipt, ShoppingCart, Users, Package, Boxes, Plus, Sparkles, ArrowRight,
  FileText, FileStack, Truck, Loader2, Download, PieChart, BookOpen, Wallet, Landmark,
} from "lucide-react";
import { InventoryView } from "../../components/InventoryView";
import { SalesView } from "../../components/SalesView";
import { CustomersView } from "../../components/CustomersView";
import { DocumentCenter } from "../../components/DocumentCenter";
import { ReportsCenter } from "../../components/ReportsCenter";
import { IntelligenceHub } from "../../components/IntelligenceHub";
import { Badge, Button, Card, EmptyState } from "@/ui";
import { SidebarShell } from "../../components/SidebarShell";
import { CreateInvoice } from "../../components/CreateInvoice";
import { CreateDocument } from "../../components/CreateDocument";
import { DocumentUpload } from "../../components/DocumentUpload";
import { api, getAccess, getOrgId, ApiError } from "@/lib/api";
import { MODULES } from "../../components/module/registry";

const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "bookkeeping", label: "Bookkeeping", icon: BookOpen },
  { key: "sales", label: "Sales", icon: Receipt },
  
  { key: "purchases", label: "Purchases", icon: ShoppingCart },
  { key: "customers", label: "Customers", icon: Users },
  { key: "products", label: "Products", icon: Package },
  { key: "inventory", label: "Inventory", icon: Boxes },
  { key: "expenses", label: "Expenses", icon: Wallet },
  { key: "reconciliation", label: "Bank Reconciliation", icon: Landmark },
  { key: "reports", label: "Reports", icon: PieChart },
  { key: "intelligence", label: "AI Intelligence", icon: Sparkles },
] as const;

export default function Workspace() {
  return (
    <Suspense fallback={null}>
      <WorkspaceInner />
    </Suspense>
  );
}

function WorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [section, setSection] = useState<string>("overview");
  const [command, setCommand] = useState("");
  const [creating, setCreating] = useState<{ initial?: string } | null>(null);
  const [docModal, setDocModal] = useState<{ type?: string } | null>(null);
  const [rowsCache, setRowsCache] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState(false);
  const rows = rowsCache[section] || [];

  useEffect(() => {
    const oid = getOrgId() || "demo-business-org";
    setOrgId(oid);
    setReady(true);
  }, [router]);

  useEffect(() => {
    const s = searchParams.get("section");
    if (s && SECTIONS.some((x) => x.key === s)) {
      setSection(s);
    } else if (!s) {
      setSection("overview");
    }
  }, [searchParams]);

  const handleTabClick = (key: string) => {
    startTransition(() => {
      setSection(key);
      const url = key === "overview" || key === "bookkeeping" ? "/workspace" : `/workspace?section=${key}`;
      router.replace(url, { scroll: false });
    });
  };

  const load = useCallback(async (sec: string, oid: string) => {
    setLoading(true);
    try {
      const map: Record<string, () => Promise<Record<string, unknown>[]>> = {
        sales: () => api.acc.sales(oid),
        overview: () => api.acc.documents(oid), bookkeeping: () => api.acc.documents(oid),
        purchases: () => api.acc.purchases(oid),
        customers: () => api.acc.customers(oid),
        products: () => api.acc.products(oid),
        inventory: () => api.acc.inventory(oid),
      };
      const data = map[sec] ? await map[sec]!() : [];
      setRowsCache((prev) => ({ ...prev, [sec]: Array.isArray(data) ? data : [] }));
    } catch {
      setRowsCache((prev) => ({ ...prev, [sec]: [] }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orgId && section !== "overview") void load(section, orgId);
  }, [orgId, section, load]);

  if (!ready || !orgId) return null;

  return (
    <SidebarShell>
      <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-8">

        {/* Content (full width) */}
        <div className="space-y-6">
          {/* Command Center bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (command.trim()) setCreating({ initial: command.trim() }); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 shadow-card focus-within:border-brand"
          >
            <Sparkles className="h-4 w-4 text-brand" />
            <input className="flex-1 bg-transparent text-sm outline-none" placeholder="Command Center —  Create Tax Invoice · New Quotation · Show overdue customers · Generate P&L" value={command} onChange={(e) => setCommand(e.target.value)} />
            <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">Run</button>
          </form>

          {(section === "overview" || section === "bookkeeping") && orgId && (
            <DocumentCenter orgId={orgId} rows={rows} loading={loading} onPick={(type) => setDocModal({ type })} reload={() => load(section, orgId)} />
          )}

          {section === "expenses" && (() => {
            const ExpComp = MODULES["expenses"]?.component;
            return ExpComp ? <ExpComp /> : null;
          })()}

          {section === "reconciliation" && (() => {
            const ReconComp = MODULES["bank-reconciliation"]?.component;
            return ReconComp ? <ReconComp /> : null;
          })()}

          {section === "sales" && orgId && (
            <SalesView
              orgId={orgId}
              rows={rows}
              loading={loading}
              onNewInvoice={() => setCreating({})}
              onNewDoc={(type) => setDocModal({ type })}
            />
          )}
          {section === "purchases" && (
            <div className="space-y-4">
              <Card>
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand"><FileText className="h-4 w-4" /></span>
                  <div>
                    <h2 className="text-[14px] font-semibold text-ink">Upload a purchase bill</h2>
                    <p className="text-[12px] text-muted">Drop a vendor bill (PDF/JPG/PNG). Vertofi extracts the line items, GST &amp; totals into a reviewable draft — no typing.</p>
                  </div>
                </div>
                <DocumentUpload orgId={orgId} type="PURCHASE_BILL" label="Vendor purchase bill" />
              </Card>
              <ListView title="Purchase Bills" loading={loading} rows={rows} cols={[["bill_no", "Bill"], ["vendor_name", "Vendor"], ["total", "Total"], ["status", "Status"], ["source", "Via"]]} empty="No purchase bills yet" />
            </div>
          )}
          {section === "customers" && orgId && (
            <CustomersView orgId={orgId} rows={rows} loading={loading} reload={() => load("customers", orgId)} onNewInvoice={(name) => setCreating({ initial: name ? `Invoice for ${name} ` : undefined })} />
          )}
          {section === "products" && (
            <ProductsView orgId={orgId} rows={rows} loading={loading} reload={() => load("products", orgId)} />
          )}
          {section === "inventory" && orgId && (
            <InventoryView orgId={orgId} />
          )}
          {section === "reports" && orgId && (
            <ReportsCenter orgId={orgId} />
          )}
          {section === "intelligence" && orgId && (
            <IntelligenceHub orgId={orgId} />
          )}
        </div>
      </main>

      {creating !== null && orgId && (
        <CreateInvoice
          orgId={orgId}
          initialCommand={creating.initial}
          onClose={() => setCreating(null)}
          onCreated={() => { setCreating(null); setCommand(""); handleTabClick("sales"); void load("sales", orgId); }}
        />
      )}

      {docModal !== null && orgId && (
        <CreateDocument
          orgId={orgId}
          presetType={docModal.type}
          onClose={() => setDocModal(null)}
          onCreated={() => { if (section === "overview" || section === "bookkeeping") void load(section, orgId); }}
        />
      )}
    </SidebarShell>
  );
}

function QuickAction({ label, icon: Icon, onClick }: { label: string; icon: typeof Receipt; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-3 rounded-2xl border border-borderCard bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand"><Icon className="h-4 w-4" /></span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </button>
  );
}

function ListView({ title, rows, cols, loading, action, rowAction, empty }: { title: string; rows: Record<string, unknown>[]; cols: [string, string][]; loading: boolean; action?: React.ReactNode; rowAction?: (row: Record<string, unknown>) => React.ReactNode; empty: string }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {loading ? <p className="py-8 text-center text-sm text-muted">Loading…</p> : rows.length === 0 ? <EmptyState title={empty} description="Create your first record or use the command bar above." /> : (
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg2 text-xs uppercase tracking-wide text-muted"><tr>{cols.map(([, l]) => <th key={l} className="px-3 py-2 font-semibold">{l}</th>)}{rowAction && <th className="px-3 py-2 font-semibold text-right">GST</th>}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-borderCard">
                  {cols.map(([k]) => <td key={k} className="px-3 py-2 text-ink">{k === "total" || k === "rate" ? `₹${String(r[k] ?? 0)}` : String(r[k] ?? "—")}</td>)}
                  {rowAction && <td className="px-3 py-2 text-right">{rowAction(r)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/**
 * e-Invoice (IRN) / e-Way bill actions on a sales invoice. Calls the GSP
 * connector via the gateway. The connector returns an honest status —
 * NEEDS_CREDENTIALS until the GSP credentials are configured — and we surface
 * that plainly rather than faking an IRN.
 */
function GstActions({ invoice }: { invoice: Record<string, unknown> }) {
  const [busy, setBusy] = useState<"pdf" | "einvoice" | "ewaybill" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function downloadPdf() {
    setBusy("pdf");
    setResult(null);
    try {
      const no = String(invoice.invoice_no ?? "invoice");
      await api.mod.downloadSalesPdf(getOrgId()!, String(invoice.id), `${no.replace(/[^\w.-]/g, "_")}.pdf`);
      setResult({ ok: true, text: "PDF downloaded" });
    } catch (err) {
      setResult({ ok: false, text: err instanceof ApiError ? err.code.replaceAll("_", " ") : "download failed" });
    } finally {
      setBusy(null);
    }
  }

  async function run(kind: "einvoice" | "ewaybill") {
    setBusy(kind);
    setResult(null);
    try {
      if (kind === "einvoice") {
        const r = await api.gst.einvoice(invoice);
        setResult(
          r.connector === "ACTIVE" && r.irn
            ? { ok: true, text: `IRN ${String(r.irn).slice(0, 12)}…` }
            : { ok: false, text: "Connect GST credentials to generate IRN" },
        );
      } else {
        const r = await api.gst.ewaybill(invoice);
        setResult(
          r.connector === "ACTIVE" && r.ewbNo
            ? { ok: true, text: `EWB ${r.ewbNo}` }
            : { ok: false, text: "Connect GST credentials to generate e-Way bill" },
        );
      }
    } catch (err) {
      setResult({ ok: false, text: err instanceof ApiError ? err.code.replaceAll("_", " ") : "request failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {result && (
        <span className={`mr-1 text-xs ${result.ok ? "text-emerald-600" : "text-muted"}`}>{result.text}</span>
      )}
      <button type="button" disabled={busy !== null} onClick={downloadPdf} className="inline-flex items-center gap-1 rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50" title="Download invoice PDF">
        {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF
      </button>
      <button type="button" disabled={busy !== null} onClick={() => run("einvoice")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-ink transition hover:bg-bg2 disabled:opacity-50" title="Generate e-Invoice (IRN)">
        {busy === "einvoice" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} e-Invoice
      </button>
      <button type="button" disabled={busy !== null} onClick={() => run("ewaybill")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-ink transition hover:bg-bg2 disabled:opacity-50" title="Generate e-Way bill">
        {busy === "ewaybill" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />} e-Way
      </button>
    </div>
  );
}

/** Downscale an image to <=maxPx and return base64 (no prefix) + mime — keeps
 *  the vision call cheap and the upload small. */
/**
 * Resize + compress any uploaded image entirely in the browser before it's sent.
 * Caps the longest edge at `maxPx` and steps JPEG quality down until the encoded
 * image is under `targetBytes` (~1.4 MB) — so a 10 MB phone photo becomes a small
 * payload that never trips the API body limit, and the AI reads it faster.
 */
function downscaleImage(file: File, maxPx = 1280, targetBytes = 1_400_000): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no_canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      // Approx encoded byte size from a base64 string length.
      const bytesOf = (b64: string) => Math.floor((b64.length * 3) / 4);
      let quality = 0.82;
      let b64 = (canvas.toDataURL("image/jpeg", quality).split(",")[1]) ?? "";
      while (bytesOf(b64) > targetBytes && quality > 0.4) {
        quality -= 0.12;
        b64 = (canvas.toDataURL("image/jpeg", quality).split(",")[1]) ?? "";
      }
      resolve({ b64, mime: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad_image")); };
    img.src = url;
  });
}

function ProductsView({ orgId, rows, loading, reload }: { orgId: string; rows: Record<string, unknown>[]; loading: boolean; reload: () => void }) {
  const [f, setF] = useState({ name: "", hsn: "", rate: "", taxRate: "18" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [scanned, setScanned] = useState<{ name: string; rate: number; hsn?: string; unit?: string; taxRate?: number }[] | null>(null);
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!f.name) return;
    try { await api.acc.addProduct(orgId, { name: f.name, hsn: f.hsn, rate: Number(f.rate) || 0, taxRate: Number(f.taxRate) || 18 }); setF({ name: "", hsn: "", rate: "", taxRate: "18" }); reload(); } catch { /* */ }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true); setScanErr(null); setScanned(null);
    try {
      const { b64, mime } = await downscaleImage(file);
      const r = await api.acc.scanProducts(orgId, b64, mime);
      if (r.degraded || r.products.length === 0) setScanErr(r.reason === "ai_unavailable" ? "AI is busy — try again, or add manually." : "Couldn't read the list — try a clearer photo or add manually.");
      else setScanned(r.products);
    } catch { setScanErr("Couldn't process that image."); } finally { setScanning(false); }
  }

  async function addAll() {
    if (!scanned?.length) return;
    setAdding(true);
    try { const r = await api.acc.bulkProducts(orgId, scanned as unknown as Record<string, unknown>[]); setScanned(null); reload(); setScanErr(`Added ${r.added} products${r.skipped ? `, skipped ${r.skipped} already in your list` : ""}.`); }
    catch { setScanErr("Couldn't save — try again."); } finally { setAdding(false); }
  }

  return (
    <div className="space-y-4">
      {/* Scan a product / price list */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">📷 Scan a product list</h2>
            <p className="text-[12px] text-muted">Snap a photo of your price list — Vertofi reads the items &amp; prices and adds them. No typing.</p>
          </div>
          <Button variant="primary" disabled={scanning} onClick={() => fileRef.current?.click()}>
            {scanning ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Reading…</> : "Upload photo"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
        </div>
        {scanErr && <p className="mt-2 text-[12px] text-muted">{scanErr}</p>}
        {scanned && (
          <div className="mt-3 space-y-2">
            <p className="text-[12px] font-medium text-ink">Found {scanned.length} products — nothing is saved yet. Review &amp; edit every field below, then confirm:</p>
            <div className="max-h-72 overflow-auto rounded-lg border border-borderCard">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-bg2 text-[11px] uppercase text-muted"><tr><th className="px-2 py-1.5">Name</th><th className="px-2 py-1.5">HSN</th><th className="px-2 py-1.5">Unit</th><th className="px-2 py-1.5">Rate</th><th className="px-2 py-1.5">GST%</th><th className="px-2 py-1.5"></th></tr></thead>
                <tbody>
                  {scanned.map((p, i) => (
                    <tr key={i} className="border-t border-borderCard">
                      <td className="px-2 py-1"><input className="vf-win w-full" value={p.name} onChange={(e) => setScanned(scanned.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></td>
                      <td className="px-2 py-1"><input className="vf-win w-20" value={p.hsn ?? ""} onChange={(e) => setScanned(scanned.map((x, j) => j === i ? { ...x, hsn: e.target.value } : x))} /></td>
                      <td className="px-2 py-1"><input className="vf-win w-16" value={p.unit ?? "NOS"} onChange={(e) => setScanned(scanned.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} /></td>
                      <td className="px-2 py-1"><input className="vf-win w-24" type="number" value={p.rate} onChange={(e) => setScanned(scanned.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))} /></td>
                      <td className="px-2 py-1"><input className="vf-win w-16" type="number" value={p.taxRate ?? 18} onChange={(e) => setScanned(scanned.map((x, j) => j === i ? { ...x, taxRate: Number(e.target.value) } : x))} /></td>
                      <td className="px-2 py-1 text-right"><button title="Remove this row" className="text-muted hover:text-danger" onClick={() => setScanned(scanned.filter((_, j) => j !== i))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" disabled={adding || scanned.length === 0} onClick={addAll}>{adding ? "Adding…" : `Confirm & add ${scanned.length} product${scanned.length === 1 ? "" : "s"}`}</Button>
              <button className="px-3 py-2 text-[12px] font-medium text-muted hover:text-ink" onClick={() => setScanned(null)}>Discard</button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-[14px] font-semibold text-ink">Add product</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <input className="vf-win" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="vf-win" placeholder="HSN" value={f.hsn} onChange={(e) => setF({ ...f, hsn: e.target.value })} />
          <input className="vf-win" placeholder="Rate" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
          <input className="vf-win" placeholder="GST%" value={f.taxRate} onChange={(e) => setF({ ...f, taxRate: e.target.value })} />
          <Button variant="primary" onClick={add}>Add</Button>
        </div>
      </Card>
      <ListView title="Products" loading={loading} rows={rows} cols={[["name", "Name"], ["hsn", "HSN"], ["rate", "Rate"], ["stock", "Stock"]]} empty="No products yet" />
      <style>{`.vf-win{border:1px solid #E5E7EB;border-radius:10px;padding:8px 12px;font-size:14px;outline:none}.vf-win:focus{border-color:#1378F8}`}</style>
    </div>
  );
}

function getSampleWorkspaceRows(sec: string): Record<string, unknown>[] {
  if (sec === "sales") {
    return [
      { id: "inv-1", invoice_no: "INV-2026-001", customer_name: "Reliance Digital Ltd", total: 145000, status: "PAID", issue_date: "2026-08-20" },
      { id: "inv-2", invoice_no: "INV-2026-002", customer_name: "Infosys BPM", total: 82500, status: "ISSUED", issue_date: "2026-08-21" },
      { id: "inv-3", invoice_no: "INV-2026-003", customer_name: "Tata Consultancy Services", total: 230000, status: "PENDING", issue_date: "2026-08-22" },
    ];
  }
  if (sec === "purchases") {
    return [
      { id: "bill-1", bill_no: "BILL-8891", vendor_name: "Dell India Tech", total: 112000, status: "VERIFIED", source: "OCR_SCAN" },
      { id: "bill-2", bill_no: "BILL-8892", vendor_name: "Amazon Cloud Services", total: 45600, status: "PROCESSED", source: "EMAIL_IMPORT" },
      { id: "bill-3", bill_no: "BILL-8893", vendor_name: "Airtel Business Enterprise", total: 18400, status: "VERIFIED", source: "GST_AUTO" },
    ];
  }
  if (sec === "customers") {
    return [
      { id: "cust-1", name: "Reliance Digital Ltd", gstin: "27AAACR5055K1Z8", email: "billing@reliancedigital.com", total: "145000" },
      { id: "cust-2", name: "Infosys BPM", gstin: "29AABCI1234F1Z5", email: "finance@infosys.com", total: "82500" },
      { id: "cust-3", name: "Tata Consultancy Services", gstin: "27AAACT2727Q1ZW", email: "accounts@tcs.com", total: "230000" },
    ];
  }
  if (sec === "products") {
    return [
      { id: "prod-1", name: "Cloud Accounting Subscription", hsn: "998313", rate: 4999, stock: 100 },
      { id: "prod-2", name: "GST Compliance & Filing Package", hsn: "998222", rate: 2999, stock: 250 },
      { id: "prod-3", name: "Financial Audit Support", hsn: "998231", rate: 12000, stock: 50 },
    ];
  }
  if (sec === "overview" || sec === "bookkeeping") {
    return [
      { id: "doc-1", invoice_no: "INV-2026-001", customer_name: "Reliance Digital Ltd", total: 145000, status: "PAID" },
      { id: "doc-2", invoice_no: "INV-2026-002", customer_name: "Infosys BPM", total: 82500, status: "ISSUED" },
    ];
  }
  return [];
}
