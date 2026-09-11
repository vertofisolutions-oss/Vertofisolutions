"use client";

import React from "react";
import { SavedDocumentsView } from "@/templates/components/SavedDocumentsView";

export default function SavedTemplatesPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SavedDocumentsView />
      </div>
    </div>
  );
}
