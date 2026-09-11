/**
 * Public-facing service panels surfaced from the landing-page Services dropdown.
 * URLs are env-driven so each panel can be its own subdomain in production.
 *
 * NOTE: Admin and Teams are intentionally EXCLUDED. They are internal-only
 * tooling served from a separate, internally-hosted portal (apps/web-admin) and
 * must never be linked from or reachable via the public website.
 */
export interface Panel {
  key: string;
  name: string;
  audience: string;
  href: string;
}

import { cleanUrl } from "./site";

// cleanUrl strips stray whitespace (e.g. a trailing CR/LF baked into a Vercel
// env value) that otherwise produced malformed, line-broken hrefs.
const BUSINESS = process.env.NEXT_PUBLIC_BUSINESS_URL ? cleanUrl(process.env.NEXT_PUBLIC_BUSINESS_URL, "/login") : "/login";
const ASSOCIATES = process.env.NEXT_PUBLIC_ASSOCIATES_URL ? cleanUrl(process.env.NEXT_PUBLIC_ASSOCIATES_URL, "/associates/login") : "/associates/login";
const ACCOUNTANTS = process.env.NEXT_PUBLIC_ACCOUNTANTS_URL ? cleanUrl(process.env.NEXT_PUBLIC_ACCOUNTANTS_URL, "/accountants/login") : "/accountants/login";
const BHS = process.env.NEXT_PUBLIC_BHS_URL ? cleanUrl(process.env.NEXT_PUBLIC_BHS_URL, "/bhs-portal/login") : "/bhs-portal/login";
const LEGAL = process.env.NEXT_PUBLIC_LEGAL_URL ? cleanUrl(process.env.NEXT_PUBLIC_LEGAL_URL, "/legal-portal/login") : "/legal-portal/login";

export const PANELS: Panel[] = [
  { key: "business", name: "Vertofi for Business", audience: "Business owners & clients", href: BUSINESS },
  { key: "associates", name: "Vertofi for Associates", audience: "CA · CMA · CPA · CS · ACCA · CFA", href: ASSOCIATES },
  { key: "accountants", name: "Accountant Panel", audience: "Accounts teams under an associate", href: ACCOUNTANTS },
  { key: "bhs", name: "Vertofi for BHS Intelligence", audience: "BHS intelligence companies", href: BHS },
  { key: "legal", name: "Vertofi for Legal Services", audience: "Lawyers & legal teams", href: LEGAL },
];
