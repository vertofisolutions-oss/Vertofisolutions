import * as React from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "premium" | "ghost";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/**
 * Buttons per docs/12: primary blue (Create/Save/Continue/Connect only),
 * secondary white (most buttons), premium gold (Upgrade/Pro/Lifeguard).
 */
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-600 shadow-sm",
  secondary: "bg-white text-ink border border-[#DDE5F0] hover:bg-bg2",
  premium: "bg-white text-gold border border-gold hover:bg-gold-50",
  ghost: "bg-transparent text-ink hover:bg-bg2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
        "transition duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
