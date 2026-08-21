"use client";
/**
 * Module registry — every sidebar feature renders a REAL module here, wired to
 * its actual backend. No placeholders, no fabricated numbers: each module
 * fetches live data and shows an honest empty/degraded state otherwise.
 * Design: sharp (2-3px) surfaces, dense 12-14px type, industry-standard.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getAccess, getOrgId } from "../../lib/api";

// ── shared kit ───────────────────────────────────────────────────────────────
function useLoad<T>(fn: (orgId: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const orgId = typeof window !== "undefined" ? getOrgId() : null;
  const reload = useCallback(() => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    fn(orgId).then((d) => { setData(d); setError(null); }).catch((e) => setError(String(e?.message ?? e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, orgId, reload };
}

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink">{title}</h2>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "ok" }) {
  return (
    <div className="border border-border bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold ${tone === "danger" ? "text-danger" : tone === "ok" ? "text-emerald-600" : "text-ink"}`}>{value}</p>
    </div>
  );
}
function Table({ cols, rows }: { cols: string[]; rows: (string | number | ReactNode)[][] }) {
  if (!rows.length) return <Hint text="No records yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead><tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">{cols.map((c) => <th key={c} className="px-2 py-2 font-medium">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-borderCard hover:bg-slate-50">{r.map((c, j) => <td key={j} className="px-2 py-2 text-ink">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function Hint({ text }: { text: string }) {
  return <p className="py-6 text-center text-[12px] text-muted">{text}</p>;
}
function Err({ text }: { text: string }) {
  return <p className="border border-danger/30 bg-red-50 px-3 py-2 text-[12px] text-danger">{text.replaceAll("_", " ")}</p>;
}
function Btn({ children, onClick, busy, disabled }: { children: ReactNode; onClick: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy || disabled}
      className="bg-brand px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50">
      {busy ? "Working…" : children}
    </button>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border border-border bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-brand ${props.className ?? ""}`} />;
}
const inr = (n: unknown) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
const dt = (s: unknown) => (s ? new Date(String(s)).toLocaleDateString("en-IN") : "—");

// ── modules ──────────────────────────────────────────────────────────────────

/** Comment thread on one entity — the owner ↔ assigned-CA collaboration surface. */
function CommentsThread({ orgId, entityType, entityId }: { orgId: string; entityType: string; entityId: string }) {
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () => api.mod.comments(orgId, entityType, entityId).then(setItems).catch(() => setItems([])),
    [orgId, entityType, entityId],
  );
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="border border-borderCard bg-bg2 px-3 py-2.5">
      {items === null ? <p className="text-[11px] text-muted">Loading comments…</p> : items.length === 0 ? (
        <p className="text-[11px] text-muted">No comments yet — discuss this record with your CA here.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((m) => (
            <li key={String(m.id)} className="text-[12px] text-ink">
              <span className="font-semibold">{String(m.author_name ?? m.author_role ?? "User")}</span>
              <span className="ml-1.5 text-[10px] text-muted">{new Date(String(m.created_at)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              <p className="text-muted">{String(m.body)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <Input placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} />
        <Btn busy={busy} disabled={!text.trim()} onClick={async () => {
          setBusy(true);
          try { await api.mod.addComment(orgId, entityType, entityId, text.trim()); setText(""); await load(); } finally { setBusy(false); }
        }}>Post</Btn>
      </div>
    </div>
  );
}

function Invoices() {
  const { data, error, loading, orgId } = useLoad((o) => api.acc.sales(o));
  const [open, setOpen] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  if (loading) return <Hint text="Loading invoices…" />;
  if (error) return <Err text={error} />;
  const rows = (data ?? []).map((r) => [
    String(r.invoice_no), String(r.customer_name ?? "—"), dt(r.date), inr(r.total), String(r.status),
    <span key="act" className="flex gap-2">
      <button
        disabled={pdfBusy === String(r.id)}
        onClick={async () => {
          setPdfBusy(String(r.id)); setPdfErr(null);
          try { await api.mod.downloadSalesPdf(orgId!, String(r.id), `${String(r.invoice_no).replace(/[^\w.-]/g, "_")}.pdf`); }
          catch (e) { setPdfErr(`${r.invoice_no}: ${String((e as Error).message).replaceAll("_", " ")}`); }
          finally { setPdfBusy(null); }
        }}
        className="font-semibold text-brand hover:underline disabled:opacity-50"
      >{pdfBusy === String(r.id) ? "…" : "PDF"}</button>
      <button onClick={() => setOpen((cur) => (cur === String(r.id) ? null : String(r.id)))} title="Comments" className="font-semibold text-muted hover:text-ink">💬</button>
    </span>,
  ]);
  return (
    <div className="space-y-4">
      <Panel title="Sales Invoices" right={<a href="/workspace" className="text-[12px] font-semibold text-brand hover:underline">+ New invoice</a>}>
        {pdfErr && <div className="mb-2"><Err text={pdfErr} /></div>}
        <Table cols={["No", "Customer", "Date", "Total", "Status", ""]} rows={rows} />
        {open && orgId && (
          <div className="mt-3">
            <CommentsThread orgId={orgId} entityType="SALE" entityId={open} />
          </div>
        )}
      </Panel>
    </div>
  );
}

const EXPENSE_CATEGORIES = ["Rent", "Salaries", "Utilities", "Transport", "Marketing", "Office Supplies", "Professional Fees", "Bank Charges", "Other"];

function Expenses() {
  const purchases = useLoad((o) => api.acc.purchases(o));
  const expenses = useLoad((o) => api.mod.expenses(o));
  const [category, setCategory] = useState("Rent"); const [amount, setAmount] = useState(""); const [vendor, setVendor] = useState(""); const [busy, setBusy] = useState(false); const [err2, setErr2] = useState<string | null>(null);
  if (purchases.loading || expenses.loading) return <Hint text="Loading expenses…" />;
  return (
    <div className="space-y-4">
      <Panel title="Record an expense">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-brand">
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          <Input placeholder="Paid to (optional)" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          <Btn busy={busy} disabled={!amount} onClick={async () => {
            setBusy(true); setErr2(null);
            try { await api.mod.addExpense(getOrgId()!, { category, amount: Number(amount), vendorName: vendor || undefined }); setAmount(""); setVendor(""); expenses.reload(); }
            catch (e) { setErr2(String((e as Error).message).replaceAll("_", " ")); }
            finally { setBusy(false); }
          }}>Record</Btn>
        </div>
        {err2 && <p className="mt-2 text-[12px] font-medium text-danger">{err2}</p>}
      </Panel>
      <Panel title="Expenses">
        {expenses.error ? <Err text={expenses.error} /> : <Table cols={["Date", "Category", "Paid to", "Amount"]} rows={((expenses.data ?? []) as Record<string, unknown>[]).map((r) => [dt(r.expense_date ?? r.created_at), String(r.category ?? "—"), String(r.vendor_name ?? "—"), inr(r.amount)])} />}
      </Panel>
      <Panel title="Purchase bills" right={<a href="/workspace" className="text-[12px] font-semibold text-brand hover:underline">+ Record purchase</a>}>
        {purchases.error ? <Err text={purchases.error} /> : <Table cols={["Bill", "Vendor", "Date", "Total", "Status"]} rows={(purchases.data ?? []).map((r) => [String(r.bill_no ?? "—"), String(r.vendor_name ?? "—"), dt(r.date), inr(r.total), String(r.status ?? "RECORDED")])} />}
      </Panel>
    </div>
  );
}

function Reconciliation() {
  const m = useLoad((o) => api.mod.reconMatches(o));
  const u = useLoad((o) => api.mod.reconUnmatched(o));
  if (m.loading || u.loading) return <Hint text="Loading reconciliation…" />;

  const matchedList = Array.isArray(m.data) ? m.data : [];
  
  let unmatchedList: any[] = [];
  if (u.data) {
    if (Array.isArray(u.data)) {
      unmatchedList = u.data;
    } else if (typeof u.data === "object") {
      const obj = u.data as any;
      unmatchedList = Array.isArray(obj.unmatchedBankTxns)
        ? obj.unmatchedBankTxns
        : Array.isArray(obj.unmatchedItems)
        ? obj.unmatchedItems
        : [];
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Matched" value={String(matchedList.length)} tone="ok" />
        <Stat label="Unmatched" value={String(unmatchedList.length)} tone={unmatchedList.length ? "danger" : undefined} />
      </div>
      <Panel title="Unmatched Transactions">
        {u.error ? (
          <Err text={u.error} />
        ) : (
          <Table
            cols={["Date", "Description", "Amount"]}
            rows={unmatchedList.map((r) => [
              dt(r.date ?? r.txn_date ?? r.created_at),
              String(r.description ?? r.narration ?? r.reference ?? "—"),
              inr(r.amount ?? r.total ?? 0),
            ])}
          />
        )}
      </Panel>
      <Hint text="Connect your bank (Account Aggregator) in Settings to stream live transactions." />
    </div>
  );
}

function GstDashboard() {
  const s = useLoad(() => api.mod.gstSummary(getOrgId()!));
  const c = useLoad(() => api.mod.gstStatus());
  if (s.loading) return <Hint text="Loading GST data…" />;
  const d = (s.data ?? {}) as Record<string, number>;
  const connector = String((c.data as Record<string, unknown>)?.connector ?? (c.data as Record<string, unknown>)?.status ?? "NOT CONFIGURED");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Output GST" value={inr(d.outputGst ?? d.output ?? 0)} />
        <Stat label="Input Credit" value={inr(d.inputGst ?? d.input ?? 0)} tone="ok" />
        <Stat label="Net Payable" value={inr(d.netPayable ?? d.net ?? 0)} tone={(d.netPayable ?? 0) > 0 ? "danger" : undefined} />
        <Stat label="GSP Connector" value={connector} />
      </div>
      {s.error && <Err text={s.error} />}
      <Panel title="Filing Calendar (statutory)">
        <Table cols={["Return", "Period", "Due date"]} rows={statutoryDues().map((x) => [x.name, x.period, x.due])} />
      </Panel>
    </div>
  );
}

function statutoryDues() {
  const now = new Date(); const m = now.toLocaleString("en-IN", { month: "short", year: "numeric" });
  const mk = (day: number) => { const d = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > day ? 1 : 0), day); return d.toLocaleDateString("en-IN"); };
  return [
    { name: "GSTR-1", period: m, due: mk(11) },
    { name: "GSTR-3B", period: m, due: mk(20) },
    { name: "TDS deposit", period: m, due: mk(7) },
    { name: "PF/ESI", period: m, due: mk(15) },
  ];
}

function EInvoicing() {
  const c = useLoad(() => api.mod.gstStatus());
  const connector = String((c.data as Record<string, unknown>)?.connector ?? "NOT CONFIGURED");
  return (
    <div className="space-y-4">
      <Stat label="GSP / IRP connector" value={connector} tone={connector === "ACTIVE" ? "ok" : undefined} />
      <Panel title="Generate IRN (e-Invoice)">
        {connector === "ACTIVE"
          ? <Hint text="Open an invoice from Invoices → PDF, then push to IRP from there." />
          : <Hint text="The GSP connector needs GST Suvidha Provider credentials (e.g. ClearTax/Masters India). Once configured, IRN + QR generate automatically on every B2B invoice." />}
      </Panel>
    </div>
  );
}

function EWayBills() {
  const c = useLoad(() => api.mod.gstStatus());
  const connector = String((c.data as Record<string, unknown>)?.connector ?? "NOT CONFIGURED");
  return (
    <div className="space-y-4">
      <Stat label="E-Way connector" value={connector} tone={connector === "ACTIVE" ? "ok" : undefined} />
      <Panel title="Generate e-Way Bill">
        {connector === "ACTIVE"
          ? <Hint text="E-way bills generate from invoices above ₹50,000 with transport details." />
          : <Hint text="Configure GSP credentials to enable e-way bill generation for goods movement above ₹50,000." />}
      </Panel>
    </div>
  );
}

function ComplianceCalendar() {
  return <Panel title="Compliance Calendar"><Table cols={["Obligation", "Period", "Due date"]} rows={statutoryDues().map((x) => [x.name, x.period, x.due])} /></Panel>;
}

function HealthScore() {
  const s = useLoad((o) => api.bhs(o));
  const h = useLoad((o) => api.mod.bhsHistory(o));
  if (s.loading) return <Hint text="Computing health score…" />;
  const score = s.data?.score;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Business Health Score" value={score != null ? `${score}/100` : "—"} tone={score != null && score < 40 ? "danger" : score != null && score >= 70 ? "ok" : undefined} />
        <Stat label="Rating" value={s.data?.rating ?? "Awaiting data"} />
      </div>
      <Panel title="Score History">
        {h.error ? <Err text={h.error} /> : <Table cols={["Computed", "Score", "Rating"]} rows={(h.data ?? []).map((r) => [dt(r.computed_at), String(r.score), String(r.rating ?? "—")])} />}
      </Panel>
      <Hint text="The score recomputes automatically as ledger, GST and reconciliation events stream in." />
    </div>
  );
}

function MoneyMap() {
  const { data, error, loading } = useLoad((o) => api.moneyMap(o));
  if (loading) return <Hint text="Loading MoneyMap…" />;
  if (error) return <Err text={error} />;
  if (!data?.hasData) return <Hint text="MoneyMap activates once invoices and bank data flow in." />;
  const max = Math.max(...data.spendByCategory.map((x) => x.amount), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Inflow" value={inr(data.inflow)} tone="ok" />
        <Stat label="Outflow" value={inr(data.outflow)} />
        <Stat label="Net" value={inr(data.net)} tone={data.net < 0 ? "danger" : "ok"} />
      </div>
      <Panel title="Spend by Category">
        <div className="space-y-2">
          {data.spendByCategory.map((s) => (
            <div key={s.category} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-[11px] text-muted">{s.category}</span>
              <span className="h-2 flex-1 bg-bg2"><span className="block h-full bg-brand" style={{ width: `${(s.amount / max) * 100}%` }} /></span>
              <span className="w-24 text-right text-[11px] font-medium text-ink">{inr(s.amount)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function TaxWarnings() {
  const { data, error, loading } = useLoad((o) => api.mod.taxWarning(o));
  if (loading) return <Hint text="Analyzing tax exposure…" />;
  if (error) return <Err text={error} />;
  const d = (data ?? {}) as Record<string, unknown>;
  const warnings = (d.warnings as Record<string, unknown>[]) ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Projected GST liability" value={inr(d.projectedGst ?? d.projected ?? 0)} />
        <Stat label="Active warnings" value={String(warnings.length)} tone={warnings.length ? "danger" : "ok"} />
      </div>
      <Panel title="Predictive Tax Warnings">
        {warnings.length
          ? <Table cols={["Severity", "Warning", "Impact"]} rows={warnings.map((w) => [String(w.severity ?? "INFO"), String(w.message ?? w.title ?? "—"), inr(w.impact ?? 0)])} />
          : <Hint text="No tax risks detected for the current period." />}
      </Panel>
    </div>
  );
}

function ProfitLeak() {
  const { data, error, loading } = useLoad((o) => api.mod.profitLeaks(o));
  if (loading) return <Hint text="Scanning for profit leaks…" />;
  if (error) return <Err text={error} />;
  const leaks = ((data as Record<string, unknown>)?.leaks as Record<string, unknown>[]) ?? [];
  return (
    <Panel title="ProfitLeak Finder">
      {leaks.length
        ? <Table cols={["Category", "Finding", "Est. annual leak"]} rows={leaks.map((l) => [String(l.category ?? "—"), String(l.finding ?? l.message ?? "—"), inr(l.annualImpact ?? l.amount ?? 0)])} />
        : <Hint text="No leaks detected yet — analysis sharpens as expense data accumulates." />}
    </Panel>
  );
}

function Benchmarks() {
  const org = useLoad((o) => api.mod.org(o));
  const industry = String((org.data as Record<string, unknown>)?.industry ?? "RETAIL");
  const { data, error, loading } = useLoad(() => api.mod.benchmarks(industry));
  if (org.loading || loading) return <Hint text="Loading benchmarks…" />;
  if (error) return <Err text={error} />;
  const d = (data ?? {}) as Record<string, unknown>;
  const metrics = (d.metrics as Record<string, unknown>[]) ?? Object.entries(d).filter(([, v]) => typeof v === "number").map(([k, v]) => ({ metric: k, value: v }));
  return (
    <Panel title={`Industry Benchmarks — ${industry}`}>
      {metrics.length
        ? <Table cols={["Metric", "Industry median"]} rows={metrics.map((m) => [String((m as Record<string, unknown>).metric ?? (m as Record<string, unknown>).name), String((m as Record<string, unknown>).value ?? (m as Record<string, unknown>).median ?? "—")])} />
        : <Hint text="Benchmark dataset for your industry is being assembled." />}
    </Panel>
  );
}

const SOS_CATEGORIES = [
  ["GST_NOTICE", "GST notice"], ["TAX_NOTICE", "Tax notice"], ["FRAUD", "Fraud"],
  ["CASHFLOW_CRISIS", "Cashflow crisis"], ["VENDOR_DISPUTE", "Vendor dispute"],
] as const;

function Lifeguard() {
  const { data, error, loading, orgId, reload } = useLoad((o) => api.mod.lifeguard(o));
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (loading) return <Hint text="Loading Lifeguard…" />;
  return (
    <div className="space-y-4">
      <Panel title="🆘 Raise an SOS — what's the emergency?">
        <div className="flex flex-wrap gap-2">
          {SOS_CATEGORIES.map(([value, label]) => (
            <Btn key={value} busy={busy === value} onClick={async () => {
              setBusy(value); setNotice(null);
              try { await api.mod.lifeguardSos(orgId!, { category: value }); setNotice(`Case opened — an analyst is on it.${["GST_NOTICE","TAX_NOTICE","FRAUD"].includes(value) ? " Escalated to legal." : ""}`); reload(); }
              catch (e) { setNotice(String((e as Error).message).replaceAll("_", " ")); }
              finally { setBusy(null); }
            }}>{label}</Btn>
          ))}
        </div>
        {notice && <p className="mt-3 text-[12px] font-medium text-ink">{notice}</p>}
      </Panel>
      <Panel title="Your cases">
        {error ? <Err text={error} /> : <Table cols={["Opened", "Category", "Status"]} rows={(data ?? []).map((r) => [dt(r.created_at), String(r.category ?? "—").replaceAll("_", " "), String(r.status)])} />}
      </Panel>
      <Hint text="Lifeguard also auto-opens cases from GST notices, fraud signals and cashflow danger — GST/tax/fraud cases escalate straight to legal." />
    </div>
  );
}

function Warranty() {
  const { data, error, loading, orgId, reload } = useLoad((o) => api.mod.warrantyClaims(o));
  const [desc, setDesc] = useState(""); const [type, setType] = useState("GST_PENALTY"); const [amount, setAmount] = useState(""); const [busy, setBusy] = useState(false); const [err2, setErr2] = useState<string | null>(null);
  if (loading) return <Hint text="Loading warranty…" />;
  return (
    <div className="space-y-4">
      <Panel title="File a Warranty Claim">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-brand">
            <option value="GST_PENALTY">GST penalty</option>
            <option value="TAX_PENALTY">Tax penalty</option>
            <option value="PAYROLL">Payroll error</option>
            <option value="OTHER">Other</option>
          </select>
          <Input placeholder="Penalty amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          <Input placeholder="What went wrong?" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="mt-2">
          <Btn busy={busy} disabled={!amount || desc.length < 10} onClick={async () => {
            setBusy(true); setErr2(null);
            try { await api.mod.warrantyClaim(orgId!, { type, penaltyAmount: Number(amount), description: desc }); setDesc(""); setAmount(""); reload(); }
            catch (e) { setErr2(String((e as Error).message).replaceAll("_", " ")); }
            finally { setBusy(false); }
          }}>File claim</Btn>
          {err2 && <span className="ml-3 text-[12px] font-medium text-danger">{err2}</span>}
        </div>
      </Panel>
      <Panel title="Claims">
        {error ? <Err text={error} /> : <Table cols={["Filed", "Type", "Penalty", "Status"]} rows={(data ?? []).map((r) => [dt(r.created_at), String(r.type ?? "—").replaceAll("_", " "), inr(r.penalty_amount ?? r.penaltyAmount ?? 0), String(r.status)])} />}
      </Panel>
    </div>
  );
}

function VendorTrust() {
  const { data, error, loading } = useLoad((o) => api.mod.vendorTrust(o));
  const [gstin, setGstin] = useState(""); const [check, setCheck] = useState<Record<string, unknown> | null>(null); const [busy, setBusy] = useState(false);
  if (loading) return <Hint text="Loading vendor trust…" />;
  const vendors = ((data as Record<string, unknown>)?.vendors as Record<string, unknown>[]) ?? (Array.isArray(data) ? (data as Record<string, unknown>[]) : []);
  return (
    <div className="space-y-4">
      <Panel title="Check any vendor by GSTIN">
        <div className="flex gap-2">
          <Input placeholder="e.g. 27ABCDE1234F1Z5" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} />
          <Btn busy={busy} disabled={gstin.length !== 15} onClick={async () => { setBusy(true); try { setCheck(await api.mod.vendorCheck(gstin)); } catch (e) { setCheck({ error: String(e) }); } finally { setBusy(false); } }}>Check</Btn>
        </div>
        {check && <pre className="mt-3 overflow-x-auto border border-border bg-bg2 p-3 text-[11px]">{JSON.stringify(check, null, 2)}</pre>}
      </Panel>
      <Panel title="Your Vendors">
        {error ? <Err text={error} /> : <Table cols={["Vendor", "GSTIN", "Trust score"]} rows={vendors.map((v) => [String(v.name ?? v.vendor_name ?? "—"), String(v.gstin ?? "—"), String(v.score ?? v.trust_score ?? "—")])} />}
      </Panel>
    </div>
  );
}

function Vbd() {
  const [decision, setDecision] = useState(""); const [impact, setImpact] = useState(""); const [out, setOut] = useState<Record<string, unknown> | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const orgId = getOrgId();
  return (
    <div className="space-y-4">
      <Panel title="Virtual Business Director — scenario simulation">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input placeholder='The decision… e.g. "Hire 2 staff"' value={decision} onChange={(e) => setDecision(e.target.value.slice(0, 280))} />
          </div>
          <Input placeholder="Monthly cost ₹ (negative = saving)" value={impact} onChange={(e) => setImpact(e.target.value.replace(/[^\d.-]/g, ""))} />
        </div>
        <div className="mt-2">
          <Btn busy={busy} disabled={decision.length < 4 || impact === "" || !orgId} onClick={async () => {
            setBusy(true); setErr(null);
            try { setOut(await api.mod.vbdSimulate(orgId!, { decision, monthlyImpact: Number(impact) })); }
            catch (e) { setErr(String((e as Error).message).replaceAll("_", " ")); }
            finally { setBusy(false); }
          }}>Simulate</Btn>
        </div>
        {err && <div className="mt-3"><Err text={err} /></div>}
        {out && <div className="mt-3 whitespace-pre-wrap border border-border bg-bg2 p-3 text-[12px] text-ink">{String((out as Record<string, unknown>).analysis ?? (out as Record<string, unknown>).recommendation ?? JSON.stringify(out, null, 2))}</div>}
      </Panel>
      <Hint text="VBD models the decision against your real cash position and runway — e.g. hiring 2 staff at ₹25,000 each = 50000 monthly cost." />
    </div>
  );
}

function BalanceSheet() {
  const { data, error, loading } = useLoad((o) => api.mod.balanceSheet(o));
  if (loading) return <Hint text="Assembling balance sheet…" />;
  if (error) return <Err text={error} />;
  const d = (data ?? {}) as { hasData?: boolean; assets?: { name: string; amount: number }[]; liabilities?: { name: string; amount: number }[]; equity?: { name: string; amount: number }[]; totalAssets?: number; totalLiabilities?: number; totalEquity?: number; balanced?: boolean };
  if (!d.hasData) return <Hint text="The balance sheet assembles as soon as your first invoice or expense posts to the ledger." />;
  const side = (title: string, rows: { name: string; amount: number }[], total: number) => (
    <Panel title={`${title} — ${inr(total)}`}>
      <Table cols={["Account", "Balance"]} rows={rows.map((r) => [r.name, inr(r.amount)])} />
    </Panel>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total Assets" value={inr(d.totalAssets ?? 0)} tone="ok" />
        <Stat label="Liabilities + Equity" value={inr((d.totalLiabilities ?? 0) + (d.totalEquity ?? 0))} />
        <Stat label="Balanced" value={d.balanced ? "YES" : "NO"} tone={d.balanced ? "ok" : "danger"} />
      </div>
      {side("Assets", d.assets ?? [], d.totalAssets ?? 0)}
      {side("Liabilities", d.liabilities ?? [], d.totalLiabilities ?? 0)}
      {side("Equity", d.equity ?? [], d.totalEquity ?? 0)}
    </div>
  );
}

function Reports({ kind }: { kind: "pnl" | "cashflow" | "balance-sheet" }) {
  const pnl = useLoad((o) => api.mod.pnl(o));
  const cf = useLoad((o) => api.cashflow(o));
  if (kind === "balance-sheet") return <BalanceSheet />;
  if (kind === "cashflow") {
    if (cf.loading) return <Hint text="Loading cashflow…" />;
    const d = cf.data;
    return (
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Runway" value={d?.hasData && d.runwayDays != null ? `${d.runwayDays} days` : "—"} tone={d?.risk === "HIGH" ? "danger" : undefined} />
        <Stat label="Risk" value={d?.hasData ? d.risk : "Awaiting bank data"} />
      </div>
    );
  }
  if (pnl.loading) return <Hint text="Computing P&L…" />;
  if (pnl.error) return <Err text={pnl.error} />;
  const d = (pnl.data ?? {}) as Record<string, number>;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Revenue" value={inr(d.revenue ?? d.income ?? 0)} tone="ok" />
      <Stat label="Expenses" value={inr(d.expenses ?? 0)} />
      <Stat label="Gross Profit" value={inr(d.grossProfit ?? d.gross ?? 0)} />
      <Stat label="Net Profit" value={inr(d.netProfit ?? d.net ?? 0)} tone={(d.netProfit ?? 0) < 0 ? "danger" : "ok"} />
    </div>
  );
}

function BusinessProfile() {
  const { data, error, loading } = useLoad((o) => api.mod.org(o));
  const [me, setMe] = useState<{ mobile: string | null; email: string | null } | null>(null);
  useEffect(() => { api.me().then((m) => setMe({ mobile: m.mobile, email: m.email })).catch(() => setMe(null)); }, []);
  if (loading) return <Hint text="Loading profile…" />;
  if (error) return <Err text={error} />;
  const d = (data ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-4">
      <Panel title="Business Profile" right={<a href="/onboarding" className="border border-border px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-brand">Enterprise setup →</a>}>
        <Table cols={["Field", "Value"]} rows={[
          ["Legal name", String(d.legal_name ?? "—")],
          ["Vertofi ID", String(d.public_id ?? "—")],
          ["Mobile", me?.mobile ?? "—"],
          ["Email", me?.email ?? "—"],
          ["GSTIN", String(d.gstin ?? "Not added")],
          ["PAN", String(d.pan ?? "Not added")],
          ["Type", String(d.business_type ?? "—")],
          ["Industry", String(d.industry ?? "—")],
          ["Plan", String(d.plan ?? "—")],
        ]} />
      </Panel>
      <AssignProfessional />
    </div>
  );
}

type AssignedRow = { grant_id: string | null; request_id: string | null; state: string; grantee_id: string; permission: string; public_id: string | null; email: string | null; professional_type: string | null };

function AssignProfessional() {
  const [vru, setVru] = useState(""); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<AssignedRow[] | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => { api.mod.myProfessionals().then(setRows).catch(() => setRows([])); }, []);
  useEffect(() => { load(); }, [load]);

  async function assign() {
    setBusy(true); setMsg(null);
    try { const r = await api.mod.assignProfessional(vru); setMsg(`Request sent to ${r.professional} — awaiting their confirmation.`); setVru(""); load(); }
    catch (e) { setMsg(String((e as Error).message).replaceAll("_", " ")); }
    finally { setBusy(false); }
  }
  async function revoke(row: AssignedRow) {
    setActingId(row.grantee_id);
    try {
      if (row.state === "ACTIVE") await api.mod.revokeProfessional(row.grantee_id);
      else if (row.request_id) await api.mod.cancelProfessionalRequest(row.request_id);
      load();
    } catch (e) { setMsg(String((e as Error).message).replaceAll("_", " ")); }
    finally { setActingId(null); }
  }

  return (
    <Panel title="Your CAs / Accountants">
      <p className="mb-2 text-[12px] text-muted">Ask your professional for their Vertofi ID (looks like VRU-1A2B3C4D), enter it here — they confirm from their panel, and only then get access to your books.</p>
      <div className="flex gap-2">
        <Input placeholder="VRU-XXXXXXXX" value={vru} onChange={(e) => setVru(e.target.value.toUpperCase())} />
        <Btn busy={busy} disabled={!/^VRU-[A-Z0-9]{8}$/.test(vru)} onClick={assign}>Send request</Btn>
      </div>
      {msg && <p className="mt-2 text-[12px] font-medium text-ink">{msg}</p>}

      <div className="mt-4">
        {rows === null ? (
          <p className="text-[12px] text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-[12px] text-muted">No professionals assigned yet.</p>
        ) : (
          <div className="divide-y divide-border border border-border">
            {rows.map((r) => (
              <div key={(r.grant_id ?? r.request_id) as string} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{r.email ?? r.public_id ?? "Professional"}</p>
                  <p className="text-[11px] text-muted">{r.public_id} · {r.professional_type ?? "—"} · {r.permission === "EDIT" ? "Read + write" : "Read only"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`px-2 py-0.5 text-[11px] font-semibold ${r.state === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.state === "ACTIVE" ? "Active" : "Pending"}</span>
                  <button onClick={() => revoke(r)} disabled={actingId === r.grantee_id} className="border border-border px-2.5 py-1 text-[11px] font-medium text-danger transition hover:border-danger disabled:opacity-50">
                    {r.state === "ACTIVE" ? "Revoke" : "Cancel"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function WhatsAppCfo() {
  const wa = process.env.NEXT_PUBLIC_WA_NUMBER ?? "918712357876";
  return (
    <div className="space-y-4">
      <Panel
        title="WhatsApp CFO (+91 87123 57876)"
        right={
          <a
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1EBE5D]"
            href={`https://wa.me/${wa}?text=hello`}
            target="_blank"
            rel="noreferrer"
          >
            Open WhatsApp
          </a>
        }
      >
        <Table cols={["Send", "What happens"]} rows={[
          ["menu", "Full command menu"],
          ["sale 5 chairs to Sharma Traders at 1200", "Creates a GST sales invoice"],
          ["purchase / expense …", "Records a purchase"],
          ["dashboard", "Cash position + health snapshot"],
          ["gst", "GST liability + due dates"],
          ["ai <question>", "Ask your AI CFO anything"],
        ]} />
      </Panel>
      <Hint text="Alerts (invoice created, risk flags, health score) arrive on WhatsApp (+91 87123 57876) automatically." />
    </div>
  );
}

function Insights() {
  const tax = useLoad((o) => api.mod.taxWarning(o));
  const leaks = useLoad((o) => api.mod.profitLeaks(o));
  if (tax.loading || leaks.loading) return <Hint text="Compiling insights…" />;
  const w = ((tax.data as Record<string, unknown>)?.warnings as unknown[]) ?? [];
  const l = ((leaks.data as Record<string, unknown>)?.leaks as unknown[]) ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Tax warnings" value={String(w.length)} tone={w.length ? "danger" : "ok"} />
        <Stat label="Profit leaks" value={String(l.length)} tone={l.length ? "danger" : "ok"} />
      </div>
      <Hint text="Drill into Tax Warnings and ProfitLeak Finder for full detail. The Virtual Business Director can simulate fixes." />
    </div>
  );
}

function Documents() {
  const { data, error, loading } = useLoad((o) => api.mod.documents(o));
  if (loading) return <Hint text="Opening the vault…" />;
  const docs = (data ?? []) as Record<string, unknown>[];
  return (
    <div className="space-y-4">
      <Panel title="Document Vault" right={<a href="/workspace" className="text-[12px] font-semibold text-brand hover:underline">+ Upload</a>}>
        {error ? <Err text={error} /> : docs.length === 0 ? (
          <Hint text="No documents yet — upload bills, notices and statements from Bookkeeping. Files persist in encrypted Cloud Storage with OCR extraction." />
        ) : (
          <Table cols={["Uploaded", "Type", "File", "Status"]} rows={docs.map((d) => [
            dt(d.created_at), String(d.type ?? "—").replaceAll("_", " "), String(d.filename ?? "—"), String(d.status ?? "—"),
          ])} />
        )}
      </Panel>
    </div>
  );
}

function BlackBox() {
  const t = useLoad((o) => api.mod.auditTimeline(o));
  const v = useLoad(() => api.mod.auditVerify());
  if (t.loading) return <Hint text="Loading the immutable ledger…" />;
  if (t.error) return <Err text={t.error} />;
  const entries = ((t.data as Record<string, unknown>)?.entries ?? []) as Record<string, unknown>[];
  const ver = (v.data ?? null) as { checked: number; breaks: number; intact: boolean } | null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Events recorded" value={String(entries.length)} />
        <Stat label="Chain integrity" value={ver ? (ver.intact ? "INTACT" : `${ver.breaks} BREAKS`) : "—"} tone={ver?.intact ? "ok" : ver ? "danger" : undefined} />
        <Stat label="Rows verified" value={ver ? String(ver.checked) : "—"} />
      </div>
      <Panel title="Financial Black Box — immutable timeline">
        {entries.length === 0 ? (
          <Hint text="No events recorded for your business yet. Every invoice, payment, edit and login lands here permanently — hash-chained, append-only, usable as evidence in disputes." />
        ) : (
          <Table cols={["When", "Event", "Hash (tamper-evident)"]} rows={entries.map((e) => [
            new Date(String(e.recorded_at)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
            String(e.event),
            `${String(e.hash).slice(0, 16)}…`,
          ])} />
        )}
      </Panel>
    </div>
  );
}

// ── registry ─────────────────────────────────────────────────────────────────
export const MODULES: Record<string, { title: string; component: () => ReactNode }> = {
  invoices: { title: "Invoices", component: Invoices },
  expenses: { title: "Expenses", component: Expenses },
  "bank-reconciliation": { title: "Bank Reconciliation", component: Reconciliation },
  documents: { title: "Documents", component: Documents },
  "gst-dashboard": { title: "GST Dashboard", component: GstDashboard },
  "e-invoicing": { title: "E-Invoicing", component: EInvoicing },
  "e-way-bills": { title: "E-Way Bills", component: EWayBills },
  "compliance-calendar": { title: "Compliance Calendar", component: ComplianceCalendar },
  "health-score": { title: "Business Health Score", component: HealthScore },
  "moneymap-live": { title: "MoneyMap Live", component: MoneyMap },
  "tax-warnings": { title: "Predictive Tax Warnings", component: TaxWarnings },
  "profitleak-finder": { title: "ProfitLeak Finder", component: ProfitLeak },
  benchmarks: { title: "Industry Benchmarks", component: Benchmarks },
  "business-lifeguard": { title: "Business Lifeguard", component: Lifeguard },
  "accounting-warranty": { title: "Accounting Warranty", component: Warranty },
  "financial-black-box": { title: "Financial Black Box", component: BlackBox },
  "vendor-trust": { title: "Vendor Trust", component: VendorTrust },
  "virtual-business-director": { title: "Virtual Business Director", component: Vbd },
  insights: { title: "Insights", component: Insights },
  "whatsapp-cfo": { title: "WhatsApp CFO", component: WhatsAppCfo },
  "p-and-l": { title: "Profit & Loss", component: () => <Reports kind="pnl" /> },
  "balance-sheet": { title: "Balance Sheet", component: () => <Reports kind="balance-sheet" /> },
  cashflow: { title: "Cashflow", component: () => <Reports kind="cashflow" /> },
  "business-profile": { title: "Business Profile", component: BusinessProfile },
};
