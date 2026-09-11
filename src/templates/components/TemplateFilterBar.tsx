"use client";

import React from "react";
import { TemplateCategory } from "../types";
import { SlidersHorizontal } from "lucide-react";

interface TemplateFilterBarProps {
  categories: TemplateCategory[];
  activeCategory: TemplateCategory;
  onSelectCategory: (cat: TemplateCategory) => void;
  sortBy: "popular" | "newest" | "alphabetical";
  onSortChange: (sort: "popular" | "newest" | "alphabetical") => void;
  totalResults: number;
}

export const TemplateFilterBar: React.FC<TemplateFilterBarProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  totalResults,
}) => {
  return (
    <div className="space-y-4">
      {/* Category Pills bar */}
      <div className="rounded-2xl bg-white p-3 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#0B132B] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header & Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs">
        <p className="text-slate-500 font-medium">
          Showing <strong className="text-slate-800 font-bold">{totalResults}</strong> professional templates
        </p>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest First</option>
            <option value="alphabetical">A - Z</option>
          </select>
        </div>
      </div>
    </div>
  );
};
