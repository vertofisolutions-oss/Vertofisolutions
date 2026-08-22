import * as React from "react";
import { cn } from "../cn";

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error wrapper, shared across all auth forms. */
export function Field({ label, hint, error, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error.replaceAll("_", " ")}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass = cn(
  "w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-ink",
  "outline-none transition placeholder:text-slate-300",
  "focus:border-brand focus:ring-2 focus:ring-brand/10",
  "disabled:opacity-60 disabled:cursor-not-allowed",
);

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />,
);
TextInput.displayName = "TextInput";
