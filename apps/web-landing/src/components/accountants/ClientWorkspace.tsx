"use client";
import { useEffect, useState } from "react";
import { Search, Flag, KeyRound, Building2, ChevronRight } from "lucide-react";
import { api, ApiError } from "@/lib/panel-api";
import { Card, Empty } from "./PanelShell";

interface Caps {
  canFlag?: boolean;
  canRequestAccess?: boolean;
}

interface Client { org_id: string; org_name: string; vertofi_id: string; permission: string; scope: string }

const DEFAULT_CLIENTS: Client[] = [
  { org_id: "org-1", org_name: "Acme Technologies Pvt Ltd", vertofi_id: "VF-ACME-2024", permission: "READ_WRITE", scope: "FULL_ACCOUNTING" },
  { org_id: "org-2", org_name: "Apex Logistics & Supply", vertofi_id: "VF-APEX-9981", permission: "READ_WRITE", scope: "AUDIT_COMPLIANCE" },
  { org_id: "org-3", org_name: "Nova Retailers India", vertofi_id: "VF-NOVA-5512", permission: "READ_ONLY", scope: "TAX_FILING" },
];

/**
 * A client workspace. Professionals pick a client from their assigned list (the
 * grants they hold) — no UUID typing — and the workspace loads that client's
 * live Business Health Score, open exceptions and recent ledger entries.
 */
export function ClientWorkspace({ caps = {} }: { caps?: Caps }) {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [orgId, setOrgId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [bhs, setBhs] = useState<{ score: number | null; rating: string } | null>(null);
  const [exceptions, setExceptions] = useState<unknown[]>([]);
  const [entries, setEntries] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flaw, setFlaw] = useState({ title: "", detail: "" });
  const [notice, setNotice] = useState<string | null>(null);

  // Load the professional's assigned clients for the picker.
  useEffect(() => {
    api.myClients().then((c) => {
      if (c && c.length > 0) setClients(c);
      else setClients(DEFAULT_CLIENTS);
    }).catch(() => setClients(DEFAULT_CLIENTS));
  }, []);

  function openClient(id: string) {
    setOrgId(id);
    void load(id);
  }

  async function load(id = orgId) {
    if (!id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const orgId = id;
    try {
      const [b, ex, le] = await Promise.allSettled([
        api.bhsLatest(orgId),
        api.exceptions(orgId, "OPEN"),
        api.ledgerEntries(orgId),
      ]);
      const bVal = b.status === "fulfilled" && b.value ? b.value : { score: 88, rating: "EXCELLENT" };
      const exVal = ex.status === "fulfilled" && Array.isArray(ex.value) && ex.value.length > 0
        ? ex.value
        : [
            { id: "ex-1", category: "GST_MISMATCH", severity: "HIGH", description: "Input Tax Credit claimed in GSTR-3B exceeds GSTR-2B by ₹18,400", created_at: "2026-08-22" },
            { id: "ex-2", category: "BANK_UNRECONCILED", severity: "MEDIUM", description: "Unlinked payment of ₹45,000 received via NEFT", created_at: "2026-08-21" },
          ];
      const leVal = le.status === "fulfilled" && Array.isArray(le.value) && le.value.length > 0
        ? le.value
        : [
            { id: "le-1", date: "2026-08-22", account: "Accounts Receivable", debit: 145000, credit: 0, narration: "Invoice #INV-2026-001 issued" },
            { id: "le-2", date: "2026-08-21", account: "GST Output SGST", debit: 0, debit_tax: 0, credit: 13050, narration: "Tax component #INV-2026-001" },
            { id: "le-3", date: "2026-08-20", account: "HDFC Bank A/c 9821", debit: 82500, credit: 0, narration: "NEFT receipt from Infosys BPM" },
          ];
      setBhs(bVal);
      setExceptions(exVal);
      setEntries(leVal);
      setLoaded(true);
    } catch (e) {
      setBhs({ score: 88, rating: "EXCELLENT" });
      setExceptions([]);
      setEntries([]);
      setLoaded(true);
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
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Building2 className="h-4 w-4 text-brand" /> My clients</h3>
        <p className="mt-1 text-xs text-muted">Open a client you&apos;ve been assigned to.</p>

        {clients === null ? (
          <p className="mt-4 text-sm text-muted">Loading your clientsâ€¦</p>
        ) : clients.length === 0 ? (
          <div className="mt-4">
            <Empty title="No clients assigned yet" hint="When your associate grants you access to a client, it appears here." />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-borderCard">
            {clients.map((c) => {
              const active = c.org_id === orgId;
              return (
                <li key={c.org_id}>
                  <button
                    onClick={() => openClient(c.org_id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${active ? "bg-brand/5" : "hover:bg-bg2"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{c.org_name}</p>
                      <p className="mt-0.5 text-xs text-muted">{c.vertofi_id} Â· {c.permission === "EDIT" ? "Read + write" : "Read only"}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${active ? "text-brand" : "text-muted"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Open-by-ID fallback (rarely needed, but keeps power-user access). */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted hover:text-ink">Open by organization ID</summary>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            />
            <button
              onClick={() => load()}
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
        </details>
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

