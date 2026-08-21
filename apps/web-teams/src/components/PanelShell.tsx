"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { LogOut, Building, ShieldAlert, FileText, ChevronRight } from "lucide-react";
import { clearTokens, decodeClaims, getAccess, homeFor, isInternal, type Claims, type Role } from "../lib/auth";

const ROLE_LABEL: Partial<Record<Role, string>> = {
  TEAM_LEAD: "Team Lead",
  TEAM_MEMBER: "Team Member",
};

const TEAMS_NAV = [
  { label: "Assigned Companies", href: "/", icon: Building },
  { label: "Exceptions & Flaws", href: "/exceptions", icon: ShieldAlert },
  { label: "Internal Docs", href: "/docs", icon: FileText },
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

  useEffect(() => {
    if (!getAccess()) { router.replace("/login"); return; }
    const c = decodeClaims();
    if (!c || !isInternal(c.role)) { clearTokens(); router.replace("/login"); return; }
    if (!allow.includes(c.role)) { router.replace(homeFor(c.role)); return; }
    setClaims(c);
  }, [router, allow]);

  if (!claims) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Image src="/logo-teams.jpg" alt="Vertofi Teams" width={28} height={28} className="rounded-lg object-contain" />
            <span className="text-sm font-bold tracking-tight text-slate-900">Vertofi Teams</span>
            <span className="hidden sm:inline rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              Internal Ops
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
        {sidebarOpen && (
          <aside className="w-56 shrink-0 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
              {TEAMS_NAV.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
            </nav>
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="text-[10px] text-slate-400 font-semibold">Logged in as</p>
              <p className="text-xs text-slate-700 font-bold mt-0.5 truncate">{claims.role}</p>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">
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
