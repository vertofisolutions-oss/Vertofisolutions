"use client";
import { useCallback, useEffect, useState } from "react";
import { PanelShell, Card } from "@/components/admin/PanelShell";
import { api, type IpEntry } from "@/lib/admin-api";
import { ApiError } from "@/lib/admin-api";

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function IpAllowlistPage() {
  const [ips, setIps] = useState<IpEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [ipAddress, setIpAddress] = useState("");
  const [label, setLabel] = useState("");
  const [panel, setPanel] = useState<"ADMIN" | "TEAMS" | "BOTH">("BOTH");
  const [expiresAt, setExpiresAt] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setIps(await api.listIpAllowlist()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Detect client IP from a public endpoint (best-effort)
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d: { ip: string }) => setClientIp(d.ip))
      .catch(() => undefined);
  }, []);

  async function addIp() {
    if (!ipAddress.trim() || !label.trim()) { setAddError("IP address and label are required."); return; }
    setAddBusy(true); setAddError(null);
    try {
      await api.addIp({ ipAddress: ipAddress.trim(), label, panel, expiresAt: expiresAt || undefined });
      setIpAddress(""); setLabel(""); setExpiresAt("");
      await load();
    } catch (e) {
      setAddError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to add IP");
    } finally { setAddBusy(false); }
  }

  async function removeIp(id: string) {
    setRemovingId(id);
    try { await api.removeIp(id); await load(); }
    finally { setRemovingId(null); }
  }

  function useMyIp() {
    if (clientIp) setIpAddress(clientIp);
  }

  return (
    <PanelShell title="IP Allowlist" subtitle="Control which IP addresses can reach the Admin and Teams panels. Changes are live within 30 seconds." allow={["ADMIN"]}>
      {/* Warning if no IPs configured */}
      {!loading && ips.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <span className="text-amber-500 text-xl mt-0.5">âš ï¸</span>
          <div>
            <p className="font-bold text-amber-800">No IPs configured â€” panels are accessible from any IP address</p>
            <p className="text-sm text-amber-700 mt-0.5">Add at least one IP address to restrict access to known locations.</p>
          </div>
        </div>
      )}

      {/* Add IP form */}
      <Card>
        <h3 className="text-sm font-bold text-slate-800 mb-4">Add New IP Address</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">IP Address *</label>
            <div className="flex gap-2">
              <input
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="103.x.x.x"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono outline-none focus:border-blue-500 focus:bg-white min-w-0"
              />
              {clientIp && (
                <button
                  onClick={useMyIp}
                  title={`Use my current IP: ${clientIp}`}
                  className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 transition"
                >
                  ðŸ“ Mine
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Label *</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Vertofi HQ, Ravi's VPNâ€¦"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Panel</label>
            <select
              value={panel}
              onChange={(e) => setPanel(e.target.value as "ADMIN" | "TEAMS" | "BOTH")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none"
            >
              <option value="BOTH">Both panels</option>
              <option value="ADMIN">Admin only</option>
              <option value="TEAMS">Teams only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Expires (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none"
            />
          </div>
        </div>
        {addError && <p className="mt-2 text-xs font-semibold text-red-600">{addError}</p>}
        <button
          onClick={addIp}
          disabled={addBusy}
          className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {addBusy ? "Addingâ€¦" : "+ Add IP Address"}
        </button>
      </Card>

      {/* IP Table */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800">Configured IPs ({ips.length})</h3>
          {clientIp && <span className="text-xs text-slate-400">Your current IP: <span className="font-mono font-bold text-slate-600">{clientIp}</span></span>}
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">IP Address</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Label</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Panel</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Added By</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Added</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Expires</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-3 w-20 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : ips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No IPs added yet. Add your first IP address above.
                  </td>
                </tr>
              ) : (
                ips.map((ip) => {
                  const isMyIp = clientIp === ip.ip_address;
                  const isExpired = ip.expires_at && new Date(ip.expires_at) < new Date();
                  return (
                    <tr key={ip.id} className={`border-t border-slate-100 hover:bg-slate-50/50 transition ${isExpired ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-slate-700">{ip.ip_address}</span>
                        {isMyIp && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600">You</span>}
                        {isExpired && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">Expired</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ip.label}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          ip.panel === "BOTH" ? "bg-indigo-100 text-indigo-700"
                          : ip.panel === "ADMIN" ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {ip.panel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{ip.added_by_name ?? "â€”"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{ago(ip.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {ip.expires_at ? new Date(ip.expires_at).toLocaleDateString() : <span className="text-emerald-600 font-semibold">Never</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeIp(ip.id)}
                          disabled={removingId === ip.id}
                          className="rounded-lg px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-40"
                        >
                          {removingId === ip.id ? "â€¦" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info banner */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">How IP allowlist works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Changes take effect within 30 seconds (Next.js edge middleware cache TTL).</li>
          <li>Non-listed IPs receive a 404 â€” the panel's existence is not confirmed.</li>
          <li>If the list is empty, all IPs can reach the panel (not recommended).</li>
          <li>Admin and Teams panels can have separate IP lists using the panel selector.</li>
        </ul>
      </div>
    </PanelShell>
  );
}

