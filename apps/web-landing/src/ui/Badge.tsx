import * as React from "react";
import { cn } from "./cn";

type Tone = "neutral" | "brand" | "gold" | "danger" | "deep-green" | "green" | "yellow" | "amber" | "orange" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-bg2 text-muted",
  brand: "bg-brand-50 text-brand",
  gold: "bg-gold-50 text-gold", // premium / success / elite / protection
  danger: "bg-[#FDECEC] text-danger", // risk / compliance / penalty ONLY
  "deep-green": "bg-[#E6F4EA] text-[#137333]",
  green: "bg-[#E6F4EA] text-[#1E8E3E]",
  yellow: "bg-[#FEF7E0] text-[#E37400]",
  amber: "bg-[#FDF3E1] text-[#B06000]",
  orange: "bg-[#FCE8E6] text-[#D93025]",
  red: "bg-[#FCE8E6] text-[#C5221F]",
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
