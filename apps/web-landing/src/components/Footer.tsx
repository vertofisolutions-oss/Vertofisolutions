"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "All Innovations", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Business Health Score", href: "/features#business-health-score" },
      { label: "MoneyMap Live", href: "/features#moneymap-live" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Blog & Updates", href: "/blog" },
      { label: "Contact Sales", href: "/contact" },
      { label: "Careers", href: "/about#careers" },
    ],
  },
  {
    title: "Legal & Trust",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Security Dossier", href: "/legal/security" },
      { label: "Data Deletion", href: "/legal/data-deletion" },
      { label: "Refund Policy", href: "/legal/refunds" },
      { label: "Contact Compliance", href: "/contact" },
    ],
  },
];

const APP_ROUTES = [
  "/workspace",
  "/dashboard",
  "/associates",
  "/accountants",
  "/bhs-portal",
  "/legal-portal",
  "/teams-portal",
  "/admin",
  "/onboarding",
  "/module",
  "/login",
  "/register",
  "/reset",
  "/reactivate",
];

export function Footer() {
  const pathname = usePathname();

  // Hide footer completely when inside portals / workspace / auth screens
  if (APP_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <footer className="relative border-t border-slate-200/90 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/70 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 space-y-4">
            <Logo />
            <p className="max-w-sm text-sm text-slate-500">
              Predictive accounting and financial intelligence for Indian businesses. Automate GST, payroll, banking, and real-time cash flow monitoring with AI.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-600 transition hover:text-slate-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Vertofi Solutions Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://wa.me/918712357876?text=hello" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 font-medium hover:underline">
              WhatsApp CFO: +91 87123 57876
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
