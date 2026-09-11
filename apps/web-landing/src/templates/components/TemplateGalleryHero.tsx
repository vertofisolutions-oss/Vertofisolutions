"use client";

import React from "react";
import { Sparkles, Search, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TemplateGalleryHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TemplateGalleryHero: React.FC<TemplateGalleryHeroProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0F172A] p-8 sm:p-12 text-white shadow-2xl border border-slate-800">
      {/* Glow Orbs Backdrop */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-3xl space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Vertofi Document Studio</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          Professional Templates. <br />
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
            Built for Modern SaaS & B2B.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
          Create GST-ready invoices, business quotations, payment receipts, HR payslips, and client statements with customizable Vertofi templates in seconds.
        </p>

        {/* Search Bar Container */}
        <div className="pt-2">
          <div className="relative flex items-center max-w-xl">
            <Search className="absolute left-4 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search templates (e.g. SaaS invoice, quotation, payslip)..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 pl-12 pr-28 py-3.5 text-sm text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition backdrop-blur-md shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-4 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Badges */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>100% GST & Indian Rupee Ready</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
            <span>Live Real-time PDF Export</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
            <span>UPI QR & Bank Settlement</span>
          </div>

          <Link
            href="/templates/saved"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-white transition"
          >
            <FileText className="h-4 w-4" /> View Saved Drafts <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
