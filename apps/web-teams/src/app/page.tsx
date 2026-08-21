"use client";
import { useEffect, useState, useCallback } from "react";
import { PanelShell, Card, Empty } from "../components/PanelShell";
import { api, type CompanyAssignment } from "../lib/api";
import { ApiError } from "../lib/api";

function RequestAccessModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [orgId, setOrgId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!orgId.trim()) { setError("Organisation ID is required."); return; }
    setBusy(true); setError(null);
    try {
      await api.requestAccess(orgId.trim(), reason.trim() || undefined);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Request failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Request Access</h3>
        <p className="text-sm text-slate-500 mt-1">Request access to a specific company from the Vertofi admin.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Org ID (UUID)</label>
            <input value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono outline-none focus:border-blue-500 focus:bg-white" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Reason (optional)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you need access?" rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white resize-none" />
          </div>
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy || !orgId.trim()}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? "Submitting…" : "Request Access"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamsDashboard() {
  const [assignments, setAssignments] = useState<CompanyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setAssignments(await api.myAssignments()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = assignments.filter((a) => a.org_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PanelShell title="Assigned Companies" subtitle="Your assigned companies for financial review and oversight." allow={["TEAM_LEAD", "TEAM_MEMBER", "ADMIN"]}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            placeholder="Search assigned companies…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
        <button
          onClick={() => setShowRequest(true)}
          className="shrink-0 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
        >
          <span className="text-lg leading-none">+</span> Request Access
        </button>
      </div>

      <Card>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Company Name</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Access Level</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Assigned</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-400">
                    {q ? "No assigned companies match your search." : "No companies assigned. Request access above."}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">{a.org_name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${a.access_level === "READ_WRITE" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {a.access_level === "READ_WRITE" ? "Read + Write" : "Read only"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(a.assigned_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition">
                        Open Workspace →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showRequest && <RequestAccessModal onClose={() => setShowRequest(false)} onDone={() => { setShowRequest(false); alert("Access request submitted to admin."); }} />}
    </PanelShell>
  );
}
