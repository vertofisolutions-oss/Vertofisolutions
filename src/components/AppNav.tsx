"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/ui";
import { clearTokens } from "@/lib/api";

const ITEMS: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Accounting", href: "/workspace" },
  { label: "Intelligence", href: "/dashboard" },
  { label: "Compliance", href: "/dashboard" },
  { label: "Reports", href: "/dashboard" },
];

export function AppNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  function logout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-8">
          <a href="/dashboard" className="flex items-center gap-2.5">
            <Image src="/logo.jpg" alt="Vertofi" width={30} height={30} className="rounded-lg object-contain" />
            <span className="text-base font-bold tracking-tight text-[#0F172A]">Vertofi</span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {ITEMS.map((i) => (
              <a key={i.label} href={i.href} className="text-sm font-medium text-[#64748B] transition hover:text-[#0F172A]">
                {i.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 md:flex">
          <a href="#" className="text-sm font-medium text-[#64748B] transition hover:text-[#0F172A]">Settings</a>
          <a href="#" className="text-sm font-medium text-[#64748B] transition hover:text-[#0F172A]">Billing</a>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-lg p-2 text-[#64748B] transition hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="border-t border-[#E5E7EB] bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {ITEMS.map((i) => (
              <a
                key={i.label}
                href={i.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#334155] transition hover:bg-slate-50"
              >
                {i.label}
              </a>
            ))}
            <a href="#" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#334155] transition hover:bg-slate-50">Settings</a>
            <a href="#" className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#334155] transition hover:bg-slate-50">Billing</a>
            <button
              onClick={logout}
              className="mt-1 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-danger transition hover:bg-red-50"
            >
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
