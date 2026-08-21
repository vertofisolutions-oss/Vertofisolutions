"use client";
import { useCallback, useEffect, useState } from "react";
import { PanelShell, Card } from "../../components/PanelShell";
import { api, ApiError, type ProfessionalProfile } from "../../lib/api";

function ReviewDrawer({ prof, onClose, onDone }: { prof: ProfessionalProfile; onClose: () => void; onDone: () => void }) {
  const [docs, setDocs] = useState<{ id: string; type: string; filename: string; status: string }[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.professionalKyc(prof.user_id).then(setDocs).catch(() => setDocs([])); }, [prof.user_id]);

  async function openDoc(id: string) {
    try { const { url } = await api.kycDownload(id); window.open(url, "_blank", "noopener"); }
    catch { setError("Could not open document."); }
  }

  async function decide(approve: boolean) {
    setBusy(true); setError(null);
    try { await api.verifyProfessional(prof.user_id, approve, note || undefined); onDone(); }
    catch (e) { setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed"); }
    finally { setBusy(false); }
  }

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-400">{k}</span><span className="font-medium text-slate-800 text-right">{v || "—"}</span></div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{prof.full_name}</h3>
            <p className="text-xs font-mono text-slate-400">{prof.public_id} · {prof.professional_type}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-5">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Credentials</h4>
          <Row k="Membership no." v={prof.membership_no} />
          <Row k="Certificate of Practice" v={prof.cop_no} />
          <Row k="Firm" v={prof.firm_name} />
          <Row k="Firm registration" v={prof.firm_registration_no} />
          <Row k="Experience" v={prof.years_experience ? `${prof.years_experience} yrs` : null} />
          <Row k="Specializations" v={prof.specializations?.join(", ")} />
          <Row k="Email" v={prof.email} />
          <Row k="Mobile" v={prof.mobile ? `+91 ${prof.mobile}` : null} />
          <Row k="Location" v={[prof.city, prof.state, prof.pincode].filter(Boolean).join(", ")} />

          <h4 className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-slate-400">Documents</h4>
          {docs.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No documents uploaded. Request them before approving, or approve if verified out-of-band.</p>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <button key={d.id} onClick={() => openDoc(d.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm hover:border-blue-400">
                  <span><span className="font-semibold text-slate-700">{d.type.replaceAll("_", " ")}</span> <span className="text-slate-400">— {d.filename}</span></span>
                  <span className="text-xs font-semibold text-blue-600">View →</span>
                </button>
              ))}
            </div>
          )}

          <h4 className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-slate-400">Decision note (optional)</h4>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Reason for approval/rejection"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />

          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

          <div className="mt-5 flex gap-3">
            <button onClick={() => decide(false)} disabled={busy} className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Reject</button>
            <button onClick={() => decide(true)} disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "…" : "Approve & activate ✓"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfessionalsPage() {
  const [rows, setRows] = useState<ProfessionalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<ProfessionalProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api.pendingProfessionals()); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <PanelShell title="Professional Verification" subtitle="Approve CA/CMA/CS/CPA/ACCA/CFA registrations. Approval activates the account so clients can assign them." allow={["ADMIN"]}>
      <div className="mb-4 text-xs text-slate-500"><span className="font-semibold text-slate-700">{rows.length}</span> awaiting verification</div>
      <Card>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {["Name", "Type", "Membership", "Firm", "Vertofi ID", "Registered", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No professionals awaiting verification.</td></tr>
              ) : rows.map((p) => (
                <tr key={p.user_id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3"><div className="font-semibold text-slate-900">{p.full_name}</div><div className="text-xs text-slate-400">{p.email}</div></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{p.professional_type}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.membership_no ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.firm_name ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.public_id ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setReview(p)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {review && <ReviewDrawer prof={review} onClose={() => setReview(null)} onDone={() => { setReview(null); void load(); }} />}
    </PanelShell>
  );
}
