"use client";

import React, { useState, useEffect } from "react";
import { SavedDocument } from "../types";
import { FileText, Trash2, Edit3, Copy, Download, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export const SavedDocumentsView: React.FC = () => {
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("vertofi_saved_templates");
      if (stored) {
        setSavedDocs(JSON.parse(stored));
      }
    } catch (_e) {}
  }, []);

  const handleDelete = (id: string) => {
    const updated = savedDocs.filter((d) => d.id !== id);
    setSavedDocs(updated);
    try {
      localStorage.setItem("vertofi_saved_templates", JSON.stringify(updated));
    } catch (_e) {}
  };

  const handleDuplicate = (doc: SavedDocument) => {
    const copy: SavedDocument = {
      ...doc,
      id: `DOC-${Date.now()}`,
      docNumber: `${doc.docNumber}-COPY`,
      updatedAt: new Date().toISOString(),
    };
    const updated = [copy, ...savedDocs];
    setSavedDocs(updated);
    try {
      localStorage.setItem("vertofi_saved_templates", JSON.stringify(updated));
    } catch (_e) {}
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Saved Documents & Drafts</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage, duplicate, and edit your saved Vertofi documents</p>
          </div>
        </div>

        <Link
          href="/templates"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Create New Document
        </Link>
      </div>

      {/* Documents List / Table */}
      {savedDocs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Create your first professional document</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Choose a Vertofi template, enter your details, and save drafts or generate print-ready PDFs in seconds.
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition"
          >
            Browse Templates Gallery
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px]">
                <th className="p-4">Ref Number</th>
                <th className="p-4">Template / Category</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Last Modified</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {savedDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-mono font-bold text-blue-700">{doc.docNumber}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{doc.templateName}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{doc.category}</span>
                  </td>
                  <td className="p-4 font-medium text-slate-800">{doc.recipientName || "-"}</td>
                  <td className="p-4 font-bold text-slate-900">₹{Number(doc.amount || 0).toLocaleString("en-IN")}</td>
                  <td className="p-4 text-slate-500">{new Date(doc.updatedAt).toLocaleDateString("en-IN")}</td>
                  <td className="p-4 text-right space-x-2">
                    <Link
                      href={`/templates/${doc.templateId}/edit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 text-xs transition cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-blue-600" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(doc)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
