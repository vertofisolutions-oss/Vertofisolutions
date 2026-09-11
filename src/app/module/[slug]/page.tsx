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

  const workspaceSections: Record<string, string> = {
    "expenses": "expenses",
    "bank-reconciliation": "reconciliation",
    "intelligence": "intelligence",
  };

  const isRedirect = Boolean(workspaceSections[slug]);

  useEffect(() => {
    if (workspaceSections[slug]) {
      router.replace(`/workspace?section=${workspaceSections[slug]}`);
    }
  }, [router, slug]);

  if (isRedirect) return null;
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
