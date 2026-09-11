"use client";

import React, { useState, useEffect } from "react";
import { DocumentFormData, TemplateDefinition, SavedDocument } from "../types";
import { DocumentRenderer } from "../templateEngine/DocumentRenderer";
import {
  Download,
  Printer,
  Save,
  Copy,
  RotateCcw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  FileText,
  CreditCard,
  Sliders,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowLeft,
  Sparkles,
  Upload,
  X,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface TemplateEditorProps {
  template: TemplateDefinition;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ template }) => {
  const [formData, setFormData] = useState<DocumentFormData>(template.defaultFormData);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit"); // Mobile responsive tabs
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Collapsible Section States
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({
    company: false,
    customer: false,
    docInfo: false,
    items: false,
    totals: true,
    payment: true,
    terms: true,
    branding: true,
  });

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form Field Helper
  const handleChange = (field: keyof DocumentFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Logo Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes("image")) {
        showToast("Logo upload failed. Please select PNG, JPG, JPEG, or SVG.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleChange("logoUrl", event.target.result as string);
          showToast("Company logo uploaded successfully.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Dynamic Item System
  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: "New Software Service / License",
      description: "Service details description",
      hsnSac: "998313",
      quantity: 1,
      rate: 5000,
      discountPct: 0,
      taxPct: 18,
      total: 5900,
    };
    setFormData((prev) => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const updateItem = (index: number, key: string, value: any) => {
    const updated = [...(formData.items || [])];
    const item = { ...updated[index], [key]: value };

    // Calculate item total
    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    const disc = Number(item.discountPct || 0);
    const tax = Number(item.taxPct || 0);

    const net = qty * rate * (1 - disc / 100);
    const gross = net * (1 + tax / 100);

    item.total = Math.round(gross);
    updated[index] = item;
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const duplicateItem = (index: number) => {
    const itemsList = formData.items || [];
    const itemToDup = itemsList[index];
    if (!itemToDup) return;
    const copy = { ...itemToDup, id: Date.now().toString(), name: `${itemToDup.name} (Copy)` };
    const updated = [...itemsList];
    updated.splice(index + 1, 0, copy);
    setFormData((prev) => ({ ...prev, items: updated }));
    showToast("Item duplicated.");
  };

  const removeItem = (index: number) => {
    const itemsList = formData.items || [];
    if (itemsList.length <= 1) {
      showToast("Document must contain at least one line item.");
      return;
    }
    const updated = itemsList.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  // Validation Check
  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!formData.companyName.trim()) errors.push("Company Name is required.");
    if (!formData.customerName.trim() && !formData.customerCompany.trim())
      errors.push("Recipient Customer / Company Name is required.");
    if (!formData.docNumber.trim()) errors.push("Document Reference Number is required.");

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Actions: PDF Download & Print
  const handleDownloadPdf = () => {
    if (!validateForm()) {
      showToast("Please complete required fields before downloading PDF.");
      return;
    }
    window.print();
    showToast("PDF Download triggered successfully!");
  };

  const handlePrint = () => {
    if (!validateForm()) {
      showToast("Please complete required fields before printing.");
      return;
    }
    window.print();
  };

  // Save Draft to LocalStorage
  const handleSaveDraft = () => {
    try {
      const existing = localStorage.getItem("vertofi_saved_templates");
      const savedDocs: SavedDocument[] = existing ? JSON.parse(existing) : [];

      const totalAmount = formData.items?.reduce((a, b) => a + (b.total || 0), 0) || 0;
      const newSavedDoc: SavedDocument = {
        id: `DOC-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        docNumber: formData.docNumber,
        recipientName: formData.customerCompany || formData.customerName,
        amount: totalAmount,
        updatedAt: new Date().toISOString(),
        formData: formData,
      };

      const updatedList = [newSavedDoc, ...savedDocs.filter((d) => d.docNumber !== formData.docNumber)];
      localStorage.setItem("vertofi_saved_templates", JSON.stringify(updatedList));
      showToast("Draft saved successfully to Saved Documents!");
    } catch (_e) {
      showToast("Failed to save draft.");
    }
  };

  // Duplicate Document
  const handleDuplicateDoc = () => {
    setFormData((prev) => ({
      ...prev,
      docNumber: `${prev.docNumber}-COPY`,
    }));
    showToast("Document duplicated as a copy.");
  };

  // Reset Form
  const handleResetForm = () => {
    setFormData(template.defaultFormData);
    showToast("Form reset to original template defaults.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                {template.category}
              </span>
              <h2 className="text-lg font-black text-slate-900">{template.name}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Customize fields, preview in real time, and download PDF</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Save className="h-3.5 w-3.5 text-blue-600" /> Save Draft
          </button>
          <button
            type="button"
            onClick={handleDuplicateDoc}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" /> Duplicate
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" /> Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Validation Errors Box */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-900">
            <AlertCircle className="h-4 w-4 text-rose-600" /> Please complete the following required fields:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-rose-700 pl-2">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile Mode Switcher Tabs */}
      <div className="flex lg:hidden rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === "edit" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
          }`}
        >
          Edit Form
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-2 rounded-lg transition ${
            activeTab === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
          }`}
        >
          Live Preview
        </button>
      </div>

      {/* Main 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Collapsible Form Editor (7 cols) */}
        <div className={`lg:col-span-6 space-y-4 ${activeTab === "preview" ? "hidden lg:block" : "block"}`}>
          {/* SECTION 1: Company Info */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection("company")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Company Information</h3>
              </div>
              {collapsed.company ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {!collapsed.company && (
              <div className="p-4 space-y-3.5 text-xs border-t border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <label className="font-semibold text-slate-700">Company Name *</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleChange("companyName", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* Logo Upload Box */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Logo</label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer text-[11px]">
                      <Upload className="h-3.5 w-3.5 text-blue-600" /> Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tagline / Slogan</label>
                  <input
                    type="text"
                    value={formData.companyTagline || ""}
                    onChange={(e) => handleChange("companyTagline", e.target.value)}
                    placeholder="e.g. Next-Gen Enterprise SaaS"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Address Line</label>
                    <input
                      type="text"
                      value={formData.companyAddress}
                      onChange={(e) => handleChange("companyAddress", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">City, State & Pincode</label>
                    <input
                      type="text"
                      value={formData.companyCityState}
                      onChange={(e) => handleChange("companyCityState", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Company GSTIN</label>
                    <input
                      type="text"
                      value={formData.companyGstin}
                      onChange={(e) => handleChange("companyGstin", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono uppercase text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Company Email</label>
                    <input
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => handleChange("companyEmail", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Recipient / Customer Info */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection("customer")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Customer / Recipient Details</h3>
              </div>
              {collapsed.customer ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {!collapsed.customer && (
              <div className="p-4 space-y-3.5 text-xs border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Recipient Company / Client *</label>
                    <input
                      type="text"
                      value={formData.customerCompany}
                      onChange={(e) => handleChange("customerCompany", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Contact Person Name</label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => handleChange("customerName", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Customer Address</label>
                    <input
                      type="text"
                      value={formData.customerAddress}
                      onChange={(e) => handleChange("customerAddress", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">City & State</label>
                    <input
                      type="text"
                      value={formData.customerCityState}
                      onChange={(e) => handleChange("customerCityState", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Customer GSTIN</label>
                    <input
                      type="text"
                      value={formData.customerGstin}
                      onChange={(e) => handleChange("customerGstin", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono uppercase text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Customer Email</label>
                    <input
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleChange("customerEmail", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Document Metadata */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection("docInfo")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Document Metadata</h3>
              </div>
              {collapsed.docInfo ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {!collapsed.docInfo && (
              <div className="p-4 space-y-3.5 text-xs border-t border-slate-100">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Ref Number *</label>
                    <input
                      type="text"
                      value={formData.docNumber}
                      onChange={(e) => handleChange("docNumber", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold text-blue-700 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Issue Date</label>
                    <input
                      type="date"
                      value={formData.docDate}
                      onChange={(e) => handleChange("docDate", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Due / Valid Date</label>
                    <input
                      type="date"
                      value={formData.dueDate || formData.validUntilDate || ""}
                      onChange={(e) => {
                        handleChange("dueDate", e.target.value);
                        handleChange("validUntilDate", e.target.value);
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Place of Supply</label>
                    <input
                      type="text"
                      value={formData.placeOfSupply || ""}
                      onChange={(e) => handleChange("placeOfSupply", e.target.value)}
                      placeholder="e.g. 36-TELANGANA"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Billing Cycle / Plan</label>
                    <input
                      type="text"
                      value={formData.subscriptionPlan || formData.billingPeriod || ""}
                      onChange={(e) => {
                        handleChange("subscriptionPlan", e.target.value);
                        handleChange("billingPeriod", e.target.value);
                      }}
                      placeholder="e.g. Enterprise Annual SaaS"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Dynamic Item Table System */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection("items")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Services & Items Table ({formData.items?.length || 0})
                </h3>
              </div>
              {collapsed.items ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {!collapsed.items && (
              <div className="p-4 space-y-4 border-t border-slate-100">
                {(formData.items || []).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-700 text-[11px]">Item #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-200 transition cursor-pointer"
                          title="Duplicate item"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200 transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                        placeholder="Service / Item Name"
                        className="rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 bg-white outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Detailed Description"
                        className="rounded-lg border border-slate-300 p-2 text-xs text-slate-800 bg-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <label className="text-[10px] text-slate-500 block">HSN/SAC</label>
                        <input
                          type="text"
                          value={item.hsnSac || ""}
                          onChange={(e) => updateItem(idx, "hsnSac", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 p-1.5 font-mono text-xs bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 p-1.5 font-bold text-xs bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Rate (₹)</label>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 p-1.5 font-bold text-xs bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Tax (%)</label>
                        <input
                          type="number"
                          value={item.taxPct}
                          onChange={(e) => updateItem(idx, "taxPct", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 p-1.5 text-xs bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Another Service / Item
                </button>
              </div>
            )}
          </div>

          {/* SECTION 5: Payment Info & UPI */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection("payment")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bank & UPI Settlement</h3>
              </div>
              {collapsed.payment ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
            </button>

            {!collapsed.payment && (
              <div className="p-4 space-y-3.5 text-xs border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Payment Status</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => handleChange("paymentStatus", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="UNPAID">UNPAID</option>
                      <option value="PAID">PAID</option>
                      <option value="PENDING">PENDING</option>
                      <option value="PARTIAL">PARTIAL</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">UPI VPA Handle</label>
                    <input
                      type="text"
                      value={formData.upiId || ""}
                      onChange={(e) => handleChange("upiId", e.target.value)}
                      placeholder="e.g. company@icici"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName || ""}
                      onChange={(e) => handleChange("bankName", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Bank Account Number</label>
                    <input
                      type="text"
                      value={formData.bankAccountNo || ""}
                      onChange={(e) => handleChange("bankAccountNo", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Document Preview & Controls (6 cols) */}
        <div className={`lg:col-span-6 space-y-4 ${activeTab === "edit" ? "hidden lg:block" : "block"}`}>
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-slate-900 p-4 shadow-xl text-white space-y-4">
            {/* Preview Toolbar Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
              <span className="font-extrabold flex items-center gap-2 text-slate-200">
                <Sparkles className="h-4 w-4 text-amber-400" /> Real-time Live Document Preview
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 10, 60))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold w-12 text-center">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 10, 140))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="px-2 py-1 rounded bg-slate-800 text-[10px] font-semibold hover:bg-slate-700 transition"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Render Container */}
            <div className="bg-slate-800/60 rounded-xl p-4 overflow-y-auto max-h-[780px] flex items-center justify-center">
              <DocumentRenderer
                formData={formData}
                templateDef={template}
                zoomLevel={zoomLevel}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
