"use client";
import { use, useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { SidebarShell } from "../../../components/SidebarShell";
import { MODULES } from "../../../components/module/registry";

export default function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={null}>
      <ModuleInner params={params} />
    </Suspense>
  );
}

function ModuleInner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const dedicatedRoutes: Record<string, string> = {
    "profitleak-finder": "/profitleak-finder",
    "profit-leaks": "/profitleak-finder",
    "industry-benchmarks": "/module/industry-benchmarks",
    "accounting-warranty": "/module/accounting-warranty",
    "vendor-trust": "/module/vendor-trust",
    "tax-warnings": "/module/tax-warnings",
    "business-lifeguard": "/module/business-lifeguard",
    "virtual-business-director": "/module/virtual-business-director",
    "financial-black-box": "/module/financial-black-box",
    "whatsapp-accounting": "/module/whatsapp-accounting",
    "moneymap-live": "/module/money-map",
    "money-map": "/module/money-map",
    "expenses": "/workspace?section=expenses",
    "bank-reconciliation": "/workspace?section=reconciliation",
    "intelligence": "/workspace?section=intelligence",
  };

  const redirectTarget = dedicatedRoutes[slug];

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [router, redirectTarget]);

  if (redirectTarget) return null;
  const mod = MODULES[slug];

  return (
    <SidebarShell>
      <main className={`mx-auto ${slug === "business-profile" ? "max-w-6xl" : "max-w-5xl"} space-y-5 px-4 py-6 sm:px-6`}>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">{mod?.title ?? "Module"}</h1>
        {mod ? (
          <mod.component />
        ) : (
          <p className="border border-border bg-white px-4 py-8 text-center text-[12px] text-muted">
            This module isn&apos;t available. Pick a feature from the sidebar.
          </p>
        )}
      </main>
    </SidebarShell>
  );
}
