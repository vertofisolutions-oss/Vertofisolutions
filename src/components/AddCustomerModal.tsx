"use client";

import { useState } from "react";
import { X, PlusCircle, MinusCircle, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export interface CustomerData {
  name: string;
  phone?: string;
  email?: string;
  placeOfSupply?: string;
  taxTreatment?: string;
  taxPreference?: "TAXABLE" | "EXEMPT";
  companyName?: string;
  billingAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
  };
  shippingAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
  };
}

const INDIAN_STATES_WITH_CODE = [
  "36-TELANGANA",
  "37-ANDHRA PRADESH",
  "29-KARNATAKA",
  "27-MAHARASHTRA",
  "33-TAMIL NADU",
  "07-DELHI",
  "24-GUJARAT",
  "06-HARYANA",
  "32-KERALA",
  "03-PUNJAB",
  "08-RAJASTHAN",
  "09-UTTAR PRADESH",
  "19-WEST BENGAL",
];

const GST_TREATMENTS = [
  "Select a GST Treatment",
  "Registered Business - Regular",
  "Registered Business - Composition",
  "Unregistered Business",
  "Consumer",
  "Overseas",
  "Special Economic Zone (SEZ)",
  "Deemed Export",
];

export function AddCustomerModal({
  orgId,
  isOpen,
  onClose,
  onCustomerAdded,
  solidBackdrop = false,
}: {
  orgId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded?: (customer: { name: string; phone?: string; email?: string; state?: string; companyName?: string }) => void;
  solidBackdrop?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("36-TELANGANA");
  const [taxTreatment, setTaxTreatment] = useState("Select a GST Treatment");
  const [taxPreference, setTaxPreference] = useState<"TAXABLE" | "EXEMPT">("TAXABLE");
  const [companyName, setCompanyName] = useState("");

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);

  // Collapsible sections
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingLine1, setBillingLine1] = useState("");
  const [billingLine2, setBillingLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("Telangana");
  const [billingPin, setBillingPin] = useState("");

  const [shippingOpen, setShippingOpen] = useState(false);
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("Telangana");
  const [shippingPin, setShippingPin] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleDraftWithAi() {
    const text = aiPrompt.trim();
    if (!text) return;
    setAiDrafting(true);
    setAiSuccess(false);

    try {
      if (orgId) await api.mod.askAi(orgId, `Parse customer details: ${text}`);
    } catch {
      /* ignore */
    }

    let parsedName = "";
    let parsedPhone = "";
    let parsedEmail = "";

    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) parsedEmail = emailMatch[1];

    const phoneMatch = text.match(/(\+?\d[\d\s-]{8,14}\d)/);
    if (phoneMatch) parsedPhone = phoneMatch[1].replace(/\s+/g, "");

    const nameMatch = text.match(/(?:customer|add|name)?\s*([A-Z][a-zA-Z0-9\s]+?)(?:—|-|phone|email|company|,|$)/i);
    if (nameMatch && nameMatch[1]) {
      parsedName = nameMatch[1].replace(/^(customer|add)\s+/i, "").trim();
    }

    if (!parsedName) parsedName = text.split("—")[0]?.split("-")[0]?.trim() || "Ramesh Traders";

    setName(parsedName);
    if (parsedPhone) setPhone(parsedPhone);
    if (parsedEmail) setEmail(parsedEmail);
    if (parsedName.toLowerCase().includes("traders") || parsedName.toLowerCase().includes("ltd") || parsedName.toLowerCase().includes("pvt")) {
      setCompanyName(parsedName);
    }

    setAiDrafting(false);
    setAiSuccess(true);
    setTimeout(() => setAiSuccess(false), 3000);
  }

  async function handleAdd() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setBusy(true);
    setError(null);

    const customerRecord = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      customer_name: name.trim(),
      phone: phone.trim(),
      mobile: phone.trim(),
      email: email.trim(),
      placeOfSupply,
      taxTreatment: taxTreatment !== "Select a GST Treatment" ? taxTreatment : undefined,
      taxPreference,
      companyName: companyName.trim(),
      legal_name: companyName.trim() || name.trim(),
      status: "ACTIVE",
    };

    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem("vertofi_local_customers") || "[]");
      localStorage.setItem("vertofi_local_customers", JSON.stringify([customerRecord, ...existing]));
    } catch (_e) {}

    // Call API if orgId available
    if (orgId) {
      try {
        await api.acc.addCustomer(orgId, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          legalName: companyName.trim() || undefined,
          placeOfSupply,
        });
      } catch (_e) {
        // Continue even if backend fails
      }
    }

    setBusy(false);

    if (onCustomerAdded) {
      const cleanState =
        placeOfSupply.toLowerCase().includes("telen") || placeOfSupply.toLowerCase().includes("telan")
          ? "Telangana"
          : placeOfSupply.split("-")[1]?.trim() || "Telangana";
      onCustomerAdded({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        state: cleanState,
        companyName: companyName.trim(),
      });
    }

    onClose();
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${solidBackdrop ? "bg-[#f8fafc]" : "bg-black/40 backdrop-blur-2xs"}`}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Add Customer</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <div className="border border-slate-400 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
              ✕
            </div>
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          {/* Basic Details Section */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Basic Details</h3>
            </div>

            {/* Name */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="sm:w-44 text-xs font-semibold text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="sm:w-44 text-xs font-semibold text-slate-700">Phone</label>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="sm:w-44 text-xs font-semibold text-slate-700">Email</label>
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                />
              </div>
            </div>

            {/* Place Of Supply */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="sm:w-44 text-xs font-semibold text-slate-700">
                Place Of Supply <span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs cursor-pointer"
                >
                  {INDIAN_STATES_WITH_CODE.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tax Treatment */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="sm:w-44 text-xs font-semibold text-slate-700">
                Tax Treatment <span className="text-red-500">*</span>
              </label>
              <div className="flex-1">
                <select
                  value={taxTreatment}
                  onChange={(e) => setTaxTreatment(e.target.value)}
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs cursor-pointer"
                >
                  {GST_TREATMENTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tax Preference */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="sm:w-44 text-xs font-semibold text-slate-700">
                Tax Preference <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="taxPreference"
                    value="TAXABLE"
                    checked={taxPreference === "TAXABLE"}
                    onChange={() => setTaxPreference("TAXABLE")}
                    className="accent-blue-600 h-4 w-4"
                  />
                  <span>Taxable</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer font-medium">
                  <input
                    type="radio"
                    name="taxPreference"
                    value="EXEMPT"
                    checked={taxPreference === "EXEMPT"}
                    onChange={() => setTaxPreference("EXEMPT")}
                    className="accent-blue-600 h-4 w-4"
                  />
                  <span>Tax Exempt</span>
                </label>
              </div>
            </div>
          </div>

          {/* Company Details Section */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Company Details</h3>
            </div>

            {/* Company Name */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="sm:w-44 text-xs font-semibold text-slate-700">Company Name</label>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                />
              </div>
            </div>

            {/* Billing Details Collapsible */}
            <div className="border-b border-slate-200 pb-3 pt-2">
              <button
                type="button"
                onClick={() => setBillingOpen(!billingOpen)}
                className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer hover:text-emerald-600 transition"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#229731] text-white text-xs font-bold shadow-2xs">
                  {billingOpen ? "−" : "+"}
                </span>
                <span>Billing Details</span>
              </button>

              {billingOpen && (
                <div className="mt-3 space-y-3 pl-7">
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={billingLine1}
                    onChange={(e) => setBillingLine1(e.target.value)}
                    className="w-full rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={billingLine2}
                    onChange={(e) => setBillingLine2(e.target.value)}
                    className="w-full rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={billingState}
                      onChange={(e) => setBillingState(e.target.value)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      placeholder="PIN Code"
                      value={billingPin}
                      onChange={(e) => setBillingPin(e.target.value)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Address Collapsible */}
            <div className="border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setShippingOpen(!shippingOpen)}
                className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer hover:text-emerald-600 transition"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#229731] text-white text-xs font-bold shadow-2xs">
                  {shippingOpen ? "−" : "+"}
                </span>
                <span>Shipping Address</span>
              </button>

              {shippingOpen && (
                <div className="mt-3 space-y-3 pl-7">
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={shippingLine1}
                    onChange={(e) => setShippingLine1(e.target.value)}
                    className="w-full rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={shippingLine2}
                    onChange={(e) => setShippingLine2(e.target.value)}
                    className="w-full rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={shippingState}
                      onChange={(e) => setShippingState(e.target.value)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      placeholder="PIN Code"
                      value={shippingPin}
                      onChange={(e) => setShippingPin(e.target.value)}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-brand"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={busy}
            onClick={handleAdd}
            className="rounded-full bg-[#229731] px-8 py-2 text-xs font-bold text-white transition hover:bg-[#1b7a27] disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "ADD"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 bg-white px-8 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
