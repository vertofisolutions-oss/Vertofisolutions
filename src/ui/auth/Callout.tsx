"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../cn";

export interface CalloutProps {
  tone?: "error" | "info" | "success";
  children: React.ReactNode;
  className?: string;
}

const tones = {
  error: "bg-red-50 border-red-200 text-red-700",
  info: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

/** Inline status banner with a subtle fade/zoom entrance. */
export function Callout({ tone = "info", children, className }: CalloutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
    >
      {children}
    </motion.div>
  );
}
