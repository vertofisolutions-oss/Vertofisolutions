"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState } from "@/ui";
import { Activity, Bell, HeartPulse, ShieldCheck, Wallet } from "lucide-react";
import { SidebarShell } from "../../components/SidebarShell";
import { api, getOrgId } from "@/lib/api";

type Bhs = { score: number | null; rating: string };
type Money = { inflow: number; outflow: number; net: number; hasData: boolean; spendByCategory: { category: string; amount: number }[] };
type Cash = { hasData: boolean; runwayDays: number | null; risk: string };
type Access = { active: boolean; plan: string | null; status: string | null };
type Note = { id: string; title: string; body: string; severity: string; created_at: string };

const DEFAULT_NOTES: Note[] = [
  {
    id: "1",
    title: "Business risk alert",
    body: "A gst notice risk was flagged for vertofisolutions and escalated for review. Open Vertofi Lifeguard to act.",
    severity: "CRITICAL",
    created_at: "2026-08-22T00:00:00.000Z",
  },
  {
    id: "2",
    title: "Business risk alert",
    body: "A gst notice risk was flagged for vertofisolutions and escalated for review. Open Vertofi Lifeguard to act.",
    severity: "CRITICAL",
    created_at: "2026-08-20T00:00:00.000Z",
  },
  {
    id: "3",
    title: "Welcome to Vertofi",
    body: "WhatsApp CFO welcome sent after signup.",
    severity: "INFO",
    created_at: "2026-07-24T00:00:00.000Z",
  },
];

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [orgId, setOrgId] = useState<string | null>("demo-business-org");
  const [bhs, setBhs] = useState<Bhs | null>(null);
  const [money, setMoney] = useState<Money | null>(null);
  const [cash, setCash] = useState<Cash | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [notes, setNotes] = useState<Note[]>(DEFAULT_NOTES);
  const [pastDue, setPastDue] = useState(false);
  const [hasInvoice, setHasInvoice] = useState<boolean | null>(false);
  const [gstConnected, setGstConnected] = useState<boolean | null>(false);
  const [profileDone, setProfileDone] = useState<boolean | null>(true);

  useEffect(() => {
    const oid = getOrgId() || "demo-business-org";
    setOrgId(oid);
    setReady(true);
    if (oid) {
      void (async () => {
        const [b, m, c, a, n, s, g, ob] = await Promise.allSettled([
          api.bhs(oid), api.moneyMap(oid), api.cashflow(oid), api.access(oid), api.notifications(false),
          api.acc.sales(oid), api.mod.gstStatus(), api.onboarding(oid),
        ]);
        if (b.status === "fulfilled") setBhs(b.value);
        if (m.status === "fulfilled") setMoney(m.value);
        if (c.status === "fulfilled") setCash(c.value);
        if (a.status === "fulfilled") {
          setAccess(a.value);
          setPastDue(a.value.status === "PAST_DUE" || (!a.value.active && a.value.status !== "TRIAL"));
        }
        if (n.status === "fulfilled" && Array.isArray(n.value) && n.value.length > 0) {
          setNotes(n.value);
        }
        setHasInvoice(s.status === "fulfilled" && Array.isArray(s.value) && s.value.length > 0);
        const conn = g.status === "fulfilled" ? String((g.value as Record<string, unknown>)?.connector ?? "") : "";
        setGstConnected(conn === "ACTIVE");
        if (ob.status === "fulfilled") {
          setProfileDone((ob.value as { confidence_score?: number | null }).confidence_score != null);
        }
      })();
    }
  }, [router]);

  if (!ready) return null;

  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  const sevTone = (s: string): "danger" | "gold" | "brand" | "neutral" =>
    s === "CRITICAL" || s === "HIGH" ? "danger" : s === "WARNING" || s === "MEDIUM" ? "gold" : s === "INFO" ? "brand" : "neutral";

  return (
    <SidebarShell>
      <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-8">
        {/* Greeting row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight text-ink">{greeting}</h1>
            <p className="mt-0.5 text-[12px] text-muted">Your live financial command center.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Power</Badge>
            <Badge tone="gold">Payment confirmed</Badge>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "New Invoice", href: "/workspace?section=sales" },
            { label: "Record Purchase", href: "/workspace?section=purchases" },
            { label: "Add Product", href: "/workspace?section=products" },
            { label: "Inventory", href: "/workspace?section=inventory" },
            { label: "Documents", href: "/workspace?section=documents" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => router.push(a.href)}
              className="rounded-card border border-border bg-white px-3.5 py-2 text-[12.5px] font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              {a.label}
            </button>
          ))}
        </div>

        {pastDue && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-card border border-danger/30 bg-[#FDECEC] p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[14px] font-semibold text-danger">Payment required to continue</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Your trial ended or an autopay charge didn&apos;t go through. Your account and data are safe — complete payment to unlock features again.
              </p>
            </div>
            <Button variant="primary" onClick={() => router.push("/subscribe")}>Reactivate</Button>
          </div>
        )}

        {/* First-run activation checklist */}
        <Card>
          <h2 className="text-[16px] font-semibold text-ink">Make your dashboard real</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Vertofi never shows fake numbers — finish these to bring your live data in.
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ChecklistItem
              done={!!hasInvoice}
              label="Create your first invoice"
              hint="GST-compliant PDF with your own number sequence."
              href="/workspace?section=sales"
            />
            <ChecklistItem
              done={!!money?.hasData}
              label="Connect bank & reconcile"
              hint="Unlocks cash position, runway and profit leaks."
              href="/module/reconciliation"
            />
            <ChecklistItem
              done={!!gstConnected}
              highlight={!gstConnected}
              label="Connect GST"
              hint="Filing status, dues and e-invoicing."
              href="/module/gst-dashboard"
            />
            <ChecklistItem
              done={false}
              label="Assign your CA"
              hint="Enter their Vertofi ID — they accept, you collaborate."
              href="/module/business-profile"
            />
            <ChecklistItem
              done={profileDone ?? true}
              label="Complete enterprise profile"
              hint="10-section setup — registration, tax, banking, documents."
              href="/onboarding"
            />
          </ul>
        </Card>

        {/* Compact KPI row */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Business Health */}
          <Kpi
            label="Business Health"
            icon={<HeartPulse className="h-4 w-4" />}
            iconClass="bg-amber-50 text-amber-500"
            value={bhs?.score != null ? String(bhs.score) : "—"}
            hint={bhs?.score != null ? bhs.rating : "Complete onboarding to generate your score."}
          />
          {/* Cash Position */}
          <Kpi
            label="Cash Position"
            icon={<Wallet className="h-4 w-4" />}
            iconClass="bg-blue-50 text-blue-500"
            value={money?.hasData ? inr(money.net) : "—"}
            valueClass={money?.hasData && money.net < 0 ? "text-danger" : "text-ink"}
            hint={
              cash?.hasData && cash.runwayDays !== null
                ? `${cash.runwayDays}-day runway`
                : "Connect a bank account to see live cashflow."
            }
          />
          {/* Cashflow Risk */}
          <Kpi
            label="Cashflow Risk"
            icon={<Activity className="h-4 w-4" />}
            iconClass="bg-emerald-50 text-emerald-600"
            value={cash?.hasData ? cash.risk : "—"}
            valueClass={cash?.risk === "HIGH" ? "text-danger" : "text-ink"}
            hint="Based on inflow vs. outflow over time."
          />
          {/* GST Status */}
          <Kpi
            label="GST Status"
            icon={<ShieldCheck className="h-4 w-4" />}
            iconClass="bg-blue-50 text-blue-500"
            value="Not connected"
            valueClass="text-[#475569] text-[16px] font-semibold"
            hint="Connect GST credentials to track filings & IRN."
          />
        </section>

        {/* MoneyMap */}
        <section>
          {money?.hasData && Array.isArray(money.spendByCategory) ? (
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-ink">MoneyMap Live</h2>
                <div className="flex gap-3 text-[12px]">
                  <span className="text-emerald-600">In {inr(money.inflow)}</span>
                  <span className="text-danger">Out {inr(money.outflow)}</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {money.spendByCategory.slice(0, 8).map((s) => {
                  const max = Math.max(...money.spendByCategory.map((x) => x.amount), 1);
                  return (
                    <div key={s.category} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-[12px] text-muted">{s.category}</span>
                      <span className="h-2.5 flex-1 rounded-full bg-bg2">
                        <span className="block h-full rounded-full bg-gradient-to-r from-[#1378F8] to-[#5BA3FF]" style={{ width: `${(s.amount / max) * 100}%` }} />
                      </span>
                      <span className="w-24 text-right text-[12px] font-medium text-ink">{inr(s.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="MoneyMap Live will appear here"
              description="Once your bank, GST and invoices are connected, your money flow animates in real time — inflow, outflow, profit zones and waste zones."
            />
          )}
        </section>

        {/* Recent activity */}
        <section>
          <Card>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Bell className="h-4 w-4" /></span>
              <h2 className="text-[16px] font-semibold text-ink">Recent activity</h2>
            </div>
            <ul className="mt-4 divide-y divide-borderCard">
              {notes.slice(0, 8).map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Badge tone={sevTone(n.severity)} className="mt-0.5 shrink-0 capitalize">{n.severity.toLowerCase()}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-[12px] text-muted">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">
                    {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </main>
    </SidebarShell>
  );
}

function ChecklistItem({ done, highlight = false, label, hint, href }: { done: boolean; highlight?: boolean; label: string; hint: string; href: string }) {
  const router = useRouter();
  return (
    <li>
      <button
        onClick={() => router.push(href)}
        className={`flex w-full items-start gap-2.5 border px-3 py-2.5 text-left transition rounded-lg ${
          done
            ? "border-borderCard bg-[#F8FAFC]"
            : highlight
            ? "border-brand bg-white shadow-xs"
            : "border-border bg-white hover:border-brand"
        }`}
      >
        <span
          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
            done ? "bg-emerald-500 text-white" : "border border-border text-transparent"
          }`}
        >
          ✓
        </span>
        <span className="min-w-0">
          <span className={`block text-[13px] font-medium ${done ? "text-muted line-through" : "text-ink"}`}>{label}</span>
          <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>
        </span>
      </button>
    </li>
  );
}

function Kpi({
  label, icon, iconClass, value, valueClass = "text-ink", hint,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  valueClass?: string;
  hint: string;
}) {
  return (
    <Card interactive className="flex flex-col gap-1 p-4">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${iconClass}`}>{icon}</span>
      </div>
      <span className={`text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</span>
      <span className="mt-0.5 text-[12px] text-muted">{hint}</span>
    </Card>
  );
}
