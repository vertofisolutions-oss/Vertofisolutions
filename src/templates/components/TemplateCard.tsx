"use client";

import React from "react";
import { TemplateDefinition } from "../types";
import { Eye, ArrowRight, Sparkles, CheckCircle, FileText, QrCode } from "lucide-react";
import Link from "next/link";

interface TemplateCardProps {
  template: TemplateDefinition;
  onPreview: (template: TemplateDefinition) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
}) => {
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1">
      {/* Top Thumbnail Box */}
      <div className="relative p-5 bg-slate-50/70 min-h-[290px] flex items-center justify-center border-b border-slate-100 overflow-hidden">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <span className="rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider">
            {template.category}
          </span>
          {template.isNew && (
            <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 shadow-xs">
              <Sparkles className="h-3 w-3" /> NEW
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 z-10">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider shadow-2xs ${
              template.tier === "Free"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {template.tier}
          </span>
        </div>

        {/* Realistic Thumbnail Document Box */}
        <div className="w-full bg-white rounded-lg border border-slate-200 p-3 shadow-2xs text-[9px] leading-tight space-y-2 select-none pointer-events-none transform group-hover:scale-[1.02] transition-transform duration-300">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded border border-blue-200 bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-700">
                VER
              </div>
              <div>
                <p className="font-bold text-slate-900 text-[10px]">NovaTech Systems</p>
                <p className="text-slate-400 text-[7px]">GSTIN: 36AABCN1234F1Z5</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-[8px] text-blue-600 uppercase">
                {template.name.replace("Vertofi ", "").toUpperCase()}
              </span>
              <p className="text-slate-400 text-[7px]">Ref: {template.defaultFormData.docNumber}</p>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-1.5 text-[7.5px] bg-slate-50 p-1.5 rounded border border-slate-100">
            <div>
              <p className="font-bold text-slate-700">Recipient:</p>
              <p className="text-slate-500 truncate">{template.defaultFormData.customerCompany || template.defaultFormData.customerName}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-700">Date:</p>
              <p className="text-slate-500">{template.defaultFormData.docDate}</p>
            </div>
          </div>

          {/* Items Preview */}
          <div className="border border-slate-100 rounded overflow-hidden">
            <div className="bg-slate-100 text-slate-700 font-bold p-1 text-[7.5px] flex justify-between">
              <span>ITEM DESCRIPTION</span>
              <span>AMOUNT</span>
            </div>
            <div className="p-1 space-y-1 text-[7.5px] divide-y divide-slate-50">
              {(template.defaultFormData.items || []).slice(0, 2).map((item) => (
                <div key={item.id} className="flex justify-between pt-0.5 text-slate-600">
                  <span className="truncate max-w-[120px] font-medium">{item.name}</span>
                  <span className="font-bold text-slate-900">₹{item.total.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end pt-1 border-t border-slate-100 text-[7.5px]">
            <div className="flex items-center gap-1">
              <QrCode className="h-4 w-4 text-slate-700" />
              <span className="text-slate-400">UPI Verified</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Total Amount: </span>
              <span className="font-black text-[10px] text-blue-700">
                ₹
                {(
                  template.defaultFormData.items?.reduce((a, b) => a + b.total, 0) || 0
                ).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Hover Overlay with Action Buttons */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 p-4 z-20">
          <button
            type="button"
            onClick={() => onPreview(template)}
            className="w-36 py-2 rounded-full bg-white text-slate-800 text-xs font-bold shadow-lg hover:bg-slate-100 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-blue-600" /> Preview
          </button>

          <Link
            href={`/templates/${template.slug}/edit`}
            className="w-36 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            Use Template <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Card Information Body */}
      <div className="p-5 space-y-3 bg-white">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition">
            {template.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPreview(template)}
            className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition"
          >
            <Eye className="h-3.5 w-3.5" /> Quick View
          </button>

          <Link
            href={`/templates/${template.slug}/edit`}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
          >
            Use Template <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
