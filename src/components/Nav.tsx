"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Gauge } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
  "/subscribe",
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Clear pending state as soon as pathname updates
  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  // Eagerly prefetch routes using Next.js client router without server-choking HTTP fetches
  useEffect(() => {
    const prefetchRoutes = [
      "/",
      "/about",
      "/pricing",
      "/blog",
      "/contact",
      "/features",
      "/register",
      "/dashboard",
      "/workspace",
      links.checkBhs,
      links.login,
      links.getStarted,
    ];
    prefetchRoutes.forEach((route) => {
      try {
        router.prefetch(route);
      } catch {
        // silent prefetch catch
      }
    });
  }, [router]);

  // Hide landing navbar completely when inside any portal / app / auth screen
  if (APP_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
      {pendingPath && (
        <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 z-[99999] animate-pulse" />
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-7 lg:flex">
            {TEXT_LINKS.map((link) => {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  onMouseEnter={() => router.prefetch(link.href)}
                  onPointerDown={() => router.prefetch(link.href)}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 active:text-blue-600 focus:text-blue-600 transition-colors duration-150 cursor-pointer"
                >
                  {link.label}
                </Link>
              );
            })}
            <ServicesDropdown />
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={links.checkBhs}
            prefetch={true}
            onMouseEnter={() => router.prefetch(links.checkBhs)}
            onPointerDown={() => router.prefetch(links.checkBhs)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50/50 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-xs transition-all duration-200 hover:border-amber-400 hover:shadow-sm hover:-translate-y-0.5"
          >
            <Gauge className="h-4 w-4 text-amber-600" /> Check BHS Score
          </Link>

          <Link
            href={links.login}
            prefetch={true}
            onMouseEnter={() => router.prefetch(links.login)}
            onPointerDown={() => router.prefetch(links.login)}
            className="px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-blue-600"
          >
            Login
          </Link>
          <Link
            href={links.getStarted}
            prefetch={true}
            onMouseEnter={() => router.prefetch(links.getStarted)}
            onPointerDown={() => router.prefetch(links.getStarted)}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5 active:translate-y-0"
          >
            Get Started
          </Link>
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
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={true}
                  onClick={() => setMobile(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-bg2"
                >
                  {l.label}
                </Link>
              ))}
              <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Services</div>
              {PANELS.map((p) => (
                <Link
                  key={p.key}
                  href={p.href}
                  prefetch={true}
                  onClick={() => setMobile(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg2"
                >
                  {p.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4">
                <Link
                  href={links.checkBhs}
                  prefetch={true}
                  onClick={() => setMobile(false)}
                  className="rounded-xl border border-gold/40 px-4 py-2.5 text-center text-sm font-medium text-gold"
                >
                  Check BHS Score
                </Link>
                <Link
                  href={links.login}
                  prefetch={true}
                  onClick={() => setMobile(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium text-ink"
                >
                  Login
                </Link>
                <Link
                  href={links.getStarted}
                  prefetch={true}
                  onClick={() => setMobile(false)}
                  className="rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
