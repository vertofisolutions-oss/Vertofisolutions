"use client";
import { useEffect, useMemo, useState, useRef, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Receipt, Wallet, Landmark, FileText,
  Users, Package, Boxes, ShoppingCart, Plus, LayoutTemplate,
  ShieldCheck, FileCheck2, Truck, CalendarClock,
  HeartPulse, Activity, AlertTriangle, TrendingDown, BarChart3,
  LifeBuoy, BadgeCheck, Archive, Handshake,
  Bot, Lightbulb, MessageCircle,
  PieChart, Scale, LineChart,
  Building2, CreditCard, User,
  Menu, X, Lock, ChevronLeft, ChevronRight, LogOut,
  type LucideIcon,
} from "lucide-react";
import { clearTokens, getAccess } from "@/lib/api";
import { GlobalSearch, type SearchTarget } from "./GlobalSearch";

/** Plans, ordered weakest → strongest for gating comparisons. */
type Plan = "FREE" | "STARTER" | "GROWTH" | "SCALE" | "POWER" | "ENTERPRISE";
const PLAN_RANK: Record<Plan, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  SCALE: 3,
  POWER: 3,
  ENTERPRISE: 4,
};

type SubItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

type Item = {
  label: string;
  /** Real route, or undefined → routed to the generic /module/[slug] placeholder. */
  href?: string;
  icon: LucideIcon;
  /** Minimum plan required. Defaults to STARTER (always available). */
  min?: Plan;
  subItems?: SubItem[];
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
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, min: "FREE" }],
  },
  {
    title: "Accounting",
    items: [
      {
        label: "Sales",
        href: "/workspace?section=sales",
        icon: Receipt,
        min: "STARTER",
        subItems: [
          { label: "Manage Invoices", href: "/workspace?section=sales", icon: Receipt },
          { label: "Create Invoice", href: "/workspace?section=sales&action=create-invoice", icon: FileText },
          { label: "Manage Credit Notes", href: "/workspace?section=sales&action=manage-credit-notes", icon: Receipt },
          { label: "Create Credit Note", href: "/workspace?section=sales&action=create-credit-note", icon: FileText },
          { label: "Advance Amount", href: "/workspace?section=sales&action=advance-amount", icon: Wallet },
          { label: "Proforma Invoice", href: "/workspace?section=sales&action=proforma-invoice", icon: FileText },
          { label: "Delivery Challan", href: "/workspace?section=sales&action=delivery-challan", icon: Truck },
        ],
      },
      {
        label: "Purchases",
        href: "/workspace?section=purchases",
        icon: ShoppingCart,
        min: "STARTER",
        subItems: [
          { label: "Manage Purchase", href: "/workspace?section=purchases", icon: ShoppingCart },
          { label: "Create Purchase", href: "/workspace?section=purchases&action=create-purchase", icon: FileText },
          { label: "Manage Debit Note", href: "/workspace?section=purchases&action=manage-debit-note", icon: Receipt },
          { label: "Create Debit Note", href: "/workspace?section=purchases&action=create-debit-note", icon: FileText },
        ],
      },
      {
        label: "Customers",
        href: "/workspace?section=customers",
        icon: Users,
        min: "STARTER",
        subItems: [
          { label: "Manage Customers", href: "/workspace?section=customers", icon: Users },
          { label: "Add Customers", href: "/workspace?section=customers&action=add-customer", icon: Plus },
        ],
      },
      {
        label: "Products",
        href: "/workspace?section=products",
        icon: Package,
        min: "STARTER",
        subItems: [
          { label: "Manage Products", href: "/workspace?section=products", icon: Package },
          { label: "Add Products", href: "/workspace?section=products&action=add-product", icon: Plus },
          { label: "Manage Category", href: "/workspace?section=products&action=manage-category", icon: Boxes },
          { label: "Add New Category", href: "/workspace?section=products&action=add-category", icon: Plus },
        ],
      },
      {
        label: "Inventory",
        href: "/workspace?section=inventory",
        icon: Boxes,
        min: "STARTER",
        subItems: [
          { label: "Manage Inventory", href: "/workspace?section=inventory", icon: Boxes },
          { label: "Stock Log", href: "/workspace?section=inventory&action=stock-log", icon: FileText },
        ],
      },
      { label: "Expenses", href: "/workspace?section=expenses", icon: Wallet, min: "FREE" },
      { label: "Bank Reconciliation", href: "/workspace?section=reconciliation", icon: Landmark, min: "STARTER" },
    ],
  },
  {
    title: "GST & Compliance",
    items: [
      { label: "GST Dashboard", href: "/module/gst-dashboard", icon: ShieldCheck, min: "STARTER" },
      { label: "E-Invoicing", href: "/module/e-invoicing", icon: FileCheck2, min: "STARTER" },
      {
        label: "E-Way Bills",
        href: "/workspace?section=ewaybill",
        icon: Truck,
        min: "STARTER",
        subItems: [
          { label: "Manage E-Way Bill", href: "/workspace?section=ewaybill", icon: Truck },
          { label: "Create E-Way Bill", href: "/workspace?section=ewaybill&action=create-ewaybill", icon: Plus },
          { label: "Manage Cancelled E-Way Bill", href: "/workspace?section=ewaybill&action=manage-cancelled", icon: FileText },
          { label: "Cancel E-Way Bill", href: "/workspace?section=ewaybill&action=cancel-ewaybill", icon: FileText },
          { label: "Manage Transporter", href: "/workspace?section=ewaybill&action=manage-transporter", icon: Truck },
        ],
      },
      { label: "Compliance Calendar", href: "/module/compliance-calendar", icon: CalendarClock, min: "FREE" },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      { label: "Business Health Score", href: "/module/health-score", icon: HeartPulse, min: "FREE" },
      { label: "ProfitLeak Finder", href: "/module/profitleak-finder", icon: TrendingDown, min: "GROWTH" },
      { label: "Predictive Tax Warnings", href: "/module/tax-warnings", icon: AlertTriangle, min: "GROWTH" },
      { label: "MoneyMap Live", href: "/module/moneymap-live", icon: Activity, min: "GROWTH" },
      { label: "Financial Black Box", href: "/module/financial-black-box", icon: Archive, min: "GROWTH" },
      { label: "Business Lifeguard", href: "/module/business-lifeguard", icon: LifeBuoy, min: "GROWTH" },
      { label: "Vendor Trust", href: "/module/vendor-trust", icon: Handshake, min: "GROWTH" },
      { label: "Virtual Business Director", href: "/module/virtual-business-director", icon: Bot, min: "GROWTH" },
      { label: "Accounting Warranty", href: "/module/accounting-warranty", icon: BadgeCheck, min: "GROWTH" },
      { label: "Industry Benchmarks", href: "/module/benchmarks", icon: BarChart3, min: "GROWTH" },
      { label: "AI Insights", href: "/module/insights", icon: Lightbulb, min: "FREE" },
      { label: "WhatsApp CFO", href: "/module/whatsapp-cfo", icon: MessageCircle, min: "GROWTH" },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "Reports Center", href: "/workspace?section=reports", icon: PieChart, min: "STARTER" },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Business Profile", href: "/module/business-profile", icon: Building2, min: "FREE" },
      { label: "Billing", href: "/subscribe", icon: CreditCard, min: "FREE" },
    ],
  },
];

