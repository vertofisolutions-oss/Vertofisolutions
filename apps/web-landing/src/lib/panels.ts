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

const BUSINESS = "/login";
const ASSOCIATES = "/associates/login";
const ACCOUNTANTS = "/accountants/login";
const BHS = "/bhs-portal/login";
const LEGAL = "/legal-portal/login";

export const PANELS: Panel[] = [
  { key: "business", name: "Vertofi for Business", audience: "Business owners & clients", href: BUSINESS },
  { key: "associates", name: "Vertofi for Associates", audience: "CA · CMA · CPA · CS · ACCA · CFA", href: ASSOCIATES },
  { key: "accountants", name: "Accountant Panel", audience: "Accounts teams under an associate", href: ACCOUNTANTS },
  { key: "bhs", name: "Vertofi for BHS Intelligence", audience: "BHS intelligence companies", href: BHS },
  { key: "legal", name: "Vertofi for Legal Services", audience: "Lawyers & legal teams", href: LEGAL },
];
