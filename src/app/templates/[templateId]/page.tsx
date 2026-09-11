"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { TEMPLATES_REGISTRY } from "@/templates/templatesData";
import { DocumentRenderer } from "@/templates/templateEngine/DocumentRenderer";
import { ArrowLeft, CheckCircle2, ArrowRight, ShieldCheck, Printer, Download } from "lucide-react";
import Link from "next/link";

export default function TemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.templateId as string;

  const template = TEMPLATES_REGISTRY.find(
    (t) => t.slug === templateId || t.id === templateId
  );

  if (!template) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Template Not Found</h2>
          <p className="text-xs text-slate-500">The template you requested does not exist or has been removed.</p>
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
    <div className="min-h-screen bg-slate-50/60 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/templates"
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {template.category}
                </span>
                <h1 className="text-xl font-black text-slate-900">{template.name}</h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
            </div>
          </div>

          <Link
            href={`/templates/${template.slug}/edit`}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
          >
            Use This Template <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 2-Column Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Rendered Preview Document (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex justify-center">
            <div className="w-full max-w-[620px]">
              <DocumentRenderer
                formData={template.defaultFormData}
                templateDef={template}
                zoomLevel={100}
              />
            </div>
          </div>

          {/* RIGHT: Metadata & Specifications (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Template Specifications
              </h3>

              <ul className="space-y-2.5 text-xs text-slate-600">
                {template.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Category:</span>
                  <strong className="text-slate-800">{template.category}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paper Format:</span>
                  <strong className="text-slate-800">{template.paperSize} Standard (Print-Ready)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Access Tier:</span>
                  <span className="font-bold text-emerald-700">{template.tier}</span>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Link
                  href={`/templates/${template.slug}/edit`}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  Use This Template <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/templates"
                  className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Browse Other Templates
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