const slugify = (label: string) =>
  // "&" → "-and-" so "P&L" → "p-and-l" (must match the module registry keys).
  label.toLowerCase().replace(/&/g, "-and-").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Decode plan from localStorage or JWT claim. */
function readPlan(): Plan {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan") || localStorage.getItem("vertofi_plan");
      if (stored) {
        const upper = stored.toUpperCase();
        if (upper in PLAN_RANK) return upper as Plan;
        if (upper.includes("ENTERPRISE")) return "ENTERPRISE";
        if (upper.includes("SCALE") || upper.includes("POWER")) return "SCALE";
        if (upper.includes("GROWTH")) return "GROWTH";
        if (upper.includes("STARTER")) return "STARTER";
      }

      const userEmail = (localStorage.getItem("vertofi_user_email") || "").toLowerCase();
      const userName = (localStorage.getItem("vertofi_user_name") || "").toLowerCase();
      const bizRaw = (localStorage.getItem("vertofi_business_profile") || "").toLowerCase();
      const orgId = (localStorage.getItem("vertofi.orgId") || "").toLowerCase();
      const all = `${userEmail} ${userName} ${bizRaw} ${orgId}`;
      if (
        all.includes("gouthambadiga") ||
        all.includes("gowthambadiga") ||
        all.includes("goutham") ||
        all.includes("gowtham") ||
        all.includes("badiga") ||
        all.includes("geethika") ||
        all.includes("parvatham") ||
        all.includes("demo") ||
        all.includes("enterprise")
      ) {
        return "ENTERPRISE";
      }
    }
    const token = getAccess();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { plan?: string };
        const p = String(payload.plan ?? "").toUpperCase();
        if (p in PLAN_RANK) return p as Plan;
      } catch {}
    }
    return "ENTERPRISE";
  } catch {
    return "ENTERPRISE";
  }
}

