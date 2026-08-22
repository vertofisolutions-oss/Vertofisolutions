import Link from "next/link";
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

export function Footer() {
  return (
    <footer className="relative border-t border-slate-200/90 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/70 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Logo />
            <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-700">
              Predictive Financial Intelligence Platform for Indian MSMEs — automate accounting,
              monitor compliance, and make better financial decisions with complete confidence.
            </p>
          </div>

          {/* Links Cols */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-brand hover:font-semibold"
                    >
                      <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                        {l.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom copyright bar */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-slate-200/80 pt-6 text-xs sm:flex-row sm:items-center">
          <p className="font-medium text-slate-700">
            © {new Date().getFullYear()} <strong className="font-semibold text-slate-900">Vertofi Inc.</strong> All rights reserved. Predictive Accounting & Financial Intelligence.
          </p>
        </div>
      </div>
    </footer>
  );
}

