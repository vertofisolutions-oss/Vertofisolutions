"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../cn";
import { resolveAccent, type Accent } from "./theme";

export interface StepperProps {
  steps: string[];
  /** Zero-based index of the current step. */
  current: number;
  accent?: Accent | "business" | "admin" | "teams" | "associates" | "accountants" | "bhs" | "legal";
  className?: string;
}

/** Animated horizontal progress rail with check-pop on completed steps. */
export function Stepper({ steps, current, accent, className }: StepperProps) {
  const a = resolveAccent(accent);
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* track */}
        <div className="absolute left-0 right-0 top-[14px] h-0.5 bg-border" />
        {/* fill */}
        <motion.div
          className="absolute left-0 top-[14px] h-0.5"
          style={{ background: a.base }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <ol className="relative flex justify-between">
          {steps.map((label, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={label} className="flex flex-col items-center gap-2" style={{ width: `${100 / steps.length}%` }}>
                <motion.div
                  className="grid h-7 w-7 place-items-center rounded-full border-2 bg-white text-xs font-bold"
                  initial={false}
                  animate={{
                    backgroundColor: done || active ? a.base : "#FFFFFF",
                    borderColor: done || active ? a.base : "#E5E7EB",
                    color: done || active ? "#FFFFFF" : "#64748B",
                    scale: active ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {done ? (
                    <motion.svg
                      key="check"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    >
                      <path d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : (
                    i + 1
                  )}
                </motion.div>
                <span
                  className={cn(
                    "hidden text-center text-[11px] font-medium sm:block",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
