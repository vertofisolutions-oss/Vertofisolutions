/**
 * Per-panel accent resolution for the auth kit. Vertofi's Tailwind tokens fix
 * `brand` to blue (#1378F8); panels that need their own identity (e.g. Admin =
 * dark/red) pass an `accent` hex and the auth components theme themselves via
 * inline styles + CSS variables, falling back to brand blue.
 */
export const BRAND = "#1378F8";

export interface Accent {
  /** Primary accent (buttons, focus, active step). */
  base: string;
  /** Darker shade for hover. */
  dark: string;
  /** Optional second colour for the brand-panel gradient. */
  to?: string;
}

export const ACCENTS = {
  business: { base: "#1378F8", dark: "#0E63D6", to: "#0A4DA8" },
  admin: { base: "#991B1B", dark: "#7F1717", to: "#111827" },
  teams: { base: "#0F766E", dark: "#0B5C55", to: "#134E4A" },
  associates: { base: "#1378F8", dark: "#0E63D6", to: "#0A4DA8" },
  accountants: { base: "#4338CA", dark: "#372FAE", to: "#1E1B4B" },
  bhs: { base: "#B45309", dark: "#92400E", to: "#451A03" },
  legal: { base: "#1F2937", dark: "#111827", to: "#0B1220" },
} satisfies Record<string, Accent>;

export function resolveAccent(accent?: Accent | keyof typeof ACCENTS): Accent {
  if (!accent) return ACCENTS.business;
  if (typeof accent === "string") return ACCENTS[accent];
  return accent;
}
