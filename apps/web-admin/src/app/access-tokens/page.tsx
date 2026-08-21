"use client";
import { useCallback, useEffect, useState } from "react";
import { PanelShell, Card } from "../../components/PanelShell";
import { api, type PanelToken } from "../../lib/api";
import { ApiError } from "../../lib/api";

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function GenerateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [panel, setPanel] = useState<"ADMIN" | "TEAMS">("TEAMS");
  const [label, setLabel] = useState("");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ activationUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!label.trim()) { setError("Label is required."); return; }
    setBusy(true); setError(null);
    try {
      const res = await api.generateToken({
        panel,
        label,
        teamMemberId: teamMemberId.trim() || undefined,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Generation failed");
    } finally { setBusy(false); }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.activationUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-900">Generate Panel Access Link</h3>
        <p className="text-sm text-slate-500 mt-1">Creates a permanent, individually revocable activation link. Share it privately with the intended user.</p>

        {!result ? (
          <>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Panel *</label>
                <div className="flex gap-3">
                  {(["ADMIN", "TEAMS"] as const).map((p) => (
                    <button key={p} onClick={() => setPanel(p)}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${panel === p ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {p === "ADMIN" ? "🛡️ Admin Panel" : "👥 Teams Panel"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Label * (who/device is this for?)</label>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Ravi Kumar — office laptop"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white" autoFocus />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Team Member ID (optional — for Teams panel)</label>
                <input value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)} placeholder="UUID of team member (leave blank for Admin tokens)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono outline-none focus:border-blue-500 focus:bg-white" />
              </div>
            </div>

            {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={generate} disabled={busy || !label.trim()}
                className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {busy ? "Generating…" : "Generate Link →"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-bold text-emerald-800">Activation link generated!</span>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Activation URL</p>
                <p className="break-all font-mono text-xs text-slate-700 leading-relaxed">{result.activationUrl}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700">⚠️ Share this link securely (WhatsApp/encrypted email). Anyone with this link can access the {panel === "ADMIN" ? "Admin" : "Teams"} panel from any allowed IP.</p>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => { onDone(); onClose(); }} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm text-slate-600">Done</button>
              <button onClick={copy} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800">
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AccessTokensPage() {
  const [tokens, setTokens] = useState<PanelToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelFilter, setPanelFilter] = useState<"" | "ADMIN" | "TEAMS">("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTokens(await api.listPanelTokens(panelFilter || undefined)); }
    finally { setLoading(false); }
  }, [panelFilter]);

  useEffect(() => { void load(); }, [load]);

  async function revoke(id: string) {
    setRevokingId(id);
    try { await api.revokeToken(id); await load(); }
    finally { setRevokingId(null); setRevokeConfirm(null); }
  }

  const adminCount = tokens.filter((t) => t.panel === "ADMIN").length;
  const teamsCount = tokens.filter((t) => t.panel === "TEAMS").length;

  return (
    <PanelShell title="Access Tokens" subtitle="Manage permanent panel activation links. Each token is set as a 10-year browser cookie and can be revoked individually." allow={["ADMIN"]}>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Active", value: tokens.length, color: "bg-slate-900 text-white" },
          { label: "Admin Tokens", value: adminCount, color: "bg-red-50 text-red-700 border border-red-200" },
          { label: "Teams Tokens", value: teamsCount, color: "bg-blue-50 text-blue-700 border border-blue-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl px-5 py-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold opacity-70 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Header actions */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["", "ADMIN", "TEAMS"] as const).map((f) => (
            <button key={f} onClick={() => setPanelFilter(f)}
              className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${panelFilter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {f === "" ? "All" : f === "ADMIN" ? "🛡️ Admin" : "👥 Teams"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowGenerate(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition">
          <span className="text-lg leading-none">+</span> Generate Link
        </button>
      </div>

      <Card>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Panel</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Label</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Assigned To</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Last Used</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Generated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    No active tokens. Generate the first activation link above.
                  </td>
                </tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.panel === "ADMIN" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {t.panel === "ADMIN" ? "🛡️ Admin" : "👥 Teams"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.label}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.team_member_name ? (
                        <span>
                          {t.team_member_name}
                          <span className="ml-1.5 font-mono text-xs text-slate-400">{t.employee_id}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {t.last_used_at ? ago(t.last_used_at) : <span className="text-slate-300">Never</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{ago(t.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {revokeConfirm === t.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-slate-500">Confirm?</span>
                          <button onClick={() => revoke(t.id)} disabled={revokingId === t.id}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                            {revokingId === t.id ? "…" : "Yes, revoke"}
                          </button>
                          <button onClick={() => setRevokeConfirm(null)} className="rounded-lg border px-3 py-1 text-xs text-slate-600">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setRevokeConfirm(t.id)}
                          className="rounded-lg px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">How panel tokens work</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Each token is a UUID stored in our database and set as a 10-year httpOnly browser cookie.</li>
          <li>Revoking a token blocks access within 60 seconds (middleware cache TTL).</li>
          <li>Rotating any secret does NOT affect existing tokens — revocation must be done individually.</li>
          <li>A user can have multiple tokens (e.g., office laptop + home laptop).</li>
        </ul>
      </div>

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onDone={() => void load()} />}
    </PanelShell>
  );
}
