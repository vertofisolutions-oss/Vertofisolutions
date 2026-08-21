"use client";
import * as React from "react";
import { cn } from "../cn";
import { Field, inputClass } from "./Field";

export interface PhoneFieldProps {
  value: string;
  onChange: (digits: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  countryCode?: string;
  maxLength?: number;
  autoFocus?: boolean;
  onEnter?: () => void;
  placeholder?: string;
}

/** +91 (or other) prefix + numeric-only mobile input. */
export function PhoneField({
  value,
  onChange,
  label = "Mobile number",
  error,
  hint,
  countryCode = "+91",
  maxLength = 10,
  autoFocus,
  onEnter,
  placeholder = "10-digit mobile",
}: PhoneFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="flex gap-2">
        <span className="flex select-none items-center rounded-xl border border-border bg-bg2 px-3 text-sm font-semibold text-muted">
          {countryCode}
        </span>
        <input
          className={cn(inputClass, "flex-1 font-medium")}
          inputMode="numeric"
          autoComplete="tel"
          maxLength={maxLength}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && value.length === maxLength && onEnter?.()}
        />
      </div>
    </Field>
  );
}
