"use client";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, ReceiptText, Cpu, ShieldAlert, GitBranch,
  Cloud, Database, ScrollText, Contact, LineChart as LineChartIcon
} from "lucide-react";
import dynamic from "next/dynamic";
import { PanelShell, Card, Empty } from "@/components/admin/PanelShell";
import { StatTile } from "@/components/admin/StatTile";
import { DataGrid, type GridData } from "@/components/admin/DataGrid";
import { api, ApiError } from "@/lib/admin-api";

// Lazy-load Recharts (large bundle, client-only)
const RechartsPie = dynamic(() => import("@/components/admin/charts/PieChart"), { ssr: false, loading: () => <ChartSkeleton /> });
const RechartsBar = dynamic(() => import("@/components/admin/charts/BarChart"), { ssr: false, loading: () => <ChartSkeleton /> });
const RechartsLine = dynamic(() => import("@/components/admin/charts/LineChart"), { ssr: false, loading: () => <ChartSkeleton /> });

const PAGE_SIZE = 50;

const TABS = [
  { key: "overview",  label: "Overview",    icon: LayoutDashboard },
  { key: "landing",   label: "Leads",       icon: Contact },
  { key: "billing",   label: "Billing",     icon: ReceiptText },
  { key: "ai",        label: "AI & Cloud",  icon: Cpu },
  { key: "risks",     label: "Risks",       icon: ShieldAlert },
  { key: "cicd",      label: "Pipelines",   icon: GitBranch },
  { key: "cloud",     label: "Cloud",       icon: Cloud },
  { key: "db",        label: "DB Browser",  icon: Database },
  { key: "obs",       label: "Charts",      icon: LineChartIcon },
  { key: "audit",     label: "Audit Log",   icon: ScrollText },
] as const;

// â”€â”€ Shared hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ok = true;
    setLoading(true);
    fn()
      .then((d) => ok && setData(d))
      .catch((e) => ok && setError(e instanceof ApiError ? e.code : "load_failed"))
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading };
}

function ChartSkeleton() {
  return <div className="h-48 w-full animate-pulse rounded-xl bg-slate-100" />;
}

// â”€â”€ Overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Overview() {
  const { data, loading } = useAsync(() => api.overview());
  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );

  const d = (data ?? {}) as Record<string, number | Record<string, string>>;
  const conn = (d.connectors ?? {}) as Record<string, string>;

  // REAL plan distribution + BHS distribution from the DB (admin-console overview).
  const planData = (((data as Record<string, unknown>)?.planMix as { name: string; value: number }[]) ?? []).filter((p) => p.value > 0);
  const bhsData = ((data as Record<string, unknown>)?.bhsDistribution as { range: string; count: number }[]) ?? [];

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile label="Organisations"   value={String(d.organizations ?? 0)} />
        <StatTile label="Active subs"     value={String(d.activeSubscriptions ?? 0)} tone="brand" />
        <StatTile label="Trials"          value={String(d.trials ?? 0)} />
        <StatTile label="Open exceptions" value={String(d.openExceptions ?? 0)} tone={Number(d.openExceptions) > 0 ? "danger" : "ink"} />
        <StatTile label="Lifeguard"       value={String(d.openLifeguardCases ?? 0)} tone={Number(d.openLifeguardCases) > 0 ? "gold" : "ink"} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Subscription Mix</h3>
          {planData.length > 0 ? <RechartsPie data={planData} /> : <Empty title="No plan data" />}
        </Card>
        <Card>
          <h3 className="text-sm font-bold text-slate-800 mb-4">BHS Score Distribution</h3>
          {bhsData.length > 0 ? <RechartsBar data={bhsData} xKey="range" yKey="count" color="#3B82F6" label="Organisations" /> : <Empty title="No BHS scores yet" />}
        </Card>
      </div>

      {/* Connector status */}
      <Card>
        <h3 className="text-sm font-bold text-slate-800">Connector status</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(conn).map(([k, v]) => (
            <span key={k} className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              String(v) === "ACTIVE" || String(v) === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}>
              {k}: {String(v)}
            </span>
          ))}
          {Object.keys(conn).length === 0 && <span className="text-xs text-slate-400">No connectors configured</span>}
        </div>
      </Card>
    </div>
  );
}

