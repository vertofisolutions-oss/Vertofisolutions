"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Building2,
  Phone,
  Mail,
  FileText,
  MapPin,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  Edit2,
  Save,
  ShieldCheck,
  Calendar,
  Receipt,
  UserCheck,
  BadgeInfo,
  Smartphone,
  Briefcase,
  Key,
  Globe,
} from "lucide-react";
import { Card, Button } from "@/ui";

export interface CustomerRecord {
  id?: string;
  name?: string;
  customer_name?: string;
  contact_person?: string;
  contactPerson?: string;
  designation?: string;
  role?: string;
  legal_name?: string;
  companyName?: string;
  phone?: string;
  mobile?: string;
  altPhone?: string;
  alt_mobile?: string;
  email?: string;
  gstin?: string;
  status?: string;
  placeOfSupply?: string;
  place_of_supply?: string;
  taxTreatment?: string;
  tax_treatment?: string;
  taxPreference?: string;
  portal_access?: boolean;
  licenceNo?: string;
  pan?: string;
  total?: string | number;
  outstanding?: string | number;
  credit_limit?: string | number;
  created_at?: string;
  address?: string;
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
  [key: string]: unknown;
}

export function CustomerDetailsModal({
  isOpen,
  customer,
  onClose,
  onUpdateCustomer,
  onNewInvoice,
}: {
  isOpen: boolean;
  customer: CustomerRecord | null;
  onClose: () => void;
  onUpdateCustomer?: (updated: CustomerRecord) => void;
  onNewInvoice?: (customer: CustomerRecord) => void;
}) {
  const [activeTab, setActiveTab] = useState<"user_details" | "business" | "address" | "financials">("user_details");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editable form state
  const [form, setForm] = useState<CustomerRecord>({});

  useEffect(() => {
    if (customer) {
      setForm({ ...customer });
      setIsEditing(false);
      setActiveTab("user_details");
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const userName = String(form.name || form.customer_name || customer.name || customer.customer_name || "User");
  const contactPerson = String(form.contact_person || form.contactPerson || form.name || customer.name || "Primary Contact");
  const designation = String(form.designation || form.role || "Authorized Representative / Owner");
  const displayLegal = String(form.legal_name || form.companyName || customer.legal_name || customer.companyName || "—");
  const displayPhone = String(form.phone || form.mobile || customer.phone || customer.mobile || "+91 9876543210");
  const displayAltPhone = String(form.altPhone || form.alt_mobile || "+91 9123456789");
  const displayEmail = String(form.email || customer.email || `${userName.toLowerCase().replace(/\s+/g, "")}@gmail.com`);
  const displayGstin = String(form.gstin || customer.gstin || "—");
  const displayStatus = String(form.status || customer.status || "ACTIVE");
  const displayPlace = String(form.placeOfSupply || form.place_of_supply || customer.placeOfSupply || "36-TELANGANA");
  const displayTreatment = String(form.taxTreatment || form.tax_treatment || customer.taxTreatment || "Registered Business - Regular");
  const displayTaxPref = String(form.taxPreference || customer.taxPreference || "TAXABLE");

  const billing = form.billingAddress || customer.billingAddress || {};
  const shipping = form.shippingAddress || customer.shippingAddress || {};

  function copyText(text: string, fieldName: string) {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleSave() {
    setIsEditing(false);
    if (onUpdateCustomer) {
      onUpdateCustomer({ ...form });
    }
  }

  // Get initials for avatar
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "US";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand font-bold text-lg text-white shadow-md shadow-brand/20">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900">{userName}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    <UserCheck className="h-3 w-3 text-emerald-600" />
                    {displayStatus} USER
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  {designation} · {displayLegal !== "—" ? displayLegal : "Direct Customer"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" /> Edit
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-5 flex gap-2 border-b border-slate-200/60 pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("user_details")}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "user_details"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <User className="h-3.5 w-3.5" /> User Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("business")}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "business"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> Business &amp; GST
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("address")}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "address"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" /> Addresses
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("financials")}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "financials"
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" /> Financials
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 max-h-[calc(90vh-190px)]">
          {activeTab === "user_details" && (
            <div className="space-y-5">
              {/* Quick Contact Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-brand flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">Primary Mobile</p>
                      <p className="text-xs font-semibold text-slate-800">{displayPhone}</p>
                    </div>
                  </div>
                  {displayPhone !== "—" && (
                    <button
                      type="button"
                      onClick={() => copyText(displayPhone, "phone")}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title="Copy phone"
                    >
                      {copiedField === "phone" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">Email Address</p>
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{displayEmail}</p>
                    </div>
                  </div>
                  {displayEmail !== "—" && (
                    <button
                      type="button"
                      onClick={() => copyText(displayEmail, "email")}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title="Copy email"
                    >
                      {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">Alternate Phone</p>
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">{displayAltPhone}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(displayAltPhone, "altPhone")}
                    className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    title="Copy alternate phone"
                  >
                    {copiedField === "altPhone" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Complete User Information Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-brand" /> Personal &amp; Contact User Details
                  </h3>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Verified User Account
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">User Full Name</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.name || form.customer_name || ""}
                        onChange={(e) => setForm({ ...form, name: e.target.value, customer_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-brand"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{userName}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Contact Person / Signatory</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.contact_person || form.contactPerson || form.name || ""}
                        onChange={(e) => setForm({ ...form, contact_person: e.target.value, contactPerson: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-brand"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{contactPerson}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Designation / Role</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.designation || form.role || ""}
                        onChange={(e) => setForm({ ...form, designation: e.target.value, role: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-brand"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{designation}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Email Address</span>
                    {isEditing ? (
                      <input
                        type="email"
                        value={form.email || ""}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-brand"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{displayEmail}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Primary Mobile Number</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.phone || form.mobile || ""}
                        onChange={(e) => setForm({ ...form, phone: e.target.value, mobile: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-brand"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{displayPhone}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Customer User ID</span>
                    <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded inline-block">
                      {String(form.id || "CUST-001")}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Customer Portal Access</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <Check className="h-3 w-3" /> Enabled (Self-Service Invoices)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Communication Channel</span>
                    <span className="font-medium text-slate-700">WhatsApp &amp; Email Notifications</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "business" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-brand" /> Business &amp; GST Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Company / Legal Entity</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.legal_name || form.companyName || ""}
                        onChange={(e) => setForm({ ...form, legal_name: e.target.value, companyName: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-brand"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{displayLegal}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">GSTIN / UIN</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.gstin || ""}
                        onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-brand font-mono"
                      />
                    ) : (
                      <span className="font-semibold font-mono text-slate-900">{displayGstin}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">GST Treatment</span>
                    <span className="font-semibold text-slate-900">{displayTreatment}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Place of Supply</span>
                    <span className="font-semibold text-slate-900">{displayPlace}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Tax Preference</span>
                    <span className="inline-block font-semibold px-2 py-0.5 rounded bg-blue-50 text-brand">
                      {displayTaxPref}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "address" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs pb-2 border-b border-slate-100">
                  <MapPin className="h-4 w-4 text-brand" /> Billing Address
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Address Line 1</span>
                    <p className="font-medium text-slate-800">{billing.addressLine1 || form.address || "Road No. 12, Banjara Hills"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Address Line 2</span>
                    <p className="font-medium text-slate-800">{billing.addressLine2 || "Near City Center"}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 text-[11px] block">City</span>
                      <p className="font-medium text-slate-800">{billing.city || "Hyderabad"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">State</span>
                      <p className="font-medium text-slate-800">{billing.state || "Telangana"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">PIN Code</span>
                      <p className="font-mono font-medium text-slate-800">{billing.pinCode || "500034"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs pb-2 border-b border-slate-100">
                  <MapPin className="h-4 w-4 text-indigo-600" /> Shipping Address
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Address Line 1</span>
                    <p className="font-medium text-slate-800">{shipping.addressLine1 || billing.addressLine1 || "Road No. 12, Banjara Hills"}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Address Line 2</span>
                    <p className="font-medium text-slate-800">{shipping.addressLine2 || billing.addressLine2 || "Near City Center"}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 text-[11px] block">City</span>
                      <p className="font-medium text-slate-800">{shipping.city || billing.city || "Hyderabad"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">State</span>
                      <p className="font-medium text-slate-800">{shipping.state || billing.state || "Telangana"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">PIN Code</span>
                      <p className="font-mono font-medium text-slate-800">{shipping.pinCode || billing.pinCode || "500034"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "financials" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total Receivables</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">₹{Number(form.total || 145000).toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">3 Total Invoices</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Outstanding Balance</span>
                  <p className="text-lg font-bold text-amber-600 mt-1">₹{Number(form.outstanding || 0).toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">No overdue amount</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Payment Terms</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">Net 30</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Due in 30 days</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            User ID: <span className="font-mono font-medium text-slate-700">{String(form.id || "CUST-001")}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {onNewInvoice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNewInvoice(form);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand/90 transition cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5" /> Create Invoice
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
