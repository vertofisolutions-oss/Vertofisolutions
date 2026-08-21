"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Building2, Briefcase, Calculator, Gauge, Scale, Users, ShieldCheck, type LucideIcon } from "lucide-react";
import { PANELS } from "../lib/panels";

const ICONS: Record<string, LucideIcon> = {
  business: Building2,
  associates: Briefcase,
  accountants: Calculator,
  bhs: Gauge,
  legal: Scale,
  teams: Users,
  admin: ShieldCheck,
};

export function ServicesDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="flex items-center gap-1 text-sm font-medium text-muted transition hover:text-ink"
        aria-expanded={open}
      >
        Services
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-full z-50 w-[440px] -translate-x-1/2 pt-3"
          >
            <div className="rounded-2xl border border-border bg-white p-2 shadow-soft">
              <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Vertofi service panels
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {PANELS.map((p) => {
                  const Icon = ICONS[p.key] ?? Building2;
                  return (
                    <a key={p.key} href={p.href} className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-bg2">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-bg2 text-ink transition group-hover:border-brand/30 group-hover:text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{p.name}</span>
                        <span className="block text-xs text-muted">{p.audience}</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
