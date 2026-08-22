"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Lock, Search, User, X } from "lucide-react";
import { api, getOrgId } from "@/lib/api";

export type SearchTarget = { label: string; href?: string; section: string; locked?: boolean };

type Hit =
  | { kind: "module"; label: string; href?: string; section: string; locked?: boolean }
  | { kind: "customer"; label: string; sub: string }
  | { kind: "invoice"; label: string; sub: string };

/**
 * Global search (Ctrl/⌘+K): every sidebar module by name, plus LIVE customers
 * and invoices from the accounting service. Locked modules appear with their
 * lock — visible, honest, never hidden.
 */
export function GlobalSearch({ targets }: { targets: SearchTarget[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setHits(targets.slice(0, 8).map((t) => ({ kind: "module" as const, ...t })));
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, targets]);

  const search = useCallback(
    (text: string) => {
      const id = ++seq.current;
      const needle = text.trim().toLowerCase();
      const moduleHits: Hit[] = targets
        .filter((t) => !needle || t.label.toLowerCase().includes(needle) || t.section.toLowerCase().includes(needle))
        .slice(0, needle ? 6 : 8)
        .map((t) => ({ kind: "module" as const, ...t }));
      setHits(moduleHits);
      setSel(0);
      const orgId = getOrgId();
      if (!needle || needle.length < 2 || !orgId) return;
      void (async () => {
        const [cust, sales] = await Promise.allSettled([api.acc.customers(orgId, needle), api.acc.sales(orgId)]);
        if (seq.current !== id) return; // stale response
        const extra: Hit[] = [];
        if (cust.status === "fulfilled") {
          for (const c of (cust.value as Record<string, unknown>[]).slice(0, 4)) {
            extra.push({ kind: "customer", label: String(c.name ?? ""), sub: String(c.gstin ?? c.phone ?? "Customer") });
          }
        }
        if (sales.status === "fulfilled") {
          for (const s of (sales.value as Record<string, unknown>[]).filter((s) =>
            [s.invoice_no, s.customer_name].some((v) => String(v ?? "").toLowerCase().includes(needle)),
          ).slice(0, 4)) {
            extra.push({ kind: "invoice", label: String(s.invoice_no ?? "Invoice"), sub: `${String(s.customer_name ?? "")} · ₹${Number(s.total ?? 0).toLocaleString("en-IN")}` });
          }
        }
        if (extra.length) setHits((h) => [...h, ...extra]);
      })();
    },
    [targets],
  );

  function go(h: Hit) {
    setOpen(false);
    if (h.kind === "module") {
      if (h.locked || !h.href) return;
      router.push(h.href);
    } else if (h.kind === "customer") {
      router.push("/workspace");
    } else {
      router.push("/workspace?section=sales");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border border-border bg-white px-2.5 py-1.5 text-left text-[12px] text-muted transition hover:border-brand"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate">Search…</span>
        <kbd className="border border-borderCard bg-bg2 px-1 text-[10px]">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="absolute left-1/2 top-[12vh] w-[92%] max-w-lg -translate-x-1/2 border border-border bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && hits[sel]) go(hits[sel]!);
            }}
            placeholder="Modules, customers, invoices…"
            className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
          />
          <button onClick={() => setOpen(false)} className="p-1 text-muted hover:text-ink" aria-label="Close search">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {hits.length === 0 && <li className="px-4 py-6 text-center text-[12px] text-muted">No matches.</li>}
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.label}-${i}`}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => go(h)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] ${i === sel ? "bg-brand/10" : ""} ${h.kind === "module" && h.locked ? "text-muted" : "text-ink"}`}
              >
                {h.kind === "customer" ? <User className="h-4 w-4 shrink-0 text-muted" />
                  : h.kind === "invoice" ? <FileText className="h-4 w-4 shrink-0 text-muted" />
                  : <Search className="h-4 w-4 shrink-0 text-muted" />}
                <span className="flex-1 truncate font-medium">{h.label}</span>
                <span className="shrink-0 text-[11px] text-muted">
                  {h.kind === "module" ? h.section : h.sub}
                </span>
                {h.kind === "module" && h.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted/60" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