const COLLAPSE_KEY = "vertofi.sidebar.collapsed";

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<Plan>("ENTERPRISE");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const navRef = useRef<HTMLElement>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    setCurrentUrl(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""));
  }, [pathname, searchParams]);

  useEffect(() => {
    const onWorkspaceNav = (e: Event) => {
      const custom = e as CustomEvent<{ href: string }>;
      if (custom.detail?.href) {
        setCurrentUrl(custom.detail.href);
      }
    };
    window.addEventListener("vertofi:workspace-nav", onWorkspaceNav);
    window.addEventListener("popstate", () => {
      setCurrentUrl(window.location.pathname + window.location.search);
    });
    return () => {
      window.removeEventListener("vertofi:workspace-nav", onWorkspaceNav);
    };
  }, []);

  function toggleSubMenu(label: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  // Auto expand menu if active section matches a sub-item
  useEffect(() => {
    const url = currentUrl || (pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""));
    if (url.includes("section=sales")) {
      setExpanded((prev) => ({ ...prev, Sales: true }));
    } else if (url.includes("section=purchases")) {
      setExpanded((prev) => ({ ...prev, Purchases: true }));
    } else if (url.includes("section=customers")) {
      setExpanded((prev) => ({ ...prev, Customers: true }));
    } else if (url.includes("section=suppliers")) {
      setExpanded((prev) => ({ ...prev, Suppliers: true }));
    } else if (url.includes("section=products")) {
      setExpanded((prev) => ({ ...prev, Products: true }));
    } else if (url.includes("section=inventory")) {
      setExpanded((prev) => ({ ...prev, Inventory: true }));
    } else if (url.includes("section=ewaybill")) {
      setExpanded((prev) => ({ ...prev, "E-Way Bills": true }));
    }
  }, [currentUrl, pathname, searchParams]);

  useEffect(() => {
    const syncPlan = () => setPlan(readPlan());
    syncPlan();
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");

    window.addEventListener("vertofi:plan-changed", syncPlan);
    window.addEventListener("storage", syncPlan);

    // Proactively prefetch high-frequency routes for instant zero-latency loading
    const routesToWarm = [
      "/dashboard",
      "/workspace",
      "/workspace?section=sales",
      "/workspace?section=purchases",
      "/workspace?section=customers",
      "/workspace?section=products",
      "/workspace?section=inventory",
      "/workspace?section=expenses",
      "/workspace?section=reconciliation",
      "/workspace?section=ewaybill",
      "/workspace?section=reports",
      "/module/business-profile",
      "/module/gst-dashboard",
      "/module/e-invoicing",
      "/subscribe",
    ];
    for (const r of routesToWarm) {
      router.prefetch(r);
    }

    return () => {
      window.removeEventListener("vertofi:plan-changed", syncPlan);
      window.removeEventListener("storage", syncPlan);
    };
  }, [router]);

  // Restore sidebar scroll position on navigation
  useEffect(() => {
    const saved = sessionStorage.getItem("vertofi.sidebar.scroll");
    if (saved && navRef.current) {
      const top = parseInt(saved, 10);
      navRef.current.scrollTop = top;
      requestAnimationFrame(() => {
        if (navRef.current) navRef.current.scrollTop = top;
      });
    }
  }, [pathname, searchParams, currentUrl]);

  // Close the mobile drawer on navigation.
  useEffect(() => { setMobileOpen(false); }, [pathname, currentUrl]);

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
          const href = item.href ?? `/module/${slugify(item.label)}`;
          const minRank = item.min ? PLAN_RANK[item.min] : 0;
          const locked = minRank > planRank;
          return { ...item, locked, resolvedHref: href };
        }),
      })),
    [planRank],
  );

  function isActive(href?: string) {
    if (!href) return false;
    const urlToCheck = currentUrl || (pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""));
    const [currentPath, currentQuery] = urlToCheck.split("?");
    const [targetPath, targetQuery] = href.split("?");
    
    if (currentPath !== targetPath) return false;

    if (targetQuery) {
      const targetParams = new URLSearchParams(targetQuery);
      const currentParams = new URLSearchParams(currentQuery || "");
      
      // Check that all target params match
      for (const [key, val] of Array.from(targetParams.entries())) {
        if (currentParams.get(key) !== val) return false;
      }

      // Strict match for 'action' param: if target doesn't specify an action, current shouldn't have one either,
      // otherwise parent items match when child items with actions are selected.
      if (!targetParams.has("action") && currentParams.has("action")) {
        return false;
      }

      return true;
    }

    // Default match for /workspace without params
    if (targetPath === "/workspace") {
      const currentParams = new URLSearchParams(currentQuery || "");
      const section = currentParams.get("section");
      return !section || section === "overview" || section === "bookkeeping";
    }

    return true;
  }

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, targetHref: string, parentLabel?: string) {
    if (navRef.current) {
      sessionStorage.setItem("vertofi.sidebar.scroll", String(navRef.current.scrollTop));
    }
    setMobileOpen(false);
    setCurrentUrl(targetHref);

    if (parentLabel && !expanded[parentLabel]) {
      setExpanded((prev) => ({ ...prev, [parentLabel]: true }));
    }

    // If currently on /workspace and target is within /workspace, perform 0ms instant transition
    if (typeof window !== "undefined" && window.location.pathname === "/workspace" && targetHref.startsWith("/workspace")) {
      e.preventDefault();
      const url = new URL(targetHref, window.location.origin);
      const sec = url.searchParams.get("section") || "sales";
      const act = url.searchParams.get("action") || null;
      
      window.history.pushState(null, "", targetHref);
      window.dispatchEvent(new CustomEvent("vertofi:workspace-nav", { detail: { section: sec, action: act, href: targetHref } }));
      return;
    }
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
              const hasSub = Array.isArray(item.subItems) && item.subItems.length > 0;
              const isMenuOpen = expanded[item.label] ?? false;
              // parent is 'active' contextually if itself or child is active
              const active = isActive(item.resolvedHref) || (hasSub && item.subItems!.some((s) => isActive(s.href)));

              if (!item.resolvedHref) return null;

              return (
                <div key={`${section.title}-${item.label}`} className="space-y-0.5">
                  <div className="flex items-center">
                    <Link
                      href={item.resolvedHref}
                      prefetch={true}
                      onMouseEnter={() => router.prefetch(item.resolvedHref!)}
                      onMouseDown={() => router.prefetch(item.resolvedHref!)}
                      onTouchStart={() => router.prefetch(item.resolvedHref!)}
                      onClick={(e) => {
                        // Always expand when clicking parent, never collapse on nav
                        if (hasSub && !collapsed) {
                          setExpanded((prev) => ({ ...prev, [item.label]: true }));
                        }
                        handleNavClick(e, item.resolvedHref!, item.label);
                      }}
                      title={collapsed ? item.label : item.label}
                      className={[
                        "group flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition",
                        collapsed ? "justify-center" : "",
                        active && !hasSub
                          ? "bg-brand text-white font-semibold"
                          : active && hasSub
                          ? "text-brand font-semibold"
                          : item.locked
                          ? "text-slate-600 hover:bg-amber-50/60 hover:text-slate-900"
                          : "text-[#334155] hover:bg-bg2 hover:text-ink",
                      ].join(" ")}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${active && !hasSub ? "text-white" : active && hasSub ? "text-brand" : item.locked ? "text-amber-500/80 group-hover:text-amber-600" : "text-muted group-hover:text-ink"}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.locked && (
                            <span className="flex items-center gap-1 rounded bg-amber-100/70 border border-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800">
                              <Lock className="h-2.5 w-2.5" />
                              {item.min}
                            </span>
                          )}
                        </>
                      )}
                    </Link>

                    {hasSub && !collapsed && (
                      <button
                        type="button"
                        onClick={(e) => toggleSubMenu(item.label, e)}
                        className={`p-1.5 text-xs font-bold transition hover:text-brand cursor-pointer ${active && hasSub ? "text-brand" : "text-muted"}`}
                        title={isMenuOpen ? "Collapse" : "Expand"}
                      >
                        {isMenuOpen ? "−" : "+"}
                      </button>
                    )}
                  </div>

                  {/* Render SubItems if expanded */}
                  {hasSub && isMenuOpen && !collapsed && (
                    <div className="ml-5 space-y-0.5 border-l border-border/60 pl-2 mt-1">
                      {item.subItems!.map((sub) => {
                        const SubIcon = sub.icon ?? FileText;
                        const subActive = isActive(sub.href);
                        return (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            prefetch={true}
                            onMouseEnter={() => router.prefetch(sub.href)}
                            onMouseDown={() => router.prefetch(sub.href)}
                            onTouchStart={() => router.prefetch(sub.href)}
                            onClick={(e) => handleNavClick(e, sub.href, item.label)}
                            className={[
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition",
                              subActive
                                ? "bg-brand text-white font-semibold shadow-sm"
                                : item.locked
                                ? "text-slate-600 hover:bg-amber-50/50 hover:text-slate-900"
                                : "text-slate-600 hover:bg-bg2 hover:text-ink",
                            ].join(" ")}
                          >
                            <SubIcon className={`h-3.5 w-3.5 shrink-0 ${subActive ? "text-white" : item.locked ? "text-amber-500/80" : "text-muted"}`} />
                            <span className="flex-1 truncate">{sub.label}</span>
                            {item.locked && (
                              <Lock className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="Vertofi" width={26} height={26} className="rounded-lg object-contain" />
          <span className="text-[15px] font-bold tracking-tight text-ink">Vertofi</span>
        </Link>
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
          {!collapsed && (
            <div className="mb-2.5 flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50 px-2.5 py-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${plan === "FREE" ? "bg-amber-400" : "bg-emerald-500"}`} />
                <span className="text-slate-500 font-medium">Plan:</span>
                <span className="font-bold text-slate-800">{plan}</span>
              </div>
              <Link href="/subscribe" className="font-semibold text-brand hover:underline">
                {plan === "FREE" ? "Upgrade" : "Manage"}
              </Link>
            </div>
          )}
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
