"use client";
import { useState } from "react";
import { Search, Flag, KeyRound } from "lucide-react";
import { api, ApiError } from "@/lib/panel-api";
import { Card, Empty } from "./PanelShell";

interface Caps {
  canFlag?: boolean;
  canRequestAccess?: boolean;
}

/**
 * A client workspace keyed by org id (the client a professional has been
 * granted). Loads the live Business Health Score, open exceptions and recent
 * ledger entries from the real APIs â€” empty states until data exists.
 */
export function ClientWorkspace({ caps = {} }: { caps?: Caps }) {
  const [orgId, setOrgId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [bhs, setBhs] = useState<{ score: number | null; rating: string } | null>(null);
  const [exceptions, setExceptions] = useState<unknown[]>([]);
  const [entries, setEntries] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flaw, setFlaw] = useState({ title: "", detail: "" });
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const [b, ex, le] = await Promise.allSettled([
        api.bhsLatest(orgId),
        api.exceptions(orgId, "OPEN"),
        api.ledgerEntries(orgId),
      ]);
      setBhs(b.status === "fulfilled" ? b.value : null);
      setExceptions(ex.status === "fulfilled" ? ex.value : []);
      setEntries(le.status === "fulfilled" ? le.value : []);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "load_failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitFlaw() {
    if (!flaw.title) return;
    try {
      await api.flagFlaw(orgId, flaw);
      setFlaw({ title: "", detail: "" });
      setNotice("Flaw flagged â€” the responsible associate has been notified.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "flag_failed");
    }
  }

  async function requestAccess() {
    try {
      await api.requestAccess(orgId, "Requesting access from the Teams panel.");
      setNotice("Access request sent to Vertofi admin.");
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "request_failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <label className="block text-sm font-medium text-ink">Client organization ID</label>
        <p className="mt-1 text-xs text-muted">Open a client you've been granted access to.</p>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
            placeholder="00000000-0000-0000-0000-000000000000"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          />
          <button
            onClick={load}
            disabled={busy || !orgId}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            <Search className="h-4 w-4" /> {busy ? "Loadingâ€¦" : "Open"}
          </button>
          {caps.canRequestAccess && (
            <button
              onClick={requestAccess}
              disabled={!orgId}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-bg2 disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> Request access
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error.replaceAll("_", " ")}</p>}
        {notice && <p className="mt-3 text-sm text-emerald-600">{notice}</p>}
      </Card>

      {loaded && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <h3 className="text-sm font-semibold text-ink">Business Health Score</h3>
            {bhs && bhs.score !== null ? (
              <div className="mt-3">
                <span className="text-4xl font-bold tracking-tight text-ink">{bhs.score}</span>
                <span className="ml-2 text-sm text-muted">{bhs.rating}</span>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Not enough data to score yet.</p>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-ink">Open exceptions ({exceptions.length})</h3>
            {exceptions.length === 0 ? (
              <div className="mt-3">
                <Empty title="No open exceptions" hint="Flagged flaws and review items appear here." />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-borderCard text-sm">
                {exceptions.slice(0, 8).map((e, i) => {
                  const ex = e as { type?: string; severity?: string };
                  return (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="text-ink">{ex.type ?? "Exception"}</span>
                      <span className="rounded-full border border-border bg-bg2 px-2 py-0.5 text-xs text-muted">{ex.severity ?? "MEDIUM"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-ink">Recent ledger entries ({entries.length})</h3>
            {entries.length === 0 ? (
              <div className="mt-3">
                <Empty title="No posted entries yet" hint="Entries appear as books are posted." />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-borderCard text-sm">
                {entries.slice(0, 10).map((e, i) => {
                  const en = e as { narration?: string; txn_date?: string; total?: string };
                  return (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="text-ink">{en.narration ?? "Entry"}</span>
                      <span className="text-muted">â‚¹{en.total ?? "0"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {caps.canFlag && (
            <Card className="lg:col-span-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Flag className="h-4 w-4 text-gold" /> Flag an accounting flaw
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <input
                  className="rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
                  placeholder="Title"
                  value={flaw.title}
                  onChange={(e) => setFlaw({ ...flaw, title: e.target.value })}
                />
                <input
                  className="rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
                  placeholder="What looks wrong?"
                  value={flaw.detail}
                  onChange={(e) => setFlaw({ ...flaw, detail: e.target.value })}
                />
                <button
                  onClick={submitFlaw}
                  disabled={!flaw.title}
                  className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Flag & notify
                </button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

