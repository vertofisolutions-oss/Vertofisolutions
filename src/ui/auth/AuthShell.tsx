"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../cn";
import { resolveAccent, type Accent } from "./theme";

export interface AuthShellProps {
  /** Panel accent — preset key (e.g. "admin") or a custom hex set. */
  accent?: Accent | "business" | "admin" | "teams" | "associates" | "accountants" | "bhs" | "legal";
  /** Name shown on the brand panel, e.g. "Vertofi for Business". */
  panelName: string;
  tagline: string;
  /** Trust/feature bullets for the brand panel. */
  bullets?: string[];
  /** Logo element (e.g. <Image src="/logo.jpg" .../>). */
  logo?: React.ReactNode;
  /** Small label above the heading, e.g. "Internal · Admin Only". */
  eyebrow?: string;
  /** The form column content. */
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional URL for a "Back to Website" button */
  backHref?: string;
}

/**
 * Universal split-screen auth layout (Stripe/Mercury/Ramp style): accent-themed
 * brand panel on the left, focused form column on the right. Collapses to a slim
 * header + full-width form on mobile. The brand panel has slow-drifting gradient
 * orbs that respect prefers-reduced-motion.
 */
export function AuthShell({ accent, panelName, tagline, bullets = [], logo, eyebrow, children, footer, backHref }: AuthShellProps) {
  const a = resolveAccent(accent);
  const reduce = useReducedMotion();
  const orb = (delay: number) =>
    reduce
      ? {}
      : { animate: { x: [0, 20, 0], y: [0, -16, 0] }, transition: { duration: 18, repeat: Infinity, ease: "easeInOut", delay } };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ── Brand panel ── */}
      <div
        className="relative flex flex-col justify-between overflow-hidden px-8 py-8 text-white lg:w-[46%] lg:px-12 lg:py-12"
        style={{ background: `linear-gradient(145deg, ${a.dark}, ${a.to ?? a.base})` }}
      >
        <motion.div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10" {...orb(0)} />
        <motion.div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-white/5" {...orb(3)} />

        <div className="relative z-10 flex items-center gap-3">
          {logo && <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 p-1.5">{logo}</div>}
          <div className="leading-tight">
            <span className="block text-base font-bold tracking-tight">Vertofi</span>
            {eyebrow && <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{eyebrow}</span>}
          </div>
        </div>

        <div className="relative z-10 hidden space-y-8 lg:block">
          <div>
            <h1 className="text-3xl font-bold leading-tight">{panelName}</h1>
            <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-white/75">{tagline}</p>
          </div>
          {bullets.length > 0 && (
            <ul className="space-y-3.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm font-medium text-white/85">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="relative z-10 hidden text-xs text-white/30 lg:block">
          © {new Date().getFullYear()} Vertofi Technologies. All rights reserved.
        </p>
      </div>

      {/* ── Form column ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 sm:px-10">
        {backHref && (
          <a
            href={backHref}
            className="absolute left-6 top-6 flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        )}
        <div className="w-full max-w-md">
          {children}
        </div>
        {footer && <div className="mt-8 w-full max-w-md">{footer}</div>}
      </div>
    </div>
  );
}
