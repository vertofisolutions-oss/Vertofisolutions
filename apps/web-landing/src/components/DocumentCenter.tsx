"use client";
import { useEffect, useState } from "react";
import { Eye, Download, Share2, MessageCircle, Mail, Copy, ArrowRightLeft, Loader2, FileText, Clock, X } from "lucide-react";
import { Card, EmptyState } from "@/ui";
import { api } from "@/lib/api"; import { ReportViewerModal } from "./ReportsCenter";

type DocDetail = NonNullable<Awaited<ReturnType<typeof api.acc.docDetail>>>;

/** Lifecycle timeline drawer for a single document — created → approved → sent → viewed. */
function TimelineDrawer({ orgId, docId, onClose }: { orgId: string; docId: string; onClose: () => void }) {
  const [d, setD] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.acc.docDetail(orgId, docId).then((x) => setD(x)).catch(() => setD(null)).finally(() => setLoading(false)); }, [orgId, docId]);
  const inrL = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-auto bg-white p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">{d?.doc_type?.replaceAll("_", " ") ?? "Document"} {d?.number ?? ""}</h3>
            {d && <p className="text-[12px] text-muted">{d.party_name ?? "—"} · {inrL(Number(d.total ?? 0))}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        {d && (
          <div className="mb-4 flex gap-2">
            <span className="rounded-full bg-bg2 px-2 py-0.5 text-[11px] font-semibold text-ink">{String(d.status ?? "CREATED").toLowerCase()}</span>
            {d.whatsapp_status && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">wa: {d.whatsapp_status.toLowerCase()}</span>}
          </div>
        )}
        <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted"><Clock className="h-3.5 w-3.5" /> Timeline</h4>
        {loading ? <p className="text-[12px] text-muted">Loading…</p> : !d || !d.audit_trail?.length ? (
          <p className="text-[12px] text-muted">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {d.audit_trail.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                <div>
                  <p className="text-[13px] font-medium text-ink">{e.action.replace(/\b\w/g, (m) => m.toUpperCase()).replaceAll("_", " ")}</p>
                  <p className="text-[11px] text-muted">{new Date(e.at).toLocaleString("en-IN")}{e.meta?.toType ? ` → ${String(e.meta.toType).replaceAll("_", " ")}` : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type DocType = { type: string; title: string; category: string; description: string; report?: boolean };
const INVOICE_CATS = ["SALES", "ADJUSTMENT", "PRE_SALE", "VOUCHER", "PURCHASE", "LOGISTICS"];
const REPORT_CATS = ["GST", "FINANCIAL", "VERTOFI"];
const CAT_LABEL: Record<string, string> = {
  SALES: "Sales", ADJUSTMENT: "Credit / Debit Notes", PRE_SALE: "Quotes & Estimates", VOUCHER: "Vouchers",
  PURCHASE: "Purchase", LOGISTICS: "Logistics", GST: "GST", FINANCIAL: "Financial Statements", VERTOFI: "Vertofi Intelligence",
};
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const CONVERTIBLE = new Set(["QUOTATION", "PROFORMA"]); // → Tax Invoice

function IconBtn({ title, onClick, busy, children }: { title: string; onClick: () => void; busy?: boolean; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} disabled={busy} className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-bg2 hover:text-brand disabled:opacity-40">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}

/** Unified Document Center: pick any of the 40 document types to create, and act
 *  on every generated document — preview, PDF, share, WhatsApp, email, duplicate,
 *  convert — with live lifecycle + delivery status. */
let cachedCatalog: DocType[] | null = null;

export function DocumentCenter({ orgId, rows, loading, onPick, reload }: {
  orgId: string; rows: Record<string, unknown>[]; loading: boolean; onPick: (type: string) => void; reload: () => void;
}) {
  const [catalog, setCatalog] = useState<DocType[]>(cachedCatalog ?? []);
  const [busy, setBusy] = useState<string | null>(null); // `${id}:${action}`
  const [msg, setMsg] = useState<string | null>(null);
  const [timelineId, setTimelineId] = useState<string | null>(null); const [modalReportId, setModalReportId] = useState<string | null>(null);
  useEffect(() => {
    if (cachedCatalog) return;
    api.acc.docTypes().then((c) => {
      let types = c as DocType[];
      const proforma = types.find((t) => t.type === "PROFORMA");
      if (proforma) {
        proforma.title = "Proforma Invoice / Quotation";
        proforma.description = "Advance estimate or price quote before the sale is confirmed. You can later convert it to an invoice.";
      }
      types = types.filter((t) => t.type !== "QUOTATION");
      cachedCatalog = types;
      setCatalog(types);
    }).catch(() => setCatalog([]));
  }, []);

  const grouped: Record<string, DocType[]> = {};
  for (const c of catalog) (grouped[c.category] ??= []).push(c);

  const summary = (r: Record<string, unknown>) => `${String(r.doc_type ?? "").replaceAll("_", " ")} ${String(r.number ?? "")} — ${String(r.party_name ?? "")} — ${inr(Number(r.total ?? 0))}`;

  async function act(id: string, action: string, fn: () => Promise<void>) {
    setBusy(`${id}:${action}`); setMsg(null);
    try { await fn(); } catch (e) { setMsg(String((e as Error).message).replaceAll("_", " ")); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      {/* Create picker — every transactional document type */}
      <Card>
        <h2 className="text-[14px] font-semibold text-ink">Create a document</h2>
        <p className="mb-3 text-[12px] text-muted">All 40 GST-ready document types — every figure comes from your books, every PDF from a template.</p>
        <div className="space-y-4">
          {INVOICE_CATS.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{CAT_LABEL[cat] ?? cat}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {grouped[cat]!.map((c) => (
                  <button key={c.type} onClick={() => onPick(c.type)} className="flex flex-col items-start gap-1 rounded-xl border border-borderCard bg-white p-3 text-left transition hover:border-brand hover:shadow-card">
                    <span className="text-[13px] font-semibold text-ink">{c.title}</span>
                    <span className="text-[11px] leading-snug text-muted">{c.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {timelineId && <TimelineDrawer orgId={orgId} docId={timelineId} onClose={() => setTimelineId(null)} />} {modalReportId && <ReportViewerModal orgId={orgId} reportId={modalReportId} onClose={() => setModalReportId(null)} />}
    </div>
  );
}
