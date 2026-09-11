"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Building2, Briefcase, Calculator, Gauge, Scale, type LucideIcon } from "lucide-react";
import { PANELS } from "../lib/panels";

const ICONS: Record<string, LucideIcon> = {
  business: Building2,
  associates: Briefcase,
  accountants: Calculator,
  bhs: Gauge,
  legal: Scale,
};

export function ServicesDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus:outline-none"
        aria-expanded={open}
      >
        Services
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180 text-slate-900" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-[9999] w-[410px] pt-1"
          style={{ position: "absolute", zIndex: 9999 }}
        >
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xl ring-1 ring-black/5">
            <div className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              VERTOFI SERVICE PANELS
            </div>

            <div className="space-y-1">
              {PANELS.map((p) => {
                const Icon = ICONS[p.key] ?? Building2;
                return (
                  <Link
                    key={p.key}
                    href={p.href}
                    prefetch={true}
                    onClick={() => setOpen(false)}
                    className="group flex items-start gap-3 rounded-lg p-2 transition hover:bg-slate-50"
                  >
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition group-hover:border-slate-300">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 leading-snug">{p.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{p.audience}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
