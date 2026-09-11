"use client";

import React from "react";
import { TemplateDefinition } from "../types";
import { DocumentRenderer } from "../templateEngine/DocumentRenderer";
import { X, CheckCircle2, ArrowRight, ShieldCheck, Printer, Download } from "lucide-react";
import Link from "next/link";

interface TemplatePreviewModalProps {
  template: TemplateDefinition | null;
  onClose: () => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
}) => {
  if (!template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 my-8 flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* LEFT: Live Render Preview Column */}
        <div className="w-full md:w-3/5 bg-slate-100/80 p-6 flex flex-col items-center justify-center overflow-y-auto max-h-[80vh] border-r border-slate-200">
          <div className="w-full max-w-[560px] transform scale-[0.88] sm:scale-100 transition-transform origin-top">
            <DocumentRenderer
              formData={template.defaultFormData}
              templateDef={template}
              zoomLevel={100}
            />
          </div>
        </div>

        {/* RIGHT: Template Details & Call to Action Column */}
        <div className="w-full md:w-2/5 p-8 flex flex-col justify-between space-y-6 bg-white">
          <div className="space-y-5">
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-0.5 text-xs font-bold">
                  {template.category}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    template.tier === "Free"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {template.tier}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{template.name}</h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{template.description}</p>
            </div>

            {/* Included Features List */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Features Included:</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {template.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>A4 Print & Live Vector PDF Export</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Dynamic Items & Automated GST Math</span>
                </li>
              </ul>
            </div>

            {/* Document Specs */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Paper Size:</span>
                <strong className="text-slate-800">{template.paperSize} Standard</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Format:</span>
                <strong className="text-slate-800">Print Ready PDF / HTML</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Brand Identity:</span>
                <strong className="text-blue-700">Vertofi SaaS Engine</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Link
              href={`/templates/${template.slug}/edit`}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              Use This Template <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
