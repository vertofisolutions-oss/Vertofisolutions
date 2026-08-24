"use client";
import { useEffect, useMemo, useState, useRef, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Receipt, Wallet, Landmark, FileText,
  Users, Package, Boxes, ShoppingCart,
  ShieldCheck, FileCheck2, Truck, CalendarClock,
  HeartPulse, Activity, AlertTriangle, TrendingDown, BarChart3,
  LifeBuoy, BadgeCheck, Archive, Handshake,
  Bot, Lightbulb, MessageCircle,
  PieChart, Scale, LineChart,
  Building2, CreditCard,
  Menu, X, Lock, ChevronLeft, ChevronRight, LogOut,
  type LucideIcon,
} from "lucide-react";
import { clearTokens, getAccess } from "@/lib/api";
import { GlobalSearch, type SearchTarget } from "./GlobalSearch";

/** Plans, ordered weakest → strongest for gating comparisons. */
type Plan = "STARTER" | "GROWTH" | "POWER" | "ENTERPRISE";
const PLAN_RANK: Record<Plan, number> = { STARTER: 0, GROWTH: 1, POWER: 2, ENTERPRISE: 3 };

type Item = {
  label: string;
  /** Real route, or undefined → routed to the generic /module/[slug] placeholder. */
  href?: string;
  icon: LucideIcon;
  /** Minimum plan required. Defaults to STARTER (always available). */
  min?: Plan;
};
type Section = { title: string; items: Item[] };

/**
 * Vertofi OS navigation. Items without a real page route to the generic
 * /module/[slug] "being activated" screen (slug derived from the label) so we
 * never ship 30 stub pages. `min` drives plan gating.
 */
const NAV: Section[] = [
  {
    title: "Home",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Accounting",
    items: [
      { label: "Bookkeeping", href: "/workspace", icon: BookOpen },
      { label: "Sales", href: "/workspace?section=sales", icon: Receipt },
      { label: "Purchases", href: "/workspace?section=purchases", icon: ShoppingCart },
      { label: "Customers", href: "/workspace?section=customers", icon: Users },
      { label: "Products", href: "/workspace?section=products", icon: Package },
      { label: "Inventory", href: "/workspace?section=inventory", icon: Boxes },
      { label: "Expenses", href: "/workspace?section=expenses", icon: Wallet },
      { label: "Bank Reconciliation", href: "/workspace?section=reconciliation", icon: Landmark },
    ],
  },
  {
    title: "GST & Compliance",
    items: [
      { label: "GST Dashboard", href: "/module/gst-dashboard", icon: ShieldCheck },
      { label: "E-Invoicing", href: "/module/e-invoicing", icon: FileCheck2 },
      { label: "E-Way Bills", href: "/module/e-way-bills", icon: Truck },
      { label: "Compliance Calendar", href: "/module/compliance-calendar", icon: CalendarClock },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      { label: "Business Health Score", href: "/module/health-score", icon: HeartPulse },
      { label: "ProfitLeak Finder", href: "/module/profitleak-finder", icon: TrendingDown },
      { label: "Predictive Tax Warnings", href: "/module/tax-warnings", icon: AlertTriangle },
      { label: "MoneyMap Live", href: "/module/moneymap-live", icon: Activity },
      { label: "Financial Black Box", href: "/module/financial-black-box", icon: Archive },
      { label: "Business Lifeguard", href: "/module/business-lifeguard", icon: LifeBuoy },
      { label: "Vendor Trust", href: "/module/vendor-trust", icon: Handshake },
      { label: "Virtual Business Director", href: "/module/virtual-business-director", icon: Bot },
      { label: "Accounting Warranty", href: "/module/accounting-warranty", icon: BadgeCheck },
      { label: "Industry Benchmarks", href: "/module/benchmarks", icon: BarChart3 },
      { label: "AI Insights", href: "/module/insights", icon: Lightbulb },
      { label: "WhatsApp CFO", href: "/module/whatsapp-cfo", icon: MessageCircle },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Reports Center", href: "/workspace?section=reports", icon: PieChart },
      { label: "Balance Sheet", href: "/module/balance-sheet", icon: Scale },
      { label: "Cashflow", href: "/module/cashflow", icon: LineChart },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Business Profile", href: "/module/business-profile", icon: Building2 },
      { label: "Billing", href: "/subscribe", icon: CreditCard },
    ],
  },
];

const slugify = (label: string) =>
  // "&" → "-and-" so "P&L" → "p-and-l" (must match the module registry keys).
  label.toLowerCase().replace(/&/g, "-and-").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Decode the `plan` claim from the JWT in localStorage. Defaults to STARTER. */
function readPlan(): Plan {
  try {
    const token = getAccess();
    if (!token) return "STARTER";
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { plan?: string };
    const p = String(payload.plan ?? "").toUpperCase();
    return (p in PLAN_RANK ? p : "STARTER") as Plan;
  } catch {
    return "STARTER";
  }
}

