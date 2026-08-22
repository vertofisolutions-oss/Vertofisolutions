"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/ui";
import { SidebarShell } from "../../components/SidebarShell";
import { api, getAccess, getOrgId, ApiError } from "@/lib/api";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLAN_CARDS = [
  { key: "STARTER", name: "Starter", monthly: 699, original: 1499, blurb: "Solo founders & early-stage small businesses" },
  { key: "GROWTH", name: "Growth", monthly: 1999, original: 3999, blurb: "Growing companies & SMEs needing financial intelligence", popular: true },
  { key: "PRO", name: "Pro", monthly: 4999, original: 8999, blurb: "High-volume operations, enterprises & large CA firms" },
];
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BillingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [access, setAccess] = useState<{ active: boolean; plan: string | null; status: string | null } | null>(null);
  const [plan, setPlan] = useState("GROWTH");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccess()) { router.replace("/login"); return; }
    const oid = getOrgId();
    if (!oid) { router.replace("/register"); return; }
    setOrgId(oid);
    setReady(true);
    void api.access(oid).then((a) => {
      setAccess(a);
      if (a.plan) setPlan(a.plan);
    }).catch(() => setAccess(null));
  }, [router]);

  async function pay() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const sub = await api.subscribe(orgId, plan, cycle);
      const ok = await loadRazorpay();
      if (ok && window.Razorpay && sub.keyId) {
        const rzp = new window.Razorpay({
          key: sub.keyId,
          subscription_id: sub.subscriptionId,
          name: "Vertofi",
          description: `${plan} plan · ${cycle === "YEARLY" ? "annual" : "monthly"}`,
          theme: { color: "#1378F8" },
          handler: () => setNotice("Payment authorized — your plan updates as soon as Razorpay confirms (usually seconds)."),
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.open();
      } else if (sub.shortUrl) {
        window.location.href = sub.shortUrl;
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "billing_failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="p-8 text-center text-sm text-muted">Loading...</div>;

  const statusTone = access?.status === "TRIAL" ? "brand" : access?.active ? "gold" : "danger";

  return (
    <SidebarShell>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">Billing</h1>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[12px] text-muted">Current plan</p>
              <p className="text-[16px] font-semibold capitalize text-ink">{(access?.plan ?? "").toLowerCase()}</p>
            </div>
            <Badge tone={statusTone}>{access?.status ?? "Unknown"}</Badge>
          </div>
          {!access?.active && access?.status !== "TRIAL" && (
            <p className="mt-2 text-[12px] text-danger">Payment needed — pick a plan below to restore access.</p>
          )}
        </Card>

        {error && <p className="text-[12px] font-medium text-danger">{error.replaceAll("_", " ")}</p>}
        {notice && <p className="text-[12px] font-medium text-ink">{notice}</p>}

        <Card>
          <div className="mb-3 flex items-center gap-1 rounded-lg bg-bg2 p-1">
            <button onClick={() => setCycle("MONTHLY")} className={`flex-1 rounded-md px-4 py-2 text-[12px] font-semibold transition ${cycle === "MONTHLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>Monthly</button>
            <button onClick={() => setCycle("YEARLY")} className={`flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold transition ${cycle === "YEARLY" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              Annual <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">20% OFF</span>
            </button>
          </div>
          <div className="grid gap-2">
            {PLAN_CARDS.map((p) => (
              <button key={p.key} onClick={() => setPlan(p.key)} className={`flex items-center justify-between border-2 px-4 py-4 text-left transition ${plan === p.key ? "border-brand bg-brand-50" : "border-border hover:border-brand/40"}`}>
                <div>
                  <p className="text-[14px] font-semibold text-ink">
                    {p.name}
                    {p.popular && <span className="ml-2 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold text-gold">POPULAR</span>}
                    {access?.plan === p.key && <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">CURRENT</span>}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">{p.blurb}</p>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold text-ink">
                    {cycle === "MONTHLY" ? <>{inr(p.monthly)}<span className="text-[12px] font-normal text-muted">/mo</span></> : <>{inr(p.monthly * 10)}<span className="text-[12px] font-normal text-muted">/yr</span></>}
                  </p>
                  <p className="text-[12px] text-muted line-through">
                    {cycle === "MONTHLY" ? <>{inr(p.original)}/mo</> : <>{inr(p.original * 10)}/yr</>}
                  </p>
                  <p className="text-[10px] font-bold text-gold uppercase mt-0.5 tracking-wide">
                    LOCKED FOR LIFE
                  </p>
                </div>
              </button>
            ))}
          </div>
          <button onClick={pay} disabled={busy} className="mt-4 w-full rounded-lg bg-brand px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
            {busy ? "Opening secure checkout..." : "Change plan / re-authorize autopay"}
          </button>
          <p className="mt-3 text-center text-[12px] text-muted">Secured by Razorpay. Per RBI rules you get a 24-hour notice before each renewal. Cancel anytime.</p>
        </Card>
      </main>
    </SidebarShell>
  );
}
