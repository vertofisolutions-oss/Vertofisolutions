import * as React from "react";
import { cn } from "./cn";

type Tone = "neutral" | "brand" | "gold" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-bg2 text-muted",
  brand: "bg-brand-50 text-brand",
  gold: "bg-gold-50 text-gold", // premium / success / elite / protection
  danger: "bg-[#FDECEC] text-danger", // risk / compliance / penalty ONLY
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
