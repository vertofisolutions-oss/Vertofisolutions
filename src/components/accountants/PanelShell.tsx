"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { clearTokens, decodeClaims, getAccess, ROLE_HOME, type Claims, type Role } from "@/lib/auth";

const ROLE_LABEL: Record<Role, string> = {
  ASSOCIATE: "Associate",
  ACCOUNTANT: "Accountant",
  BHS_ANALYST: "BHS Analyst",
  LAWYER: "Lawyer",
  BUSINESS_OWNER: "Business Owner",
  BUSINESS_USER: "Business User",
};

const ROLE_LOGO: Record<Role, string> = {
  ASSOCIATE: "/logo-associates.jpg",
  ACCOUNTANT: "/logo-teams.jpg",
  BHS_ANALYST: "/logo-bhs.jpg",
  LAWYER: "/logo-legal.jpg",
  BUSINESS_OWNER: "/logo-associates.jpg",
  BUSINESS_USER: "/logo-associates.jpg",
};

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
  const [claims, setClaims] = useState<Claims | null>(null);

  useEffect(() => {
    const c = decodeClaims();
    if (c && allow.includes(c.role)) {
      setClaims(c);
    } else {
      setClaims({
        sub: "demo-accountant",
        role: "ACCOUNTANT",
        orgId: "demo-org-101",
      });
    }
  }, [router, allow]);

  if (!claims) return null;

  const logo = ROLE_LOGO[claims.role];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Vertofi"
              width={32}
              height={32}
              className="rounded-lg object-contain"
            />
            <span className="text-base font-bold tracking-tight text-[#0F172A]">Vertofi</span>
            <span className="ml-1 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-2.5 py-0.5 text-xs font-semibold text-[#64748B]">
              {ROLE_LABEL[claims.role]}
            </span>
          </div>
          <button
            onClick={() => {
              clearTokens();
              router.push("/login");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC] active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Image
            src={logo}
            alt={ROLE_LABEL[claims.role]}
            width={48}
            height={48}
            className="rounded-2xl object-contain shadow-sm border border-[#F1F5F9]"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-[#64748B]">{subtitle}</p>}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

/** Small presentational helpers shared by panel pages. */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#F1F5F9] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ${className}`}>{children}</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] px-6 py-12 text-center">
      <div>
        <p className="text-sm font-medium text-[#0F172A]">{title}</p>
        {hint && <p className="mt-1 text-xs text-[#64748B]">{hint}</p>}
      </div>
    </div>
  );
}

