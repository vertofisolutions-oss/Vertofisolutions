/** Cross-app URLs + nav config. Business app + panels are env-driven so each
 *  can become its own subdomain in production. */

/**
 * Sanitize an env-provided URL. Vercel env values have at times carried a
 * trailing CR/LF (`https://business.vertofi.com\r\n`), which rendered as broken
 * hrefs with a line break — flagged by crawlers/Meta as malformed URLs. Strip
 * ALL whitespace and any trailing slash so concatenated paths are always valid.
 */
export function cleanUrl(value: string | undefined, fallback: string): string {
  return (value ?? fallback).replace(/\s+/g, "").replace(/\/+$/, "");
}

export const BUSINESS_URL = cleanUrl(process.env.NEXT_PUBLIC_BUSINESS_URL, "");

export const links = {
  getStarted: "/register",
  login: "/login",
  checkBhs: "/bhs",
  bookDemo: "/contact",
};

export const NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "#services", dropdown: true },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

export const AUDIENCES = [
  "MSMEs",
  "Growing Businesses",
  "Manufacturers",
  "Agencies",
  "Consultants",
  "Retail Businesses",
  "Service Companies",
  "Startups",
];

/** The 7 BHS dimensions — methodology, never a numeric score (per brief). */
export const BHS_DIMENSIONS = [
  { name: "Expense Discipline", desc: "How controlled and intentional spending is over time." },
  { name: "Tax Compliance", desc: "Filing punctuality and exposure to penalties." },
  { name: "Cashflow Stability", desc: "Consistency of inflows against outflows and runway." },
  { name: "GST Accuracy", desc: "Reconciliation quality between books and the GST portal." },
  { name: "Payroll Consistency", desc: "Regularity and predictability of payroll obligations." },
  { name: "Debt Risk", desc: "Leverage and the burden of repayment obligations." },
  { name: "Profit Leakage", desc: "Silent losses from duplicates, waste and overcharges." },
];
