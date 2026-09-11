"use client";

import React, { useState, useMemo } from "react";
import { TEMPLATES_REGISTRY } from "@/templates/templatesData";
import { TemplateCategory, TemplateDefinition } from "@/templates/types";
import { TemplateGalleryHero } from "@/templates/components/TemplateGalleryHero";
import { TemplateFilterBar } from "@/templates/components/TemplateFilterBar";
import { TemplateCard } from "@/templates/components/TemplateCard";
import { TemplatePreviewModal } from "@/templates/components/TemplatePreviewModal";

const CATEGORIES: TemplateCategory[] = [
  "All",
  "Invoices",
  "Quotations",
  "Receipts",
  "Billing",
  "Subscriptions",
  "HR",
  "Finance",
  "Business",
  "Reports",
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("All");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "alphabetical">("popular");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(null);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES_REGISTRY.filter((t) => {
      // Category filter
      if (activeCategory !== "All" && t.category !== activeCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesCat = t.category.toLowerCase().includes(q);
        const matchesFeatures = t.features.some((f) => f.toLowerCase().includes(q));
        return matchesName || matchesDesc || matchesCat || matchesFeatures;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "popular") return b.popularity - a.popularity;
      if (sortBy === "newest") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [searchQuery, activeCategory, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Hero Section */}
        <TemplateGalleryHero
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Filter & Sorting Bar */}
        <TemplateFilterBar
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalResults={filteredTemplates.length}
        />

        {/* Templates Cards Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <h3 className="text-lg font-bold text-slate-800">No templates found matching your search</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query or selecting another category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={(t) => setPreviewTemplate(t)}
              />
            ))}
          </div>
        )}

        {/* High Resolution Preview Modal */}
        {previewTemplate && (
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </div>
    </div>
  );
}
