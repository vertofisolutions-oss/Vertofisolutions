"use client";
import * as React from "react";
import { cn } from "../cn";
import { resolveAccent, type Accent } from "./theme";

export interface AuthButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  busy?: boolean;
  busyLabel?: string;
  accent?: Accent | "business" | "admin" | "teams" | "associates" | "accountants" | "bhs" | "legal";
  full?: boolean;
}

/** Primary accent button used as the main CTA on every auth screen. */
export const AuthButton = React.forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ busy, busyLabel, accent, full = true, className, children, disabled, style, ...props }, ref) => {
    const a = resolveAccent(accent);
    return (
      <button
        ref={ref}
        disabled={disabled || busy}
        style={{ background: a.base, ...style }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white",
          "shadow-sm transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:brightness-95 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0",
          full && "w-full",
          className,
        )}
        {...props}
      >
        {busy && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
        )}
        {busy ? busyLabel ?? "Please wait…" : children}
      </button>
    );
  },
);
AuthButton.displayName = "AuthButton";