// â”€â”€ Billing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Billing() {
  const { data, loading } = useAsync(() => api.dues());
  if (loading) return <Card><ChartSkeleton /></Card>;
  const dues = data?.dues ?? [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile label="Total due" value={`â‚¹${(data?.totalDue ?? 0).toLocaleString("en-IN")}`} tone="danger" />
        <StatTile label="Overdue accounts" value={String(dues.length)} />
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Billing dues</h3>
        {dues.length === 0 ? <Empty title="No dues" hint="No past-due or expired-trial accounts." /> : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wide text-slate-400">
                <tr><th className="px-3 py-2">Business</th><th className="px-3 py-2">Plan</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody>
                {dues.map((x, i) => {
                  const r = x as Record<string, unknown>;
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{String(r.legal_name ?? r.org_id)}</td>
                      <td className="px-3 py-2 text-slate-500">{String(r.plan)}</td>
                      <td className="px-3 py-2 text-slate-900">â‚¹{String(r.amount)}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{String(r.status)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// â”€â”€ AI & Cloud â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AiCloud() {
  const ai = useAsync(() => api.aiUsage());
  const cloud = useAsync(() => api.cloudBilling());
  const a = (ai.data ?? {}) as Record<string, unknown>;
  const byOrg = (a.byOrg ?? []) as { orgId: string; tokens: number; estimatedUsd: number }[];
  const c = (cloud.data ?? {}) as Record<string, unknown>;

  const barData = byOrg.slice(0, 10).map((o) => ({
    name: o.orgId.slice(0, 6) + "â€¦",
    tokens: o.tokens,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile label="AI tokens (MTD)"  value={Number(a.totalTokens ?? 0).toLocaleString()} tone="brand" />
        <StatTile label="AI cost (est.)"   value={`$${a.estimatedUsd ?? 0}`} hint={`@ $${a.ratePer1kUsd ?? 0}/1K`} />
        <StatTile label="Cloud cost (MTD)" value={c.amount == null ? "â€”" : `â‚¹${c.amount}`} hint={`GCP Â· ${String(c.connector ?? "")}`} />
      </div>
      {barData.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold text-slate-800 mb-4">AI Usage by Organisation (Top 10)</h3>
          <RechartsBar data={barData} xKey="name" yKey="tokens" color="#8B5CF6" label="Tokens" />
        </Card>
      )}
      <Card>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">AI usage by organisation</h3>
        {byOrg.length === 0 ? <Empty title="No AI usage yet" hint="Usage is metered per org as the AI gateway runs." /> : (
          <ul className="divide-y divide-slate-100 text-xs">
            {byOrg.slice(0, 20).map((o) => (
              <li key={o.orgId} className="flex items-center justify-between py-2">
                <span className="text-slate-500">{o.orgId.slice(0, 8)}â€¦</span>
                <span className="text-slate-900 font-semibold">{o.tokens.toLocaleString()} tok Â· ${o.estimatedUsd}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// â”€â”€ Risks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Risks() {
  const { data, loading } = useAsync(() => api.risks());
  if (loading) return <Card><ChartSkeleton /></Card>;
  const d = (data ?? {}) as Record<string, unknown>;
  const high = (d.highRiskClients ?? []) as Record<string, unknown>[];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile label="Open exceptions"  value={String(d.openExceptions ?? 0)} tone="danger" />
        <StatTile label="High-risk clients" value={String(high.length)} tone="gold" />
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">High-risk clients</h3>
        {high.length === 0 ? <Empty title="No high-risk clients" /> : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase tracking-wide text-slate-400">
                <tr><th className="px-3 py-2">Business</th><th className="px-3 py-2">Compliance</th><th className="px-3 py-2">Cashflow</th><th className="px-3 py-2">Confidence</th></tr>
              </thead>
              <tbody>
                {high.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{String(r.legal_name ?? r.org_id)}</td>
                    <td className="px-3 py-2 text-red-600 font-semibold">{String(r.compliance_risk)}</td>
                    <td className="px-3 py-2 text-red-600 font-semibold">{String(r.cashflow_risk)}</td>
                    <td className="px-3 py-2 text-slate-500">{String(r.confidence_score ?? "â€”")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// â”€â”€ Pipelines â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Pipelines() {
  const { data, loading } = useAsync(() => api.cicd());
  if (loading) return <Card><ChartSkeleton /></Card>;
  const runs = data?.runs ?? [];
  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-800">CI/CD pipelines Â· {data?.connector}</h3>
      {runs.length === 0 ? (
        <div className="mt-3"><Empty title="No pipeline data" hint="Set GITHUB_TOKEN + GITHUB_REPO to show GitHub Actions runs." /></div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-xs">
          {runs.map((x, i) => {
            const r = x as Record<string, unknown>;
            return (
              <li key={i} className="flex items-center justify-between py-2.5">
                <span className="text-slate-900 font-medium">{String(r.name)} Â· <span className="text-slate-500">{String(r.branch)}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${String(r.conclusion) === "success" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {String(r.conclusion ?? r.status)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// â”€â”€ Cloud â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CloudStatus() {
  const { data, loading } = useAsync(() => api.cloudStatus());
  if (loading) return <Card><ChartSkeleton /></Card>;
  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-800">Cloud services (GCP) Â· {data?.connector}</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data?.services.map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">{s.name}</span>
            <span className={`text-xs font-semibold ${s.status === "operational" ? "text-emerald-600" : "text-slate-400"}`}>{s.status}</span>
          </div>
        ))}
      </div>
      {data?.connector !== "ACTIVE" && <p className="mt-3 text-xs text-slate-400">Set GCP billing/monitoring to surface live Cloud Status.</p>}
    </Card>
  );
}

// â”€â”€ DB Browser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DbBrowser() {
  const tablesQ = useAsync(() => api.tables());
  const [key, setKey] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (k: string, p: number, q: string) => {
    setLoading(true);
    try { setGridData(await api.table(k, PAGE_SIZE, p * PAGE_SIZE, q)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (key) void load(key, page, query); }, [key, page, query, load]);
  useEffect(() => { if (!key && tablesQ.data?.[0]) setKey(tablesQ.data[0].key); }, [tablesQ.data, key]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {tablesQ.data?.map((t) => (
          <button key={t.key} onClick={() => { setKey(t.key); setPage(0); setQuery(""); }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${key === t.key ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <DataGrid
        data={gridData}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        onQuery={(q) => { setQuery(q); setPage(0); }}
        onPage={setPage}
        onSave={async (id, patch) => { if (key) { await api.updateRow(key, id, patch); await load(key, page, query); } }}
      />
      <p className="text-xs text-slate-400">Column-level security: secrets and hashes are never exposed. Every view and edit is recorded in the audit log.</p>
    </div>
  );
}

// â”€â”€ Observability (Recharts â€” replacing Grafana) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Observability() {
  const { data, loading } = useAsync(() => api.metrics());
  if (loading) return <Card><ChartSkeleton /></Card>;
  const revenueByMonth = data?.revenueByMonth ?? [];
  const orgsByMonth = data?.orgsByMonth ?? [];
  const signupsByWeek = data?.signupsByWeek ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-sm font-bold text-slate-800 mb-4">Revenue Trend (Monthly, captured payments)</h3>
        {revenueByMonth.length > 0 ? <RechartsLine data={revenueByMonth} xKey="label" yKey="revenue" color="#10B981" label="Revenue (â‚¹)" /> : <Empty title="No revenue yet" hint="Captured payments appear here as billing goes live." />}
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-bold text-slate-800 mb-4">New Organisations (Monthly)</h3>
          {orgsByMonth.length > 0 ? <RechartsLine data={orgsByMonth} xKey="label" yKey="orgs" color="#3B82F6" label="New orgs" /> : <Empty title="No organisations yet" />}
        </Card>
        <Card>
          <h3 className="text-sm font-bold text-slate-800 mb-4">New Signups (Weekly)</h3>
          {signupsByWeek.length > 0 ? <RechartsBar data={signupsByWeek} xKey="label" yKey="signups" color="#10B981" label="Signups" /> : <Empty title="No signups yet" />}
        </Card>
      </div>
    </div>
  );
}

// â”€â”€ Access Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AccessLog() {
  const { data, loading } = useAsync(() => api.accessLog());
  if (loading) return <Card><ChartSkeleton /></Card>;
  const log = data?.log ?? [];
  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-800">Admin access log (immutable)</h3>
      <div className="mt-3 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 uppercase tracking-wide text-slate-400">
            <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Target</th></tr>
          </thead>
          <tbody>
            {log.map((x, i) => {
              const r = x as Record<string, unknown>;
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{String(r.created_at)}</td>
                  <td className="px-3 py-2 text-slate-900 font-medium">{String(r.action)}</td>
                  <td className="px-3 py-2 text-slate-500">{String(r.target ?? "â€”")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// â”€â”€ Landing Contacts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LandingContacts() {
  const { data, loading } = useAsync(() => api.landingContacts());
  if (loading) return <Card><ChartSkeleton /></Card>;
  const contacts = data ?? [];
  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Landing Page Leads</h3>
      <div className="overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 uppercase tracking-wide text-slate-400">
            <tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Message</th></tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No leads yet.</td></tr>
            ) : contacts.map((x, i) => {
              const r = x as Record<string, unknown>;
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{new Date(String(r.created_at)).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{String(r.first_name)} {String(r.last_name)}</td>
                  <td className="px-3 py-2 text-slate-600">{String(r.email)}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{String(r.company)}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={String(r.message)}>{String(r.message)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AdminPanel() {
  const [tab, setTab] = useState<string>("overview");

  return (
    <PanelShell
      title="Control Tower"
      subtitle="Full platform governance, billing, risk, observability and database access â€” internal only."
      allow={["ADMIN"]}
    >
      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                tab === t.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <Overview />}
      {tab === "landing"  && <LandingContacts />}
      {tab === "billing"  && <Billing />}
      {tab === "ai"       && <AiCloud />}
      {tab === "risks"    && <Risks />}
      {tab === "cicd"     && <Pipelines />}
      {tab === "cloud"      && <CloudStatus />}
      {tab === "db"       && <DbBrowser />}
      {tab === "obs"      && <Observability />}
      {tab === "audit"    && <AccessLog />}
    </PanelShell>
  );
}

