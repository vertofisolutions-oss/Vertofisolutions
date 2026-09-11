"use client";
import { useState } from "react";
import { Loader2, Play, X, Video } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export function AddCategoryView({
  orgId,
  onClose,
  onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tutorial Modal State
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [language, setLanguage] = useState<"Hindi" | "English">("Hindi");

  async function create() {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acc.addProduct(orgId, {
        name: `${name.trim()} (Category Sample)`,
        category: name.trim(),
        rate: 0,
        taxRate: 18,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.code.replaceAll("_", " ") : "Failed to add category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="w-full space-y-4">
        {/* Main Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
          
          {/* Header Title */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
            <h2 className="text-[20px] font-bold text-slate-800 tracking-tight">Add New Product Category</h2>
          </div>

          {/* 2-Column Form Fields */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">
                Category Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                placeholder="Product Category Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-[13px] text-slate-800 outline-none focus:border-red-500 shadow-sm transition placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600">Description</label>
              <input
                type="text"
                placeholder="Product Category short Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-[13px] text-slate-800 outline-none focus:border-red-500 shadow-sm transition placeholder:text-slate-400"
              />
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-[#ef4444]">{error}</p>}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={create}
              className="inline-flex items-center justify-center rounded-full bg-[#22c55e] px-8 py-2.5 text-[13px] font-bold text-white transition hover:bg-green-600 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Category"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial Video Modal */}
      {tutorialOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="relative flex items-center justify-center border-b border-slate-200 py-4">
              <h2 className="text-xl font-medium text-slate-800">Add Category Tutorial Video</h2>
              <button
                type="button"
                onClick={() => setTutorialOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
              
              {/* Language Selector */}
              <div className="flex flex-col items-center gap-4 mb-8">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Please Choose Your Language</h3>
                <div className="flex items-center gap-3 font-semibold text-slate-800 text-lg">
                  <span className={language === "Hindi" ? "text-slate-800" : "text-slate-500"}>Hindi</span>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      language === "English" ? "bg-slate-800" : "bg-slate-300"
                    }`}
                    onClick={() => setLanguage(language === "Hindi" ? "English" : "Hindi")}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        language === "English" ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className={language === "English" ? "text-slate-800" : "text-slate-500"}>English</span>
                </div>
              </div>

              {/* Video Container */}
              <div className="w-full border border-slate-200 rounded-sm p-4 pt-6 flex flex-col items-center shadow-sm">
                <p className="text-[15px] text-slate-500 mb-6 font-medium">Learn how to add category easily step by step.</p>
                
                <div className="relative w-full aspect-video bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center group cursor-pointer">
                  {/* Mock Video Thumbnail background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-200 opacity-50"></div>
                  
                  {/* Big Play Button */}
                  <div className="relative z-10 w-20 h-20 bg-slate-800/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:bg-slate-900 transition-all">
                    <Play className="h-8 w-8 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </>
  );
}
