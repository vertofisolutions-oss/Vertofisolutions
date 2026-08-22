"use client";
import * as React from "react";
import { cn } from "../cn";
import { resolveAccent, type Accent } from "./theme";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  /** Fired when all digits are filled (auto-submit). */
  onComplete?: (code: string) => void;
  accent?: Accent | "business" | "admin" | "teams" | "associates" | "accountants" | "bhs" | "legal";
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Segmented OTP entry: N boxes with auto-advance, backspace-to-previous,
 * full-code paste, arrow-key navigation, and auto-submit on the last digit.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  accent,
  disabled,
  autoFocus = true,
}: OtpInputProps) {
  const a = resolveAccent(accent);
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => value.padEnd(length, " ").slice(0, length).split(""), [value, length]);

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setAt(index: number, char: string) {
    const next = digits.map((d, i) => (i === index ? char : d)).join("").replace(/\s/g, "");
    onChange(next);
    return next;
  }

  function handleChange(index: number, raw: string) {
    const char = raw.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = setAt(index, char);
    if (index < length - 1) refs.current[index + 1]?.focus();
    if (next.length === length) onComplete?.(next);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]?.trim()) {
        setAt(index, "");
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setAt(index - 1, "");
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
    if (pasted.length === length) onComplete?.(pasted);
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => {
        const filled = !!digits[i]?.trim();
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            value={digits[i]?.trim() ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            style={filled ? { borderColor: a.base, boxShadow: `0 0 0 3px ${a.base}1a` } : undefined}
            className={cn(
              "h-12 w-10 rounded-xl border-2 border-border bg-white text-center text-xl font-bold text-ink sm:h-14 sm:w-12 sm:text-2xl",
              "outline-none transition-all duration-200",
              "focus:border-brand focus:ring-2 focus:ring-brand/15",
              "disabled:opacity-60",
            )}
          />
        );
      })}
    </div>
  );
}
