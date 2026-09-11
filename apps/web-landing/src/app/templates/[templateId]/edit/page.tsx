"use client";

import React from "react";
import { useParams } from "next/navigation";
import { TEMPLATES_REGISTRY } from "@/templates/templatesData";
import { TemplateEditor } from "@/templates/components/TemplateEditor";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TemplateEditPage() {
  const params = useParams();
  const templateId = params?.templateId as string;

  const template = TEMPLATES_REGISTRY.find(
    (t) => t.slug === templateId || t.id === templateId
  );

  if (!template) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Template Not Found</h2>
          <p className="text-xs text-slate-500">The requested template could not be loaded.</p>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Templates Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TemplateEditor template={template} />
      </div>
    </div>
  );
}
