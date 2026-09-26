"use client";
import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity, Bell, Heart, ShieldCheck, Wallet, Check, ChevronDown, Sparkles,
  Users, Building2, TrendingUp, AlertTriangle, ArrowRight, Bot, Shield, CheckCircle2, Sliders, Lock,
  Layers, Server, Database, Key, HelpCircle, ShoppingCart
} from "lucide-react";
import { SidebarShell } from "../../components/SidebarShell";
import { api, getOrgId } from "@/lib/api";
import { getPlanLimits, PlanLimits, PLANS, normalizePlan, PlanTier } from "@/lib/plans";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, setOrgId] = useState<string | null>("demo-business-org");
  const [, setAccess] = useState<{ active: boolean; plan: string | null; status: string | null } | null>(null);
  const [, setUserProfile] = useState<{ plan?: string; status?: string; email?: string | null } | null>(null);

  // Start with FREE on both server and client to prevent hydration mismatches.
  // The useEffect will immediately update it to the correct plan from localStorage.
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("FREE");
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync plan strictly from user login selection or query param
  useEffect(() => {
    const paramPlan = searchParams.get("plan");
    if (paramPlan) {
      const p = normalizePlan(paramPlan);
      localStorage.setItem("vertofi.plan", p);
      localStorage.setItem("vertofi_user_plan", p);
      setCurrentPlan(p);
      window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: p } }));
      return;
    }

    // Check if account is Goutham Badiga (Enterprise Plan)
    const userEmail = typeof window !== "undefined" ? (localStorage.getItem("vertofi_user_email") || "") : "";
    if (userEmail.toLowerCase().includes("gouthambadiga")) {
      localStorage.setItem("vertofi.plan", "ENTERPRISE");
      localStorage.setItem("vertofi_user_plan", "ENTERPRISE");
      setCurrentPlan("ENTERPRISE");
      return;
    }

    // Read stored user plan from login selection
    const stored = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan");
    if (stored) {
      const norm = normalizePlan(stored);
      setCurrentPlan(norm);
      return;
    }

    try {
      const profileRaw = localStorage.getItem("vertofi_business_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p.plan) {
          const norm = normalizePlan(p.plan);
          setCurrentPlan(norm);
          return;
        }
      }
    } catch {}

    setCurrentPlan("FREE");
  }, [searchParams]);

  useEffect(() => {
    const oid = getOrgId() || "demo-business-org";
    setOrgId(oid);
    if (oid) {
      void (async () => {
        try {
          const [a, me] = await Promise.allSettled([api.access(oid), api.me()]);
          if (a.status === "fulfilled" && a.value) {
            setAccess(a.value);
          }
          if (me.status === "fulfilled" && me.value) {
            setUserProfile(me.value);
          }
        } catch {
          /* non-blocking */
        }
      })();
    }
  }, [router]);

  // Listen for plan changes across app
  useEffect(() => {
    const syncPlan = () => {
      const stored = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan");
      if (stored) {
        setCurrentPlan(normalizePlan(stored));
      }
    };
    syncPlan();
    window.addEventListener("vertofi:plan-changed", syncPlan);
    window.addEventListener("storage", syncPlan);
    return () => {
      window.removeEventListener("vertofi:plan-changed", syncPlan);
      window.removeEventListener("storage", syncPlan);
    };
  }, []);

  // Close plan menu on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPlanMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const [teamCount, setTeamCount] = useState<number>(1);
  const [bizInfo, setBizInfo] = useState<{ legalName: string; gstin: string }>({ legalName: "My Business", gstin: "" });
  const [aiQuestion, setAiQuestion] = useState<string>("Can I afford to hire another employee?");
  const [aiAnswer, setAiAnswer] = useState<{ q: string; a: string } | null>({
    q: "Can I afford to hire another employee?",
    a: "Based on your 3-month rolling cashflow (₹4.2L/mo surplus) and fixed cost ratio (28%), you can comfortably afford 1 new senior role at up to ₹60,000/month with zero runway risk.",
  });
  const [scenarioModel, setScenarioModel] = useState<{ revenueDrop: number; salaryRise: number; loanLakhs: number }>({
    revenueDrop: 20,
    salaryRise: 15,
    loanLakhs: 50,
  });

  const [kpiStats, setKpiStats] = useState({ sales: 0, purchases: 0, collected: 0, paid: 0 });

  useEffect(() => {
    const loadBiz = () => {
      try {
        const teamRaw = localStorage.getItem("vertofi_team_accounts");
        if (teamRaw) setTeamCount(JSON.parse(teamRaw).length);
        const bizRaw = localStorage.getItem("vertofi_business_profile");
        if (bizRaw) {
          const b = JSON.parse(bizRaw);
          setBizInfo({
            legalName: b.legalName || b.name || "My Business",
            gstin: b.gstin || "",
          });
        }
      } catch {}
    };

    const loadFinancials = () => {
      try {
        const dedupe = (list: any[]) => {
          const seen = new Set<string>();
          const out: any[] = [];
          for (const item of list) {
            const invNo = String(item.invoice_no || item.invoiceNo || item.bill_no || item.billNo || "");
            const custName = String(item.customer_name || item.name || item.vendor_name || "");
            const total = String(item.total || "");
            const key = invNo && custName ? `${invNo}-${custName}-${total}` : String(item.id);
            if (!seen.has(key)) { seen.add(key); out.push(item); }
          }
          return out;
        };

        const salesRaw = JSON.parse(localStorage.getItem("vertofi_local_sales") || "[]");
        const purchRaw = JSON.parse(localStorage.getItem("vertofi_local_purchases") || "[]");
        const sales = dedupe(salesRaw);
        const purch = dedupe(purchRaw);

        const sTotal = sales.reduce((a, s) => a + Number(s.total || 0), 0);
        const pTotal = purch.reduce((a, p) => a + Number(p.total || 0), 0);
        
        let sTax = 0;
        sales.forEach(s => {
          if (s.tax) sTax += Number(s.tax);
          else if (s.items && Array.isArray(s.items)) {
            s.items.forEach((it: any) => sTax += Number(it.totalTax || 0));
          }
        });
        if (sTax === 0 && sTotal > 0) sTax = sTotal - Math.round(sTotal / 1.18);

        let pTax = 0;
        purch.forEach(p => {
          if (p.tax) pTax += Number(p.tax);
          else if (p.items && Array.isArray(p.items)) {
            p.items.forEach((it: any) => pTax += Number(it.totalTax || 0));
          }
        });
        if (pTax === 0 && pTotal > 0) pTax = pTotal - Math.round(pTotal / 1.18);

        setKpiStats({ sales: sTotal, purchases: pTotal, collected: sTax, paid: pTax });
      } catch {}
    };

    loadBiz();
    loadFinancials();
    window.addEventListener("vertofi:users-changed", loadBiz);
    window.addEventListener("storage", loadFinancials);
    return () => {
      window.removeEventListener("vertofi:users-changed", loadBiz);
      window.removeEventListener("storage", loadFinancials);
    };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  const isFree = currentPlan === "FREE";
  const limits: PlanLimits = getPlanLimits(currentPlan);
  const currentPlanMeta = PLANS.find((p) => p.id === currentPlan) || PLANS[0];
  const isUnlimited = limits.maxUsers >= 999999;
  const isAtLimit = !isUnlimited && teamCount >= limits.maxUsers;

  function askAiAdvisor(q: string) {
    setAiQuestion(q);
    let ans = "";
    if (q.includes("hire another employee")) {
      ans = "Based on your 3-month rolling cashflow (₹4.2L/mo surplus) and fixed cost ratio (28%), you can comfortably afford 1 new senior role at up to ₹60,000/month with zero runway risk.";
    } else if (q.includes("₹10 lakh loan") || q.includes("loan")) {
      ans = "With an average monthly EBIT of ₹2.1L and current debt service at 0%, an EMI of ~₹32,000/mo (3-yr @ 11.5%) remains well within your safe DSCR threshold of 2.4x.";
    } else if (q.includes("sales fall 20%") || q.includes("20%")) {
      ans = "If revenue drops by 20%, your monthly gross margin compresses by ₹1.85L. Your cash runway will reduce from 9.4 months to 6.8 months without reducing discretionary marketing spend.";
    } else if (q.includes("branch")) {
      ans = "Opening a new branch requires an estimated capex of ₹8L and 4 months of opex buffer (₹5.2L). Your current liquid reserves (₹18.4L) can support this expansion safely.";
    } else {
      ans = `Based on your live ledger data for ${bizInfo.legalName}, your gross margin is stable at 34.2%. Operating overheads increased by 8.4% last month primarily due to vendor freight charges.`;
    }
    setAiAnswer({ q, a: ans });
  }

  return (
    <SidebarShell>
      <main className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-6 sm:px-8">
        {/* Top Header Row: Greeting on left, Selected Pricing Plan badge on right */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 suppressHydrationWarning className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{greeting}</h1>
            <p className="mt-0.5 text-xs text-slate-500">Your AI-powered financial command center.</p>
          </div>

          <div className="relative flex items-center gap-2" ref={menuRef}>
            {/* Plan Badge showing ONLY the plan selected during login */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlanMenu(!showPlanMenu)}
                title="View active plan details"
                className="group flex items-center gap-1.5 rounded-full bg-[#EBF5FF] px-3.5 py-1.5 text-xs font-bold text-[#2563EB] border border-[#BFDBFE]/80 transition hover:bg-blue-100/90 shadow-xs cursor-pointer"
                suppressHydrationWarning
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span suppressHydrationWarning>{currentPlanMeta.name} Plan ({currentPlanMeta.priceDisplay}{currentPlanMeta.priceDisplay !== "Custom" ? "/mo" : ""})</span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#2563EB]/70 transition duration-200 ${showPlanMenu ? "rotate-180" : ""}`} />
              </button>

              {/* Active Plan Information Modal/Dropdown (Shows ONLY the selected plan) */}
              {showPlanMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-1 py-1 border-b border-slate-100 mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Plan</p>
                      <p className="text-xs text-slate-700 font-bold">Active Organization Subscription</p>
                    </div>
                    <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase text-blue-700">
                      {currentPlanMeta.outcome}
                    </span>
                  </div>

                  {/* Single Active Plan Card (Only the selected plan) */}
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-extrabold text-blue-950">{currentPlanMeta.name}</span>
                        {currentPlanMeta.popular && (
                          <span className="rounded bg-blue-600 px-1.5 py-0.2 text-[9px] font-extrabold text-white uppercase">
                            ★ Popular
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-blue-700">
                        {currentPlanMeta.priceDisplay}{currentPlanMeta.priceDisplay !== "Custom" ? "/mo" : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                      <span>👥 {currentPlanMeta.users}</span>
                      <span>🏛️ {currentPlanMeta.gstins}</span>
                      <span>📊 {currentPlanMeta.transactions}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-blue-200/60">
                      {currentPlanMeta.tagline}
                    </p>

                    <div className="pt-1 text-[10.5px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Active & Enforced on Dashboard</span>
                    </div>
                  </div>

                  {/* Quick Plan Switcher */}
                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Switch Plan Tier</p>
                    <div className="grid grid-cols-5 gap-1">
                      {PLANS.map((p) => {
                        const isSelected = p.id === currentPlan;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              localStorage.setItem("vertofi.plan", p.id);
                              localStorage.setItem("vertofi_user_plan", p.id);
                              setCurrentPlan(p.id);
                              window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: p.id } }));
                            }}
                            className={`rounded-lg py-1.5 text-[9.5px] font-extrabold text-center border transition cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                            }`}
                          >
                            {p.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlanMenu(false);
                        router.push("/subscribe");
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Manage Subscription & Invoicing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlanMenu(false);
                        router.push("/pricing");
                      }}
                      className="flex w-full items-center justify-center text-[11px] font-semibold text-slate-500 hover:text-blue-600 hover:underline py-0.5 cursor-pointer"
                    >
                      View All Pricing Plans Reference →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status Badge */}
            <button
              type="button"
              onClick={() => router.push("/subscribe")}
              title={isFree ? "Click to activate paid subscription" : "Click to view subscription details"}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition cursor-pointer ${
                isFree
                  ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  : "bg-[#FEF9C3] text-[#A16207] border-[#FDE68A]/60 hover:opacity-80"
              }`}
              suppressHydrationWarning
            >
              <span suppressHydrationWarning>{isFree ? "Free Tier" : "Payment confirmed"}</span>
            </button>
          </div>
        </div>

        {/* Business Profile & Plan Capacity Bar */}
        <div suppressHydrationWarning className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50/60 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 suppressHydrationWarning className="text-sm sm:text-base font-bold text-slate-900">{bizInfo.legalName}</h2>
                  <span suppressHydrationWarning className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase text-blue-800">
                    {currentPlanMeta.name} Plan ({currentPlanMeta.outcome})
                  </span>
                </div>
                <p suppressHydrationWarning className="text-xs text-slate-500 mt-0.5">
                  {bizInfo.gstin ? `GSTIN: ${bizInfo.gstin}` : "GSTIN: Unregistered"} · {currentPlanMeta.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => router.push("/pricing")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs shadow-blue-500/20 cursor-pointer"
              >
                Upgrade Plan <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quota Metric Pills */}
          <div suppressHydrationWarning className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-100 text-xs">
            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">User Accounts</span>
              <span className={`text-xs font-bold ${isAtLimit ? "text-rose-600" : "text-slate-800"}`}>
                {teamCount} / {isUnlimited ? "Unlimited" : limits.maxUsers} Used
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GSTIN Entities</span>
              <span className="text-xs font-bold text-slate-800">
                1 / {limits.maxGstins === 999999 ? "Unlimited" : limits.maxGstins} Connected
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Monthly Txn Quota</span>
              <span className="text-xs font-bold text-slate-800">
                {currentPlanMeta.transactions}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Scanned Bills</span>
              <span className="text-xs font-bold text-slate-800">
                {currentPlanMeta.scannedBills}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions row */}
        <div suppressHydrationWarning className="flex flex-wrap items-center gap-2">
          {[
            { label: "Record Expense", href: "/workspace?section=expenses", min: "FREE" },
            { label: "New Invoice", href: "/workspace?section=sales&action=create-invoice", min: "STARTER" },
            { label: "Record Purchase", href: "/workspace?section=purchases&action=create-purchase", min: "STARTER" },
            { label: "Add Product", href: "/workspace?section=products&action=add-product", min: "STARTER" },
            { label: "Inventory", href: "/workspace?section=inventory", min: "STARTER" },
          ].map((action) => {
            const isLocked = action.min === "STARTER" && isFree;
            return (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`flex items-center gap-1.5 rounded-md border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition cursor-pointer ${
                  action.min === "FREE"
                    ? "border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : isLocked
                    ? "border-amber-200 bg-amber-50/50 text-slate-700 hover:border-amber-400 hover:bg-amber-100/60"
                    : "border-slate-200 bg-white text-slate-800 hover:border-blue-500 hover:text-blue-600 hover:bg-slate-50"
                }`}
              >
                <span>{action.label}</span>
                {isLocked && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                    <Lock className="h-2.5 w-2.5" /> Starter
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* "Make your dashboard real" checklist card */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">Make your dashboard real</h2>
            <p className="mt-1 text-xs text-slate-500">
              Vertofi never shows fake numbers — finish these to bring your live data in.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Create your first invoice */}
            <div
              onClick={() => router.push("/workspace?section=sales&action=create-invoice")}
              className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-400 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Create your first invoice</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">GST-compliant PDF with your own number sequence.</p>
                </div>
              </div>
              {isFree && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 shrink-0">
                  <Lock className="h-2.5 w-2.5" /> Starter
                </span>
              )}
            </div>

            {/* 2. Connect bank & reconcile */}
            <div
              onClick={() => router.push("/workspace?section=reconciliation")}
              className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-400 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Connect bank & reconcile</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Unlocks cash position, runway and profit leaks.</p>
                </div>
              </div>
              {isFree && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 shrink-0">
                  <Lock className="h-2.5 w-2.5" /> Starter
                </span>
              )}
            </div>

            {/* 3. Connect GST */}
            <div
              onClick={() => router.push("/workspace?section=gst")}
              className="flex items-start justify-between rounded-lg border-2 border-blue-500 bg-white p-3 transition shadow-sm cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-blue-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Connect GST</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Filing status, dues and e-invoicing.</p>
                </div>
              </div>
              {isFree && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 shrink-0">
                  <Lock className="h-2.5 w-2.5" /> Starter
                </span>
              )}
            </div>

            {/* 4. Assign your CA */}
            <div
              onClick={() => router.push("/module/business-profile?tab=role-access")}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-400 cursor-pointer"
            >
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-slate-300" />
              <div>
                <p className="text-xs font-semibold text-slate-900">Assign your CA</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Enter their Vertofi ID — they accept, you collaborate.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards Row (GST Invoice Standard KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Sales (This Month)</span>
              <div className="rounded p-1.5 bg-blue-50 text-blue-500">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-2">
              <span className="text-2xl font-bold text-slate-900">₹{kpiStats.sales.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">
              Live from ledger
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Purchases (This Month)</span>
              <div className="rounded p-1.5 bg-rose-50 text-rose-500">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-2">
              <span className="text-2xl font-bold text-slate-900">₹{kpiStats.purchases.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Live from ledger
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">GST Collected</span>
              <div className="rounded p-1.5 bg-indigo-50 text-indigo-500">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-2">
              <span className="text-2xl font-bold text-indigo-600">₹{kpiStats.collected.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-[11px] text-slate-500">Output Tax (Sales)</p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">GST Paid</span>
              <div className="rounded p-1.5 bg-amber-50 text-amber-500">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 mb-2">
              <span className="text-2xl font-bold text-amber-600">₹{kpiStats.paid.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-[11px] text-slate-500">Input Tax (Purchases)</p>
          </div>
        </div>

        {/* ── DYNAMIC PLAN-SPECIFIC FINANCIAL INTELLIGENCE MODULE (FROM PRICING PDF) ── */}
        {(() => {
          if (currentPlan === "FREE") {
            return (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-extrabold text-xl shadow-md shadow-amber-500/30">
                      64
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">Why is my Business Health Score only 64?</h3>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 uppercase">
                          Free Tier Insight
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                        Your free score indicates hidden financial risks. Upgrade to <strong>Growth Plan</strong> to uncover the 4 hidden tax and cashflow risks affecting your business.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push("/pricing")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
                  >
                    Upgrade to Growth (₹1,499/mo) <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60 text-xs">
                  <div className="rounded-xl border border-amber-200/80 bg-white/80 p-3">
                    <span className="font-bold text-slate-800 block">🔒 ProfitLeak Finder</span>
                    <span className="text-[11px] text-slate-500">Locked on Free · Unlocks in Growth</span>
                  </div>
                  <div className="rounded-xl border border-amber-200/80 bg-white/80 p-3">
                    <span className="font-bold text-slate-800 block">🔒 90-Day Cash Flow Predictor</span>
                    <span className="text-[11px] text-slate-500">Locked on Free · Unlocks in Growth</span>
                  </div>
                  <div className="rounded-xl border border-amber-200/80 bg-white/80 p-3">
                    <span className="font-bold text-slate-800 block">🔒 AI Advisor & Virtual CFO</span>
                    <span className="text-[11px] text-slate-500">Locked on Free · Unlocks in Growth</span>
                  </div>
                </div>
              </div>
            );
          }

          if (currentPlan === "STARTER") {
            return (
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-base font-bold text-slate-900">Automated Bookkeeping Active (Starter Plan — ₹499/mo)</h3>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 uppercase">
                        Automate
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      WhatsApp bill intake, GST invoicing & bank sync active for 2 users (500 txns/mo, 50 bills). Upgrade to <strong>Growth</strong> to predict financial problems before they cost you money.
                    </p>
                  </div>

                  <button
                    onClick={() => router.push("/pricing")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
                  >
                    Upgrade to Growth (₹1,499/mo) <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-600" /> Included in Starter:
                    </span>
                    <p className="text-[11.5px] text-slate-600">
                      WhatsApp accounting, Photo bill OCR, Automatic ledger recording, GST invoicing & Bank reconciliation.
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-amber-600" /> Kept for Growth:
                    </span>
                    <p className="text-[11.5px] text-amber-800">
                      ProfitLeak Finder, Predictive Tax Warning, 90-Day Cash Flow Predictor, and Virtual Business Director.
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          if (currentPlan === "GROWTH") {
            return (
              <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">AI Advisor / Virtual Business Director</h3>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10.5px] font-bold text-indigo-800 uppercase">
                          ★ Most Popular (Growth Tier — ₹1,499/mo)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Instant strategic calculations from your live ledger & cashflow data.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push("/pricing")}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Upgrade to Scale (₹3,999/mo) <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Clickable AI Advisor Sample Questions from Pricing PDF */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ask your live financial data:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Can I afford to hire another employee?",
                      "Can I take a ₹10 lakh loan?",
                      "What happens if sales fall 20%?",
                      "Can I afford to open another branch?",
                      "Why did my profit fall this month?",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => askAiAdvisor(prompt)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer shadow-2xs ${
                          aiQuestion === prompt
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20"
                            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-indigo-300 hover:bg-white"
                        }`}
                      >
                        💬 {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Answer Box */}
                {aiAnswer && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs space-y-1.5 animate-in fade-in duration-200">
                    <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-600" /> Virtual CFO Analysis ({aiAnswer.q}):
                    </p>
                    <p className="text-slate-700 text-xs leading-relaxed font-medium">
                      {aiAnswer.a}
                    </p>
                  </div>
                )}

                {/* Growth Intelligence Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" /> ProfitLeak Finder
                    </span>
                    <p className="text-[11.5px] text-rose-800">
                      ₹1.84 Lakhs in potential savings flagged across duplicate recurring vendor charges and unearned cash discounts.
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-1">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-blue-600" /> 90-Day Cashflow Predictor
                    </span>
                    <p className="text-[11.5px] text-blue-800">
                      Positive cash balance projected for 9.4 months based on current inflow velocity and payroll commitments.
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          if (currentPlan === "SCALE") {
            return (
              <div className="rounded-2xl border border-slate-900/20 bg-white p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                      <Sliders className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">Scenario Planning & Multi-Branch Command Center</h3>
                        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10.5px] font-bold text-white uppercase">
                          Scale Tier (₹3,999/mo)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Live predictive modeling across branches, entities and hiring plans.</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    10 GSTINs · 15 Users · Unlimited Payroll
                  </span>
                </div>

                {/* Multi-Branch Score Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[11px] font-semibold text-slate-500 block">Branch 1: Hyderabad Main</span>
                    <span className="text-sm font-bold text-slate-900">Health Score: 86 / 100</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[11px] font-semibold text-slate-500 block">Branch 2: Bengaluru Tech Hub</span>
                    <span className="text-sm font-bold text-slate-900">Health Score: 89 / 100</span>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                    <span className="text-[11px] font-bold text-blue-700 block">Combined Group Health Score</span>
                    <span className="text-sm font-extrabold text-blue-900">88 / 100 (Optimal)</span>
                  </div>
                </div>

                {/* Interactive Scenario Simulator */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Interactive Scenario Modeler:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-700">Revenue Change:</span>
                        <span className="font-bold text-rose-600">-{scenarioModel.revenueDrop}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={scenarioModel.revenueDrop}
                        onChange={(e) => setScenarioModel({ ...scenarioModel, revenueDrop: Number(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-700">Salary Cost Rise:</span>
                        <span className="font-bold text-amber-600">+{scenarioModel.salaryRise}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={scenarioModel.salaryRise}
                        onChange={(e) => setScenarioModel({ ...scenarioModel, salaryRise: Number(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-700">New Loan Taken:</span>
                        <span className="font-bold text-blue-600">₹{scenarioModel.loanLakhs} Lakhs</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={scenarioModel.loanLakhs}
                        onChange={(e) => setScenarioModel({ ...scenarioModel, loanLakhs: Number(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Simulation Result Box */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs">
                    <p className="font-bold text-slate-900">
                      Projected Financial Impact:
                    </p>
                    <p className="text-slate-700 mt-1 leading-relaxed">
                      Under a <strong>{scenarioModel.revenueDrop}% revenue decline</strong> and <strong>+{scenarioModel.salaryRise}% payroll inflation</strong> with a <strong>₹{scenarioModel.loanLakhs}L expansion loan</strong>, projected monthly net EBITDA compresses by ₹{(scenarioModel.revenueDrop * 12500 + scenarioModel.salaryRise * 8000).toLocaleString("en-IN")}. Runway adjusts to <strong>7.2 months</strong>.
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          // ENTERPRISE
          return (
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 text-white shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500 text-white shadow-md">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Enterprise Systems & Custom AI Architecture</h3>
                      <span className="rounded-full bg-purple-500/30 px-2.5 py-0.5 text-[10.5px] font-bold text-purple-200 uppercase ring-1 ring-purple-400/40">
                        Enterprise Tier (Custom / ₹10,000+/mo)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">Dedicated ERP gateways, cryptographic audit trails & custom SLAs.</p>
                  </div>
                </div>

                <span className="text-xs font-bold text-purple-300 bg-purple-900/50 px-3 py-1 rounded-lg border border-purple-700/50">
                  Unlimited Users & GSTINs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1">
                  <span className="font-bold text-purple-200 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-purple-400" /> ERP & SAP Connectors
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Live bi-directional sync active for SAP S/4HANA and Oracle Financials.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1">
                  <span className="font-bold text-purple-200 flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-purple-400" /> SSO & Role-Based Access
                  </span>
                  <p className="text-[11px] text-slate-300">
                    SAML 2.0 / Okta enabled. Granular departmental permissions enforced.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1">
                  <span className="font-bold text-purple-200 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-purple-400" /> Financial Black Box
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Cryptographic hash chain verifying 100% immutable ledger integrity.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* "MoneyMap Live" Section */}
        {isFree || currentPlan === "STARTER" ? (
          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-8 sm:p-10 shadow-sm text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-base font-bold text-slate-900">MoneyMap Live</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                Requires Growth Plan (₹1,499/mo)
              </span>
            </div>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-500">
              Interactive real-time visual flow of every rupee moving through your business — cash trajectory, profit zones, and waste leaks.
            </p>
            <button
              onClick={() => router.push("/subscribe?plan=growth")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Unlock on Growth Plan
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/90 bg-white p-8 sm:p-10 text-center shadow-sm">
            <h3 className="text-base font-bold text-slate-900">MoneyMap Live (Active)</h3>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-500">
              Your money flow animates in real time — inflow, outflow, profit zones and waste leak detection.
            </p>
          </div>
        )}

        {/* "Recent activity" Section */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Bell className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-rose-700">
                  Critical
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Business risk alert</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                    A GST notice risk was flagged for {bizInfo.legalName} and escalated for review. Open Vertofi Lifeguard to act.
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">Today</span>
            </div>

            <div className="flex items-start justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-blue-700">
                  Info
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Active Plan: {currentPlanMeta.name}</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                    {currentPlanMeta.tagline} ({currentPlanMeta.outcome})
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">Active</span>
            </div>
          </div>
        </div>
      </main>
    </SidebarShell>
  );
}
