"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, TrendingDown, AlertTriangle, Activity, Archive, LifeBuoy, Bot, Handshake, ArrowRight } from "lucide-react";
import { Card } from "@/ui";
import { api } from "@/lib/api";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const arr = (v: unknown) => (Array.isArray(v) ? v.length : null);

type Def = { key: string; title: string; slug: string; icon: typeof HeartPulse; tone?: "gold" | "danger"; load?: (o: string) => Promise<unknown>; headline: (d: unknown) => string };

const PRODUCTS: Def[] = [
  { key: "bhs", title: "Business Health Score", slug: "health-score", icon: HeartPulse, tone: "gold",
    load: (o) => api.bhs(o), headline: (d) => { const b = d as { score: number | null; rating?: string }; return b?.score != null ? `Score ${b.score} · ${b.rating ?? ""}` : "Not enough data yet"; } },
  { key: "leak", title: "Profit Leak Finder", slug: "profitleak-finder", icon: TrendingDown,
    load: (o) => api.mod.profitLeaks(o), headline: (d) => { const n = arr((d as Record<string, unknown>)?.leaks); return n ? `${n} leak${n === 1 ? "" : "s"} found` : "No leaks detected"; } },
  { key: "tax", title: "Predictive Tax Warnings", slug: "tax-warnings", icon: AlertTriangle, tone: "danger",
    load: (o) => api.mod.taxWarning(o), headline: (d) => { const n = arr((d as Record<string, unknown>)?.warnings); return n ? `${n} upcoming` : "No warnings"; } },
  { key: "money", title: "Money Map Live", slug: "moneymap-live", icon: Activity,
    load: (o) => api.moneyMap(o), headline: (d) => { const m = d as { inflow?: number; outflow?: number; hasData?: boolean }; return m?.hasData ? `In ${inr(m.inflow ?? 0)} · Out ${inr(m.outflow ?? 0)}` : "Connect data to map your money"; } },
  { key: "blackbox", title: "Financial Black Box", slug: "financial-black-box", icon: Archive,
    load: () => api.mod.auditVerify(), headline: (d) => { const v = d as { intact?: boolean; checked?: number }; return v?.intact ? `Chain intact · ${v.checked ?? 0} entries` : "Integrity check pending"; } },
  { key: "lifeguard", title: "Business Lifeguard", slug: "business-lifeguard", icon: LifeBuoy,
    load: (o) => api.mod.lifeguard(o), headline: (d) => { const n = arr(d); return n ? `${n} incident${n === 1 ? "" : "s"}` : "0 incidents · all clear"; } },
  { key: "vendor", title: "Vendor Trust", slug: "vendor-trust", icon: Handshake, headline: () => "Score your vendors" },
  { key: "vbd", title: "Virtual Business Director", slug: "virtual-business-director", icon: Bot, headline: () => "Ask your AI CFO anything" },
];

function ProductCard({ orgId, def }: { orgId: string; def: Def }) {
  const router = useRouter();
  const [line, setLine] = useState<string>("Loading…");
  useEffect(() => {
    if (!def.load) { setLine(def.headline(null)); return; }
    def.load(orgId).then((d) => setLine(def.headline(d))).catch(() => setLine(def.headline(null)));
  }, [orgId, def]);
  const Icon = def.icon;
  return (
    <button onClick={() => router.push(`/module/${def.slug}`)} className="text-left">
      <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft">
        <div className="flex items-center justify-between">
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${def.tone === "gold" ? "bg-amber-50 text-gold" : def.tone === "danger" ? "bg-danger/5 text-danger" : "bg-brand-50 text-brand"}`}><Icon className="h-4 w-4" /></span>
          <ArrowRight className="h-4 w-4 text-muted" />
        </div>
        <h3 className="mt-3 text-[14px] font-semibold text-ink">{def.title}</h3>
        <p className="mt-0.5 text-[12px] text-muted">{line}</p>
      </Card>
    </button>
  );
}

/** AI Intelligence hub — every Vertofi product with a live headline + deep link. */
export function IntelligenceHub({ orgId }: { orgId: string }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted">Your financial intelligence layer — predictive, protective and always on. Tap any product to dive in.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => <ProductCard key={p.key} orgId={orgId} def={p} />)}
      </div>
    </div>
  );
}
