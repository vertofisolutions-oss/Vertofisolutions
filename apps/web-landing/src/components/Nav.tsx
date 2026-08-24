"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Gauge } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { ServicesDropdown } from "./ServicesDropdown";
import { links } from "../lib/site";
import { PANELS } from "../lib/panels";

const TEXT_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
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

export function Nav() {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);

  // Hide landing navbar completely when inside any portal / app / auth screen
  if (APP_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-7 lg:flex">
            <a href="/" className="text-sm font-medium text-muted transition hover:text-ink">Home</a>
            <a href="/about" className="text-sm font-medium text-muted transition hover:text-ink">About</a>
            <ServicesDropdown />
            <a href="/pricing" className="text-sm font-medium text-muted transition hover:text-ink">Pricing</a>
            <a href="/blog" className="text-sm font-medium text-muted transition hover:text-ink">Blog</a>
            <a href="/contact" className="text-sm font-medium text-muted transition hover:text-ink">Contact</a>
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={links.checkBhs}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 px-3.5 py-2 text-sm font-medium text-gold transition hover:bg-gold-50"
          >
            <Gauge className="h-4 w-4" /> Check BHS Score
          </a>

          <a href={links.login} className="px-3 py-2 text-sm font-medium text-ink transition hover:text-brand">
            Login
          </a>
          <a
            href={links.getStarted}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            Get Started
          </a>
        </div>

        <button className="lg:hidden" onClick={() => setMobile((v) => !v)} aria-label="Toggle menu">
          {mobile ? <X className="h-6 w-6 text-ink" /> : <Menu className="h-6 w-6 text-ink" />}
        </button>
      </div>

      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-white lg:hidden"
          >
            <div className="space-y-1 px-6 py-4">
              {TEXT_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-bg2">
                  {l.label}
                </a>
              ))}
              <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Services</div>
              {PANELS.map((p) => (
                <a key={p.key} href={p.href} className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg2">
                  {p.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4">
                <a href={links.checkBhs} className="rounded-xl border border-gold/40 px-4 py-2.5 text-center text-sm font-medium text-gold">
                  Check BHS Score
                </a>
                <a href={links.login} className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium text-ink">
                  Login
                </a>
                <a href={links.getStarted} className="rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white">
                  Get Started
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
