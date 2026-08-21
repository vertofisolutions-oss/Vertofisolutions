"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  LayoutDashboard,
  Users,
  Shield,
  KeyRound,
  ReceiptText,
  Cpu,
  AlertTriangle,
  GitBranch,
  Cloud,
  Database,
  ScrollText,
  Contact,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import { clearTokens, decodeClaims, getAccess, homeFor, isInternal, type Claims, type Role } from "../lib/auth";
import { api } from "../lib/api";

const ROLE_LABEL: Partial<Record<Role, string>> = {
  ADMIN: "Administrator",
  TEAM_LEAD: "Team Lead",
  TEAM_MEMBER: "Team Member",
};

const ADMIN_NAV = [
  { label: "Control Tower", href: "/", icon: LayoutDashboard, section: "main" },
  { label: "Billing Dues", href: "/?tab=billing", icon: ReceiptText, section: "main" },
  { label: "AI & Cloud", href: "/?tab=ai", icon: Cpu, section: "main" },
  { label: "Risk Register", href: "/?tab=risks", icon: AlertTriangle, section: "main" },
  { label: "CI/CD", href: "/?tab=cicd", icon: GitBranch, section: "main" },
  { label: "Cloud Status", href: "/?tab=cloud", icon: Cloud, section: "main" },
  { label: "Landing Leads", href: "/?tab=landing", icon: Contact, section: "main" },
  { label: "Access Log", href: "/?tab=audit", icon: ScrollText, section: "main" },
  // Team management
  { label: "Professionals", href: "/professionals", icon: BadgeCheck, section: "team" },
  { label: "Team Members", href: "/team-members", icon: Users, section: "team" },
  { label: "IP Allowlist", href: "/ip-allowlist", icon: Shield, section: "team" },
  { label: "Access Tokens", href: "/access-tokens", icon: KeyRound, section: "team" },
] as const;

export function PanelShell({
  title,
  subtitle,
  allow,
  children,
}: {
  title: string;
  subtitle?: string;
  allow: Role[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [claims, setClaims] = useState<Claims | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dbGroups, setDbGroups] = useState<{ group: string; entities: { key: string; label: string }[] }[]>([]);

  useEffect(() => {
    if (!getAccess()) { router.replace("/login"); return; }
    const c = decodeClaims();
    if (!c || !isInternal(c.role)) { clearTokens(); router.replace("/login"); return; }
    if (!allow.includes(c.role)) { router.replace(homeFor(c.role)); return; }
    setClaims(c);
    // Load the entity catalogue for the Database sidebar section (ADMIN only).
    if (c.role === "ADMIN") api.tableGroups().then(setDbGroups).catch(() => {});
  }, [router, allow]);

  if (!claims) return null;

  const isAdmin = claims.role === "ADMIN";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <Image src="/logo.jpg" alt="Vertofi Admin" width={28} height={28} className="rounded-lg object-contain" />
            <span className="text-sm font-bold tracking-tight text-slate-900">Vertofi</span>
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 uppercase tracking-wider">
              Internal
            </span>
            <span className="hidden sm:inline rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">
              {ROLE_LABEL[claims.role] ?? claims.role}
            </span>
          </div>
          <button
            onClick={() => { clearTokens(); router.push("/login"); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (ADMIN only) ── */}
        {isAdmin && sidebarOpen && (
          <aside className="w-56 shrink-0 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {/* Main section */}
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Dashboard</p>
              {ADMIN_NAV.filter((n) => n.section === "main").map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
                  </button>
                );
              })}

              {/* Team Management section */}
              <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Team & Security</p>
              {ADMIN_NAV.filter((n) => n.section === "team").map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
                  </button>
                );
              })}

              {/* Database — every entity, grouped by domain (live Cloud SQL) */}
              {dbGroups.length > 0 && (
                <>
                  <p className="flex items-center gap-1.5 px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Database className="h-3 w-3" /> Database
                  </p>
                  {dbGroups.map((g) => (
                    <div key={g.group} className="mb-1">
                      <p className="px-3 pb-0.5 pt-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">{g.group}</p>
                      {g.entities.map((e) => {
                        const href = `/db/${e.key}`;
                        const active = pathname === href;
                        return (
                          <button
                            key={e.key}
                            onClick={() => router.push(href)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                              active ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <span className="ml-1.5 truncate">{e.label}</span>
                            {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </nav>

            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold">Logged in as</p>
              <p className="text-xs text-slate-700 font-bold mt-0.5 truncate">{claims.role}</p>
            </div>
          </aside>
        )}

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-borderCard bg-white p-6 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-bg2 px-6 py-12 text-center">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "brand" | "danger" | "gold";
}) {
  const toneClass: Record<string, string> = {
    ink: "text-slate-900",
    brand: "text-blue-600",
    danger: "text-red-600",
    gold: "text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
