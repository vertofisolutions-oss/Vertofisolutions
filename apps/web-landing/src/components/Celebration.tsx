"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

/** Premium full-screen success animation — used when the trial activates and
 *  when an autopay charge succeeds. Brand-coloured, subtle, no cheap confetti. */
export function Celebration({
  title,
  subtitle,
  cta,
  onCta,
  secondaryCta,
  secondaryHref,
}: {
  title: string;
  subtitle: string;
  cta: string;
  onCta: () => void;
  /** Optional second action (e.g. "Open WhatsApp CFO" deep link). */
  secondaryCta?: string;
  secondaryHref?: string;
}) {
  const sparks = Array.from({ length: 12 });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white px-6">
      <div className="relative flex flex-col items-center text-center">
        {/* radiating sparks */}
        {sparks.map((_, i) => {
          const angle = (i / sparks.length) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-brand"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], x: Math.cos(angle) * 90, y: Math.sin(angle) * 90, scale: [0, 1, 0.5] }}
              transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
            />
          );
        })}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14 }}
          className="grid h-20 w-20 place-items-center rounded-full bg-brand shadow-glow"
        >
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </motion.span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8 text-3xl font-bold tracking-tight text-ink"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-3 max-w-md text-base text-muted"
        >
          {subtitle}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <button onClick={onCta} className="rounded-xl bg-brand px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-600">
            {cta}
          </button>
          {secondaryCta && secondaryHref && (
            <a href={secondaryHref} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366] px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90">
              {secondaryCta}
            </a>
          )}
        </motion.div>
      </div>
    </div>
  );
}
