"use client";
import * as React from "react";
import { cn } from "../cn";
import { Field, inputClass } from "./Field";

export interface PasswordFieldProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  onEnter?: () => void;
  /** Show a strength meter (use on set-password / register, not login). */
  strength?: boolean;
}

/** 0-4 strength score from length + character classes. */
export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["#EB1E1E", "#EB1E1E", "#D59A07", "#1378F8", "#0E9F6E"];

export function PasswordField({
  value,
  onChange,
  label = "Password",
  error,
  hint,
  placeholder = "••••••••",
  autoFocus,
  autoComplete = "current-password",
  onEnter,
  strength,
}: PasswordFieldProps) {
  const [show, setShow] = React.useState(false);
  const score = passwordScore(value);
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          className={cn(inputClass, "pr-12")}
          type={show ? "text" : "password"}
          value={value}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value.length > 0 && onEnter?.()}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-ink"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {strength && value.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{ background: i < score ? COLORS[score] : "#E5E7EB" }}
              />
            ))}
          </div>
          <p className="text-[11px] font-medium" style={{ color: COLORS[score] }}>
            {LABELS[score]}
          </p>
        </div>
      )}
    </Field>
  );
}
