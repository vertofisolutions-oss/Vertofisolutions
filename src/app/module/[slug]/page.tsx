"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarShell } from "../../../components/SidebarShell";
import { MODULES } from "../../../components/module/registry";

/**
 * Module engine: every sidebar feature renders its REAL module here (slug =
 * kebab-cased label), wired to its actual backend via the registry. Unknown
 * slugs get an honest not-found state — never fake data.
 */
export default function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Redirect modules that are integrated into workspace
    const workspaceSections: Record<string, string> = {
      "expenses": "expenses",
      "bank-reconciliation": "reconciliation",
      "intelligence": "intelligence",
    };
    
    if (workspaceSections[slug]) {
      router.replace(`/workspace?section=${workspaceSections[slug]}`);
      return;
    }
    
    setReady(true);
  }, [router, slug]);

  if (!ready) return null;
  const mod = MODULES[slug];

  return (
    <SidebarShell>
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <h1 className="text-[18px] font-semibold tracking-tight text-ink">{mod?.title ?? "Module"}</h1>
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