const COLLAPSE_KEY = "vertofi.sidebar.collapsed";

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<Plan>("STARTER");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPlan(readPlan());
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    // Prefetch high-frequency routes for instant navigation
    router.prefetch("/dashboard");
    router.prefetch("/workspace");
    router.prefetch("/workspace?section=sales");
    router.prefetch("/workspace?section=purchases");
    router.prefetch("/workspace?section=customers");
    router.prefetch("/workspace?section=products");
    router.prefetch("/workspace?section=inventory");
    router.prefetch("/workspace?section=expenses");
  }, [router]);

  // Restore sidebar scroll position on navigation
  useEffect(() => {
    const saved = sessionStorage.getItem("vertofi.sidebar.scroll");
    if (saved && navRef.current) {
      const top = parseInt(saved, 10);
      navRef.current.scrollTop = top;
      // also ensure after any microtasks it remains at exact position
      requestAnimationFrame(() => {
        if (navRef.current) navRef.current.scrollTop = top;
      });
    }
  }, [pathname, searchParams]);

  // Close the mobile drawer on navigation.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function logout() {
    clearTokens();
    router.push("/login");
  }

  const planRank = PLAN_RANK[plan];

  const nav = useMemo(
    () =>
      NAV.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          const locked = item.min ? PLAN_RANK[item.min] > planRank : false;
          const href = locked ? undefined : item.href ?? `/module/${slugify(item.label)}`;
          return { ...item, locked, resolvedHref: href };
        }),
      })),
    [planRank],
  );

  function isActive(href?: string) {
    if (!href) return false;
    const [path, query] = href.split("?");
    
    if (pathname !== path) return false;

    if (query) {
      const params = new URLSearchParams(query);
      for (const [key, val] of Array.from(params.entries())) {
        if (searchParams.get(key) !== val) return false;
      }
      return true;
    }

    // Default match for /workspace without params
    if (path === "/workspace") {
      const section = searchParams.get("section");
      return !section || section === "overview" || section === "bookkeeping";
    }

    return true;
  }

  const searchTargets: SearchTarget[] = nav.flatMap((section) =>
    section.items.map((item) => ({
      label: item.label,
      href: item.resolvedHref,
      section: section.title,
      locked: item.locked,
    })),
  );

  const sidebarBody = (
    <nav
      ref={navRef}
      onScroll={(e) => {
        sessionStorage.setItem("vertofi.sidebar.scroll", String(e.currentTarget.scrollTop));
      }}
      className="flex-1 overflow-y-auto px-3 py-4"
    >
      {!collapsed && <div className="mb-3 px-1"><GlobalSearch targets={searchTargets} /></div>}
      {nav.map((section) => (
        <div key={section.title} className="mb-4">
          {!collapsed && (
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/70">
              {section.title}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.resolvedHref);

              if (item.locked || !item.resolvedHref) {
                return (
                  <button
                    key={`${section.title}-${item.label}`}
                    type="button"
                    disabled
                    title="Upgrade to unlock"
                    className={[
                      "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition cursor-not-allowed text-muted/60",
                      collapsed ? "justify-center" : "",
                    ].join(" ")}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 text-muted/50" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted/50" />
                      </>
                    )}
                  </button>
                );
              }

              return (
                <Link
                  key={`${section.title}-${item.label}`}
                  href={item.resolvedHref}
                  prefetch={true}
                  onClick={() => {
                    if (navRef.current) {
                      sessionStorage.setItem("vertofi.sidebar.scroll", String(navRef.current.scrollTop));
                    }
                    setMobileOpen(false);
                  }}
                  title={collapsed ? item.label : item.label}
                  className={[
                    "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition",
                    collapsed ? "justify-center" : "",
                    active
                      ? "bg-brand text-white font-semibold"
                      : "text-[#334155] hover:bg-bg2 hover:text-ink",
                  ].join(" ")}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-muted group-hover:text-ink"}`} />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg2">
      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <a href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="Vertofi" width={26} height={26} className="rounded-lg object-contain" />
          <span className="text-[15px] font-bold tracking-tight text-ink">Vertofi</span>
        </a>
        <button
          className="rounded-lg p-2 text-muted transition hover:bg-bg2"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* ── Desktop sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-white lg:flex ${collapsed ? "w-[68px]" : "w-60"} transition-[width] duration-200`}
      >
        <div className={`flex items-center gap-2 border-b border-border px-4 py-4 ${collapsed ? "justify-center px-2" : ""}`}>
          <Image src="/logo.jpg" alt="Vertofi" width={28} height={28} className="rounded-lg object-contain" />
          {!collapsed && <span className="text-[15px] font-bold tracking-tight text-ink">Vertofi</span>}
        </div>
        {sidebarBody}
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-danger transition hover:bg-[#FDECEC] ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button
            type="button"
            onClick={toggleCollapse}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted transition hover:bg-bg2 hover:text-ink ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronRight className="h-[18px] w-[18px]" /> : <><ChevronLeft className="h-[18px] w-[18px]" /> <span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* ── Mobile slide-in drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <span className="flex items-center gap-2">
                <Image src="/logo.jpg" alt="Vertofi" width={26} height={26} className="rounded-lg object-contain" />
                <span className="text-[15px] font-bold tracking-tight text-ink">Vertofi</span>
              </span>
              <button className="rounded-lg p-2 text-muted transition hover:bg-bg2" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarBody}
            <div className="border-t border-border p-3">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-danger transition hover:bg-[#FDECEC]"
              >
                <LogOut className="h-[18px] w-[18px]" /> <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className={`${collapsed ? "lg:pl-[68px]" : "lg:pl-60"} transition-[padding] duration-200`}>
        {children}
      </div>
    </div>
  );
}
