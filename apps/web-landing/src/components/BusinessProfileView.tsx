"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pencil, User, MapPin, AlertCircle, CheckCircle2, X, Lock, Building2,
  Sliders, ShieldCheck, Bell, QrCode, Users, Landmark, LayoutTemplate, Eye, Palette, Check, ArrowLeft, Sparkles, Download, Printer, Edit3, Plus, Trash2, ArrowUpRight, Shield, Zap, AlertTriangle, Wallet, Banknote, ArrowUpDown
} from "lucide-react";
import { api, getOrgId } from "@/lib/api";
import { decodeClaims } from "@/lib/auth";
import { getPlanLimits, getRecommendedPlanByTurnover, PlanLimits, PLANS, ADD_ONS } from "@/lib/plans";
import { TEMPLATES_REGISTRY } from "@/templates/templatesData";
import { TemplateEditor } from "@/templates/components/TemplateEditor";
import { DocumentRenderer } from "@/templates/templateEngine/DocumentRenderer";
import { TemplateDefinition } from "@/templates/types";

export interface TeamAccount {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: "OWNER" | "ADMIN" | "ACCOUNTANT" | "BILLING" | "SALES" | "VIEWER";
  status: "ACTIVE" | "INVITED";
  addedAt: string;
}


interface ProfileData {
  name: string;
  email: string;
  mobile: string;
  altMobile: string;
  aadhaar: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  address: string;
}

interface AssignedProfessional {
  id: string;
  vertofiId: string;
  requestedAt: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
}

const DEFAULT_PROFILE: ProfileData = {
  name: "",
  email: "",
  mobile: "",
  altMobile: "",
  aadhaar: "",
  country: "India",
  state: "",
  city: "",
  postalCode: "",
  address: "",
};

const SETTINGS_TABS = [
  "My Profile",
  "Change Password",
  "Company Settings",
  "Prefix Settings",
  "Template Settings",
  "User Security",
  "Notification Setting",
  "Manage UPI",
  "Role Access",
  "Manage Accounts",
] as const;

type TabType = typeof SETTINGS_TABS[number];

export function BusinessProfileView() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "role-access") return "Role Access";
    return "My Profile";
  });
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [editingSection, setEditingSection] = useState<"personal" | "address" | null>(null);
  const [editForm, setEditForm] = useState<ProfileData>(DEFAULT_PROFILE);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deactivated, setDeactivated] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);

  // Secondary tabs state
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    legalName: "My Business",
    tradeName: "My Business",
    gstin: "",
    pan: "",
    businessType: "PROPRIETORSHIP",
    industry: "General Commerce",
    turnover: "",
    plan: "FREE",
  });
  const [companySaved, setCompanySaved] = useState(false);

  const activePlanName = (() => {
    const p = companyForm.plan || "FREE";
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  })();

  const [prefixForm, setPrefixForm] = useState({
    invoicePrefix: "INV-",
    invoiceSeq: "0001",
    quotationPrefix: "QT-",
    challanPrefix: "DC-",
    creditNotePrefix: "CN-",
    debitNotePrefix: "DN-",
  });
  const [prefixSaved, setPrefixSaved] = useState(false);

  // Template Settings State
  const [templateForm, setTemplateForm] = useState({
    theme: "modern",
    primaryColor: "#1E60D5",
    fontFamily: "Inter",
    showLogo: true,
    showQr: true,
    showSignature: true,
    showBankDetails: true,
    showTerms: true,
    headerTitle: "TAX INVOICE",
    footerNotes: "Thank you for your business! For any queries, reach out at support@vertofi.com.",
  });
  const [templateSaved, setTemplateSaved] = useState(false);

  const [docTypeTab, setDocTypeTab] = useState<string>("Sale Invoice");
  const [selectedTemplate, setSelectedTemplate] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vertofi_selected_template");
        if (saved && !isNaN(Number(saved))) return Number(saved);
        const stored = localStorage.getItem("vertofi_invoice_template_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.templateId) return Number(parsed.templateId);
          if (parsed.selectedTemplate) return Number(parsed.selectedTemplate);
        }
      } catch {}
    }
    return 1;
  });
  const [previewModal, setPreviewModal] = useState<number | null>(null);
  const [activeEditorTemplate, setActiveEditorTemplate] = useState<TemplateDefinition | null>(null);

  const [securityState, setSecurityState] = useState({
    twoFactor: true,
    ipLock: false,
  });

  const [notifState, setNotifState] = useState({
    emailInvoices: true,
    smsReceipts: true,
    whatsappUpdates: true,
    taxAlerts: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const [upiForm, setUpiForm] = useState({
    vpa: "vertofi@icici",
    merchantName: "VERTOFI SOLUTIONS",
    autoQr: true,
  });
  const [upiSaved, setUpiSaved] = useState(false);

  // Assigned CAs & Accountants state
  const [proVertofiId, setProVertofiId] = useState("");
  const [professionals, setProfessionals] = useState<AssignedProfessional[]>([]);
  const [proError, setProError] = useState<string | null>(null);
  const [proSuccess, setProSuccess] = useState<string | null>(null);

  // Team & User Accounts State
  const [teamAccounts, setTeamAccounts] = useState<TeamAccount[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ name: string; email: string; mobile: string; role: TeamAccount["role"] }>({
    name: "",
    email: "",
    mobile: "",
    role: "ACCOUNTANT",
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);


  // Dynamic user data loading
  useEffect(() => {
    setMounted(true);
    async function loadUserData() {
      let currentData = { ...DEFAULT_PROFILE };
      try {
        const stored = localStorage.getItem("vertofi_business_profile");
        const storedName = localStorage.getItem("vertofi_user_name");
        const storedPlan = localStorage.getItem("vertofi.plan");
        const storedTurnover = localStorage.getItem("vertofi_business_turnover");
        if (stored) {
          const parsed = JSON.parse(stored);
          currentData = { ...currentData, ...parsed };
          setCompanyForm((prev) => ({
            ...prev,
            legalName: parsed.legalName || parsed.name || prev.legalName,
            tradeName: parsed.tradeName || parsed.legalName || parsed.name || prev.tradeName,
            gstin: parsed.gstin || prev.gstin,
            pan: parsed.pan || prev.pan,
            businessType: parsed.businessType || prev.businessType,
            industry: parsed.industry || prev.industry,
            turnover: storedTurnover || prev.turnover,
            plan: storedPlan || parsed.plan || prev.plan,
          }));
        } else if (storedName) {
          setCompanyForm((prev) => ({
            ...prev,
            legalName: storedName,
            tradeName: storedName,
            plan: storedPlan || prev.plan,
            turnover: storedTurnover || prev.turnover,
          }));
        }
      } catch (_e) {}

      try {
        const savedTmpl = localStorage.getItem("vertofi_selected_template");
        if (savedTmpl && !isNaN(Number(savedTmpl))) {
          setSelectedTemplate(Number(savedTmpl));
        }
        const storedTemplate = localStorage.getItem("vertofi_invoice_template_settings");
        if (storedTemplate) {
          const parsed = JSON.parse(storedTemplate);
          setTemplateForm((prev) => ({ ...prev, ...parsed }));
          if (!savedTmpl && (parsed.templateId || parsed.selectedTemplate)) {
            setSelectedTemplate(Number(parsed.templateId || parsed.selectedTemplate));
          }
        }
      } catch (_e) {}

      try {
        const cachedEmail = localStorage.getItem("vertofi_user_email");
        if (cachedEmail) currentData.email = cachedEmail;
        const cachedMobile = localStorage.getItem("vertofi_user_mobile");
        if (cachedMobile) currentData.mobile = cachedMobile;
        const cachedName = localStorage.getItem("vertofi_user_name");
        if (cachedName) currentData.name = cachedName;
        const cachedState = localStorage.getItem("vertofi_user_state");
        if (cachedState) currentData.state = cachedState;
      } catch (_e) {}

      try {
        const claims = decodeClaims();
        if (claims?.sub) {
          if (claims.sub.includes("@")) currentData.email = claims.sub;
          else if (/^\d{10}$/.test(claims.sub)) currentData.mobile = claims.sub;
        }
      } catch (_e) {}

      try {
        const me = await api.me().catch(() => null);
        if (me) {
          if (me.email) currentData.email = me.email;
          if (me.mobile) currentData.mobile = me.mobile;
          const meName = (me as unknown as { name?: string }).name;
          if (meName) currentData.name = meName;
        }
      } catch (_e) {}

      const oid = getOrgId() || "demo-business-org";
      if (oid) {
        try {
          const org = (await api.mod.org(oid).catch(() => null)) as Record<string, unknown> | null;
          if (org) {
            const owner = String(org.owner_name ?? org.ownerName ?? "");
            if (owner && owner !== "undefined" && owner !== "null") currentData.name = owner;
            const orgEmail = String(org.email ?? "");
            if (orgEmail && orgEmail !== "undefined" && orgEmail !== "null") currentData.email = orgEmail;
            const orgMobile = String(org.mobile ?? org.phone ?? "");
            if (orgMobile && orgMobile !== "undefined" && orgMobile !== "null") currentData.mobile = orgMobile;
            const orgState = String(org.state ?? "");
            if (orgState && orgState !== "undefined" && orgState !== "null") currentData.state = orgState;
            const orgCity = String(org.city ?? "");
            if (orgCity && orgCity !== "undefined" && orgCity !== "null") currentData.city = orgCity;
            const orgAddress = String(org.address ?? org.address_line ?? org.addressLine ?? "");
            if (orgAddress && orgAddress !== "undefined" && orgAddress !== "null") currentData.address = orgAddress;
            const orgPostal = String(org.postal_code ?? org.postalCode ?? org.pincode ?? "");
            if (orgPostal && orgPostal !== "undefined" && orgPostal !== "null") currentData.postalCode = orgPostal;
            const orgCountry = String(org.country ?? "");
            if (orgCountry && orgCountry !== "undefined" && orgCountry !== "null") currentData.country = orgCountry;

            const storedTurnover = localStorage.getItem("vertofi_business_turnover") || String(org.turnover ?? "40L_1_5CR");
            const storedPlan = localStorage.getItem("vertofi.plan") || (storedTurnover === "5CR_PLUS" ? "ENTERPRISE" : storedTurnover === "1_5CR_5CR" ? "POWER" : storedTurnover === "UNDER_40L" ? "STARTER" : "GROWTH");
            setCompanyForm((prev) => ({
              ...prev,
              legalName: String(org.legal_name ?? org.legalName ?? prev.legalName),
              gstin: String(org.gstin ?? prev.gstin),
              pan: String(org.pan ?? prev.pan),
              businessType: String(org.business_type ?? org.businessType ?? prev.businessType),
              industry: String(org.industry ?? prev.industry),
              turnover: storedTurnover,
              plan: storedPlan,
            }));
          }
        } catch (_e) {}

        try {
          const onb = (await api.onboarding(oid).catch(() => null)) as { sections?: Record<string, Record<string, unknown>> } | null;
          if (onb?.sections) {
            const secOwner = onb.sections.owner;
            if (secOwner) {
              if (secOwner.ownerName) currentData.name = String(secOwner.ownerName);
              if (secOwner.ownerEmail) currentData.email = String(secOwner.ownerEmail);
              if (secOwner.ownerMobile) currentData.mobile = String(secOwner.ownerMobile);
              if (secOwner.altMobile || secOwner.alternateMobile) {
                currentData.altMobile = String(secOwner.altMobile || secOwner.alternateMobile);
              }
              if (secOwner.aadhaar || secOwner.ownerAadhaar) {
                currentData.aadhaar = String(secOwner.aadhaar || secOwner.ownerAadhaar);
              }
            }
            const secBiz = onb.sections.business;
            if (secBiz) {
              if (secBiz.state) currentData.state = String(secBiz.state);
              if (secBiz.city) currentData.city = String(secBiz.city);
              if (secBiz.pincode) currentData.postalCode = String(secBiz.pincode);
              if (secBiz.addressLine || secBiz.address) {
                currentData.address = String(secBiz.addressLine || secBiz.address);
              }
            }
          }
        } catch (_e) {}
      }

      try {
        const savedPros = localStorage.getItem("vertofi_assigned_professionals");
        if (savedPros) {
          setProfessionals(JSON.parse(savedPros));
        }
      } catch (_e) {}

      try {
        const savedTeam = localStorage.getItem("vertofi_team_accounts");
        if (savedTeam) {
          setTeamAccounts(JSON.parse(savedTeam));
        } else {
          const ownerAccount: TeamAccount = {
            id: "usr-owner-1",
            name: currentData.name || "Business Owner",
            email: currentData.email || "owner@company.com",
            mobile: currentData.mobile || "",
            role: "OWNER",
            status: "ACTIVE",
            addedAt: "Primary Account",
          };
          setTeamAccounts([ownerAccount]);
          localStorage.setItem("vertofi_team_accounts", JSON.stringify([ownerAccount]));
        }
      } catch (_e) {}

      setProfile(currentData);
      setEditForm(currentData);
    }

    loadUserData();
  }, []);

  function handleSendProRequest(e: React.FormEvent) {
    e.preventDefault();
    setProError(null);
    setProSuccess(null);
    const trimmed = proVertofiId.trim().toUpperCase();
    if (!trimmed) {
      setProError("Please enter a valid Vertofi ID (looks like VRU-1A2B3C4D).");
      return;
    }
    if (professionals.some((p) => p.vertofiId === trimmed)) {
      setProError(`A request for ${trimmed} has already been sent.`);
      return;
    }
    const newPro: AssignedProfessional = {
      id: String(Date.now()),
      vertofiId: trimmed,
      requestedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "PENDING",
    };
    const updated = [newPro, ...professionals];
    setProfessionals(updated);
    setProVertofiId("");
    setProSuccess(`Request sent to ${trimmed}! They will confirm from their panel before gaining access.`);
    try {
      localStorage.setItem("vertofi_assigned_professionals", JSON.stringify(updated));
    } catch (_e) {}
  }

  function handleRemovePro(id: string) {
    const updated = professionals.filter((p) => p.id !== id);
    setProfessionals(updated);
    try {
      localStorage.setItem("vertofi_assigned_professionals", JSON.stringify(updated));
    } catch (_e) {}
  }

  function handleOpenEdit(sec: "personal" | "address") {
    setEditForm({ ...profile });
    setEditingSection(sec);
    setSavedSuccess(false);
  }

  async function handleSave() {
    setProfile(editForm);
    try {
      localStorage.setItem("vertofi_business_profile", JSON.stringify(editForm));
      localStorage.setItem("vertofi_user_name", editForm.name);
      localStorage.setItem("vertofi_user_email", editForm.email);
      localStorage.setItem("vertofi_user_mobile", editForm.mobile);
      localStorage.setItem("vertofi_user_state", editForm.state);
    } catch (_e) {}

    const oid = getOrgId() || "demo-business-org";
    if (oid) {
      try {
        if (editingSection === "personal") {
          await api.saveSection(oid, "owner", {
            ownerName: editForm.name,
            ownerEmail: editForm.email,
            ownerMobile: editForm.mobile,
            altMobile: editForm.altMobile,
            aadhaar: editForm.aadhaar,
          }).catch(() => {});
        } else if (editingSection === "address") {
          await api.saveSection(oid, "business", {
            country: editForm.country,
            state: editForm.state,
            city: editForm.city,
            pincode: editForm.postalCode,
            addressLine: editForm.address,
          }).catch(() => {});
        }
      } catch (_e) {}
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setEditingSection(null);
    }, 600);
  }

  function handleDeactivate() {
    if (confirm("Are you sure you want to deactivate your account? You will need to contact support to resume access.")) {
      setDeactivated(true);
    }
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      setPasswordMsg("Please fill in all password fields.");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordMsg("New password and confirm password do not match.");
      return;
    }
    if (passwordForm.newPass.length < 8) {
      setPasswordMsg("Password must be at least 8 characters.");
      return;
    }
    setPasswordMsg("Password successfully changed!");
    setPasswordForm({ current: "", newPass: "", confirm: "" });
    setTimeout(() => setPasswordMsg(null), 3500);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Main 2-Column Split: Left Tabs & Right Content */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left Navigation Column */}
        <aside className="w-full md:w-56 shrink-0 md:border-r md:border-slate-100 md:pr-6 space-y-1.5">
          {SETTINGS_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full py-2.5 px-4 text-xs font-semibold rounded-full transition-all text-center cursor-pointer ${
                  isActive
                    ? "bg-[#EDF5FE] text-[#1D68D8] shadow-2xs"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </aside>

        {/* Right Content Column */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          {/* TAB 1: MY PROFILE */}
          {activeTab === "My Profile" && (
            <div className="space-y-5">
              {/* Card 1: Avatar & Name */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-full border border-amber-200/80 bg-[#FBF8F3] flex flex-col items-center justify-center p-2 shadow-2xs">
                    <img
                      src="/logo.png"
                      alt="Vertofi"
                      className="h-10 w-10 object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/logo-mark.png";
                      }}
                    />
                    <span className="text-[9px] font-bold tracking-wider text-amber-900/80 uppercase mt-0.5">
                      VERTOFI
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">{profile.name}</h2>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        {activePlanName} Plan
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Tier
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit("personal")}
                  className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit
                </button>
              </div>

              {/* Card 2: Personal Information */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="h-4 w-4" />
                    <h3 className="text-sm font-semibold tracking-wide text-slate-500">Personal Information</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit("personal")}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-4 text-xs">
                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 font-medium">Name</p>
                      <p className="text-slate-800 font-semibold text-sm mt-1">{profile.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Alternate Mobile Number</p>
                      <p className="text-slate-800 font-medium text-sm mt-1">{profile.altMobile || "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 font-medium">E-mail Address</p>
                      <p className="text-slate-800 font-semibold text-sm mt-1">{profile.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Aadhaar</p>
                      <p className="text-slate-800 font-medium text-sm mt-1">{profile.aadhaar || "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 font-medium">Mobile Number</p>
                      <p className="text-slate-800 font-semibold text-sm mt-1">{profile.mobile || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Address */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <h3 className="text-sm font-semibold tracking-wide text-slate-500">Address</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit("address")}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-4 text-xs">
                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 font-medium">Country</p>
                      <p className="text-slate-800 font-semibold text-sm mt-1">{profile.country || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Postal Code</p>
                      <p className="text-slate-800 font-semibold text-sm mt-1">{profile.postalCode || "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 font-medium">State</p>
                      <p className="text-slate-800 font-semibold text-sm mt-1">{profile.state || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Address</p>
                      <p className="text-slate-800 font-medium text-sm mt-1">{profile.address || "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 font-medium">City</p>
                      <p className="text-slate-800 font-semibold text-sm mt-1">{profile.city || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: YOUR CAS / ACCOUNTANTS */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    YOUR CAS / ACCOUNTANTS
                  </h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Ask your professional for their Vertofi ID (looks like VRU-1A2B3C4D), enter it here — they confirm from their panel, and only then get access to your books.
                </p>

                {proError && (
                  <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                    {proError}
                  </div>
                )}
                {proSuccess && (
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-200 flex items-center justify-between">
                    <span>{proSuccess}</span>
                    <button type="button" onClick={() => setProSuccess(null)} className="text-emerald-800 hover:opacity-80">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendProRequest} className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <input
                    type="text"
                    value={proVertofiId}
                    onChange={(e) => {
                      setProVertofiId(e.target.value.toUpperCase());
                      setProError(null);
                    }}
                    placeholder="VRU-XXXXXXXX"
                    className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-brand tracking-wider font-mono placeholder:font-sans placeholder:tracking-normal"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#3B82F6] hover:bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap text-center"
                  >
                    Send request
                  </button>
                </form>

                {professionals.length === 0 ? (
                  <p className="text-xs text-slate-400 font-normal pt-1">
                    No professionals assigned yet.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {professionals.map((pro) => (
                      <div
                        key={pro.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-800">{pro.vertofiId}</span>
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60">
                            {pro.status === "PENDING" ? "Pending Confirmation" : pro.status}
                          </span>
                          <span className="text-[11px] text-slate-400">Requested {pro.requestedAt}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePro(pro.id)}
                          className="text-[11px] font-medium text-red-600 hover:text-red-700 hover:underline"
                        >
                          Cancel request
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 5: Deactivate Account */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
                {deactivated ? (
                  <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      Account Deactivation Requested
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Your account deactivation request has been recorded. Your records remain safe. Please contact support@vertofi.com if you wish to re-activate your account.
                    </p>
                  </div>
                ) : (
                  <>
                    <ol className="space-y-2.5 text-xs text-slate-600 leading-relaxed list-decimal pl-4 font-normal">
                      <li>
                        <span className="font-semibold text-slate-800">Once you deactivate your account</span>, you will no longer be able to log in to your Vertofi Invoice account.
                      </li>
                      <li>
                        Your data and records will remain intact, but your account will be deactivated.
                      </li>
                      <li>
                        To resume your account, you will need to contact the Vertofi support team for assistance.
                      </li>
                    </ol>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleDeactivate}
                        className="rounded-lg bg-[#E52F39] px-8 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 cursor-pointer shadow-sm"
                      >
                        Deactivate Account
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === "Change Password" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-700">
                <Lock className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-600">Change Password</h3>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border ${
                    passwordMsg.includes("successfully")
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {passwordMsg}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-[#1E60D5] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: COMPANY SETTINGS */}
          {activeTab === "Company Settings" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-700">
                <Building2 className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-600">Company Settings</h3>
              </div>

              {companySaved && (
                <div className="p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Company settings saved!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Legal Business Name</label>
                  <input
                    type="text"
                    value={companyForm.legalName}
                    onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Trade / Brand Name</label>
                  <input
                    type="text"
                    value={companyForm.tradeName}
                    onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">GSTIN</label>
                  <input
                    type="text"
                    value={companyForm.gstin}
                    onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Business PAN</label>
                  <input
                    type="text"
                    value={companyForm.pan}
                    onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Business Type</label>
                  <select
                    value={companyForm.businessType}
                    onChange={(e) => setCompanyForm({ ...companyForm, businessType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand bg-white"
                  >
                    <option value="PVT_LTD">Private Limited</option>
                    <option value="PROPRIETORSHIP">Sole Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Industry</label>
                  <input
                    type="text"
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Annual Business Turnover</label>
                  <select
                    value={companyForm.turnover}
                    onChange={(e) => {
                      const t = e.target.value;
                      const p = getRecommendedPlanByTurnover(t);
                      setCompanyForm({ ...companyForm, turnover: t, plan: p });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand bg-white font-medium"
                  >
                    <option value="PRE_REVENUE">Pre-revenue / Testing (Recommended: Free Plan — ₹0/mo)</option>
                    <option value="UNDER_40L">Up to ₹40 Lakhs (Recommended: Starter Plan — ₹499/mo)</option>
                    <option value="40L_2CR">₹40 Lakhs – ₹2 Crore (Recommended: Growth Plan ★ — ₹1,499/mo)</option>
                    <option value="2CR_15CR">₹2 Crore – ₹15 Crore (Recommended: Scale Plan — ₹3,999/mo)</option>
                    <option value="15CR_PLUS">Above ₹15 Crore (Recommended: Enterprise Plan — Custom)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-600">Active Pricing Plan</label>
                    <span className="text-[11px] text-blue-600 font-semibold">Changeable anytime</span>
                  </div>
                  <select
                    value={companyForm.plan}
                    onChange={(e) => {
                      setCompanyForm({ ...companyForm, plan: e.target.value });
                    }}
                    className="w-full rounded-lg border border-blue-300 bg-blue-50/50 px-3.5 py-2 text-xs text-blue-950 font-bold outline-none focus:border-brand"
                  >
                    <option value="FREE">Free Plan (₹0/mo · 1 User · 1 GSTIN · Outcome: Understand)</option>
                    <option value="STARTER">Starter Plan (₹499/mo · 2 Users · 1 GSTIN · Outcome: Automate)</option>
                    <option value="GROWTH">Growth Plan ★ (₹1,499/mo · 5 Users · 3 GSTINs · Outcome: Predict)</option>
                    <option value="SCALE">Scale Plan (₹3,999/mo · 15 Users · 10 GSTINs · Outcome: Control)</option>
                    <option value="ENTERPRISE">Enterprise Plan (Custom · Unlimited Users & GSTINs · Outcome: Scale)</option>
                  </select>
                </div>
              </div>

              {/* Plan Limits & Capacity Callout */}
              {(() => {
                const limits = getPlanLimits(companyForm.plan);
                return (
                  <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-4 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-[11px]">
                          ★
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{limits.name} Plan — Outcome: <span className="text-blue-700">{limits.outcome}</span></p>
                          <p className="text-[11px] text-slate-500">{limits.tagline}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800 text-[11px]">
                        {limits.price}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-100/80 text-[11.5px]">
                      <div className="bg-white/80 rounded-lg p-2 border border-blue-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">User Accounts</span>
                        <span className="font-bold text-slate-800">{limits.maxUsers === 999999 ? "Unlimited" : `${limits.maxUsers} Users`}</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-2 border border-blue-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTINs Allowed</span>
                        <span className="font-bold text-slate-800">{limits.maxGstins === 999999 ? "Unlimited" : `${limits.maxGstins} GSTIN`}</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-2 border border-blue-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly Invoices/Txn</span>
                        <span className="font-bold text-slate-800">{limits.transactions} / mo</span>
                      </div>
                      <div className="bg-white/80 rounded-lg p-2 border border-blue-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Scanned Bills</span>
                        <span className="font-bold text-slate-800">{limits.scannedBills === 0 ? "—" : `${limits.scannedBills} / mo`}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const finalPlan = companyForm.plan || getRecommendedPlanByTurnover(companyForm.turnover);
                    localStorage.setItem("vertofi.plan", finalPlan);
                    localStorage.setItem("vertofi_user_plan", finalPlan);
                    localStorage.setItem("vertofi_business_turnover", companyForm.turnover);
                    window.dispatchEvent(new Event("vertofi:plan-changed"));

                    const oid = getOrgId() || "demo-business-org";
                    void api.saveSection(oid, "business", {
                      legalName: companyForm.legalName,
                      gstin: companyForm.gstin,
                      pan: companyForm.pan,
                      businessType: companyForm.businessType,
                      industry: companyForm.industry,
                      turnover: companyForm.turnover,
                      plan: finalPlan,
                    }).catch(() => {});

                    setCompanySaved(true);
                    setTimeout(() => setCompanySaved(false), 3000);
                  }}
                  className="rounded-lg bg-[#1E60D5] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
                >
                  Save Company Settings & Apply Plan
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PREFIX SETTINGS */}
          {activeTab === "Prefix Settings" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-700">
                <Sliders className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-600">Document Prefix Settings</h3>
              </div>

              {prefixSaved && (
                <div className="p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Prefix sequences updated!
                </div>
              )}

              <p className="text-xs text-slate-500">
                Customize automatic number generation prefixes for invoices, quotations, and challans.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Tax Invoice Prefix</label>
                  <input
                    type="text"
                    value={prefixForm.invoicePrefix}
                    onChange={(e) => setPrefixForm({ ...prefixForm, invoicePrefix: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Next Invoice Number</label>
                  <input
                    type="text"
                    value={prefixForm.invoiceSeq}
                    onChange={(e) => setPrefixForm({ ...prefixForm, invoiceSeq: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Quotation Prefix</label>
                  <input
                    type="text"
                    value={prefixForm.quotationPrefix}
                    onChange={(e) => setPrefixForm({ ...prefixForm, quotationPrefix: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Delivery Challan Prefix</label>
                  <input
                    type="text"
                    value={prefixForm.challanPrefix}
                    onChange={(e) => setPrefixForm({ ...prefixForm, challanPrefix: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Credit Note Prefix</label>
                  <input
                    type="text"
                    value={prefixForm.creditNotePrefix}
                    onChange={(e) => setPrefixForm({ ...prefixForm, creditNotePrefix: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Debit Note Prefix</label>
                  <input
                    type="text"
                    value={prefixForm.debitNotePrefix}
                    onChange={(e) => setPrefixForm({ ...prefixForm, debitNotePrefix: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrefixSaved(true);
                    setTimeout(() => setPrefixSaved(false), 3000);
                  }}
                  className="rounded-lg bg-[#1E60D5] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
                >
                  Save Prefixes
                </button>
              </div>
            </div>
          )}

          {/* TAB: TEMPLATE SETTINGS */}
          {activeTab === "Template Settings" && (
            <div className="space-y-6">
              {activeEditorTemplate ? (
                /* In-Place Live Document Editor */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setActiveEditorTemplate(null)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600 transition cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back to Template Gallery
                    </button>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      Live Customizer & Generator
                    </span>
                  </div>
                  <TemplateEditor template={activeEditorTemplate} />
                </div>
              ) : (
                /* Template Gallery Mode */
                <div className="space-y-6">
                  {/* Document Category Tabs (Pill style matching screenshot) */}
                  <div className="rounded-2xl bg-[#F2F4F7] p-2.5 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {[
                        "Sale Invoice",
                        "Purchase Invoice",
                        "Purchase Order",
                        "Debit Note",
                        "Credit Note",
                        "Einvoice",
                        "Shipping Label",
                      ].map((doc) => {
                        const isActive = docTypeTab === doc;
                        return (
                          <button
                            key={doc}
                            type="button"
                            onClick={() => setDocTypeTab(doc)}
                            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                              isActive
                                ? "bg-[#1E60D5] text-white shadow-xs hover:bg-blue-700"
                                : "text-[#344054] hover:text-slate-900 hover:bg-slate-200/60"
                            }`}
                          >
                            {doc}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Title Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight">View Invoice Template</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Choose layout, preview in real-time, or customize details to generate PDF</p>
                    </div>
                    {templateSaved && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Preference Saved
                      </span>
                    )}
                  </div>

                  {/* Templates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((tmplNum) => {
                      const isSelected = selectedTemplate === tmplNum;
                      const matchedTemplateDef = TEMPLATES_REGISTRY[(tmplNum - 1) % TEMPLATES_REGISTRY.length];

                      return (
                        <div
                          key={tmplNum}
                          className={`group relative rounded-2xl border bg-white overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                            isSelected
                              ? "border-blue-600 ring-2 ring-blue-600/20 shadow-md"
                              : "border-slate-200/90 hover:border-slate-300 shadow-2xs"
                          }`}
                        >
                          {/* Selection Badge */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 z-20 h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md font-bold text-xs">
                              ✓
                            </div>
                          )}

                          {/* Visual Template Preview Area */}
                          <div className="relative p-4 bg-slate-50/70 min-h-[310px] flex items-center justify-center border-b border-slate-100 overflow-hidden">
                            {/* Mini Invoice Preview Rendering with unique layouts */}
                            <div className="w-full bg-white rounded-lg border border-slate-200 p-3 shadow-2xs text-[9px] leading-tight space-y-2 select-none pointer-events-none transform group-hover:scale-[1.02] transition-transform duration-200">
                              {/* Layout Variations based on tmplNum */}
                              {tmplNum === 1 && (
                                <>
                                  <div className="flex justify-between items-start border-b border-blue-200 bg-blue-50/50 p-1.5 -mx-3 -mt-3 rounded-t-lg">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-5 w-5 rounded bg-blue-600 text-white font-black text-[8px] flex items-center justify-center">V</div>
                                      <div>
                                        <p className="font-bold text-slate-800 text-[9px]">{companyForm.tradeName || "Vertofi Solutions"}</p>
                                        <p className="text-slate-400 text-[7px]">GSTIN: {companyForm.gstin}</p>
                                      </div>
                                    </div>
                                    <span className="font-bold text-[8px] text-blue-600 uppercase">{docTypeTab}</span>
                                  </div>
                                </>
                              )}

                              {tmplNum === 2 && (
                                <>
                                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                                    <div>
                                      <span className="font-extrabold text-[9px] text-slate-900 uppercase block">{docTypeTab}</span>
                                      <p className="text-slate-400 text-[7px]">ORIGINAL FOR RECIPIENT</p>
                                    </div>
                                    <div className="h-5 w-5 rounded bg-emerald-600 text-white font-black text-[8px] flex items-center justify-center">V</div>
                                  </div>
                                </>
                              )}

                              {tmplNum === 3 && (
                                <>
                                  <div className="border border-slate-300 p-1.5 rounded bg-slate-50 flex justify-between items-center">
                                    <div>
                                      <p className="font-extrabold text-slate-900 text-[9px]">{companyForm.legalName}</p>
                                      <p className="text-slate-400 text-[7px]">GSTIN: {companyForm.gstin}</p>
                                    </div>
                                    <span className="font-bold text-[8px] text-purple-700 uppercase bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                      {docTypeTab}
                                    </span>
                                  </div>
                                </>
                              )}

                              {tmplNum === 4 && (
                                <>
                                  <div className="bg-slate-900 text-white p-1.5 -mx-3 -mt-3 rounded-t-lg flex justify-between items-center">
                                    <span className="font-bold text-[8px]">{companyForm.tradeName || "Vertofi Technologies"}</span>
                                    <span className="font-extrabold text-[8px] text-amber-300 uppercase">{docTypeTab}</span>
                                  </div>
                                </>
                              )}

                              {tmplNum >= 5 && (
                                <>
                                  <div className="flex justify-between items-start border-b border-slate-200 pb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-5 w-5 rounded bg-slate-800 text-white font-black text-[8px] flex items-center justify-center">V</div>
                                      <div>
                                        <p className="font-bold text-slate-800 text-[9px]">{companyForm.tradeName || "Vertofi Solutions"}</p>
                                        <p className="text-slate-400 text-[7px]">GSTIN: {companyForm.gstin}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-[8px] text-blue-600 uppercase">{docTypeTab}</span>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Address boxes */}
                              <div className="grid grid-cols-2 gap-2 text-[7.5px] bg-slate-50 p-1.5 rounded border border-slate-100">
                                <div>
                                  <p className="font-semibold text-slate-700">Billed To:</p>
                                  <p className="text-slate-500 font-medium">Jay Enterprise</p>
                                  <p className="text-slate-400">Hyderabad, TS 500081</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-700">Ref Details:</p>
                                  <p className="text-slate-500 font-medium">No: INV-2026-001</p>
                                  <p className="text-slate-400">Date: 14-11-2026</p>
                                </div>
                              </div>

                              {/* Items Table */}
                              <table className="w-full text-left border-collapse text-[7.5px]">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                                    <th className="p-1">S.N</th>
                                    <th className="p-1">Item Description</th>
                                    <th className="p-1 text-center">Qty</th>
                                    <th className="p-1 text-right">Rate</th>
                                    <th className="p-1 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                  <tr>
                                    <td className="p-1">1</td>
                                    <td className="p-1 font-medium text-slate-800">SaaS Cloud Plan</td>
                                    <td className="p-1 text-center">1</td>
                                    <td className="p-1 text-right">₹12,000</td>
                                    <td className="p-1 text-right font-semibold">₹12,000</td>
                                  </tr>
                                  <tr>
                                    <td className="p-1">2</td>
                                    <td className="p-1 font-medium text-slate-800">Support License</td>
                                    <td className="p-1 text-center">1</td>
                                    <td className="p-1 text-right">₹2,000</td>
                                    <td className="p-1 text-right font-semibold">₹2,000</td>
                                  </tr>
                                </tbody>
                              </table>

                              {/* Footer & QR code */}
                              <div className="flex justify-between items-end pt-1 border-t border-slate-200">
                                <div className="flex items-center gap-1">
                                  <div className="h-6 w-6 border border-slate-300 rounded p-0.5 bg-white flex items-center justify-center">
                                    <QrCode className="h-5 w-5 text-slate-800" />
                                  </div>
                                  <div>
                                    <p className="text-[6.5px] font-bold text-slate-600">Pay using UPI</p>
                                    <p className="text-[5.5px] text-slate-400">{companyForm.legalName?.slice(0, 12)}@icici</p>
                                  </div>
                                </div>
                                <div className="text-right text-[7.5px]">
                                  <p className="text-slate-400">Total Amount</p>
                                  <p className="font-bold text-[10px] text-blue-600">₹14,160.00</p>
                                </div>
                              </div>
                            </div>

                            {/* Hover Overlay with Pill Action Buttons */}
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2.5 p-4 z-10">
                              <button
                                type="button"
                                onClick={() => setPreviewModal(tmplNum)}
                                className="w-36 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600" /> Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTemplate(tmplNum);
                                  const updatedForm = { ...templateForm, templateId: tmplNum, selectedTemplate: tmplNum, theme: `template_${tmplNum}` };
                                  setTemplateForm(updatedForm);
                                  try {
                                    localStorage.setItem("vertofi_selected_template", String(tmplNum));
                                    localStorage.setItem("vertofi_invoice_template_settings", JSON.stringify(updatedForm));
                                    window.dispatchEvent(new CustomEvent("vertofi:template-changed", { detail: { templateId: tmplNum } }));
                                  } catch (_e) {}
                                  setTemplateSaved(true);
                                  setTimeout(() => setTemplateSaved(false), 3000);
                                }}
                                className={`w-36 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-white/95 hover:bg-white text-slate-800"
                                }`}
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-600" /> {isSelected ? "Selected" : "Select"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveEditorTemplate(matchedTemplateDef)}
                                className="w-36 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-white" /> Customize Form
                              </button>
                            </div>
                          </div>

                          {/* Card Bottom Label */}
                          <div className="p-4 bg-white flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">Template - {tmplNum}</span>
                            {isSelected && (
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Full HD Preview Modal */}
                  {previewModal !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 my-8">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">
                              Template - {previewModal} ({docTypeTab})
                            </h3>
                            <p className="text-xs text-slate-500">Live preview of invoice layout and PDF styling</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewModal(null)}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        {/* High-Res Preview Document Body */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 text-xs">
                          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg border border-amber-200 bg-amber-50 flex items-center justify-center text-sm font-bold text-amber-700 shadow-xs">
                                VS
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">MUMBAI SERVICES PRIVATE LIMITED</p>
                                <p className="text-slate-500 text-xs">GSTIN / UIN: 27AAPFR1234H1ZT</p>
                                <p className="text-slate-400 text-xs">Address: 101, Business Park, Andheri, Mumbai, MH 400053</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-sm text-blue-600 uppercase tracking-wider block">
                                {docTypeTab.toUpperCase()}
                              </span>
                              <p className="text-slate-400 text-xs font-medium">ORIGINAL FOR RECIPIENT</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                            <div>
                              <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Billed To:</p>
                              <p className="font-bold text-slate-900">Jay Enterprises</p>
                              <p className="text-slate-500">Phone: +91 9876543210</p>
                              <p className="text-slate-500">GSTIN: 36AABCU9603R1ZM</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">Invoice Info:</p>
                              <p className="font-bold text-slate-900">Invoice No: INV-2026-0001</p>
                              <p className="text-slate-500">Date: 14-11-2026</p>
                              <p className="text-slate-500">Place of Supply: 27-MAHARASHTRA</p>
                            </div>
                          </div>

                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                                <th className="p-2">S.No</th>
                                <th className="p-2">Item Description</th>
                                <th className="p-2 text-center">HSN/SAC</th>
                                <th className="p-2 text-center">Qty</th>
                                <th className="p-2 text-right">Rate</th>
                                <th className="p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              <tr>
                                <td className="p-2 font-medium">1</td>
                                <td className="p-2 font-semibold text-slate-900">SaaS Cloud Billing Subscription</td>
                                <td className="p-2 text-center">998313</td>
                                <td className="p-2 text-center font-bold">1</td>
                                <td className="p-2 text-right">₹12,000.00</td>
                                <td className="p-2 text-right font-bold">₹12,000.00</td>
                              </tr>
                              <tr>
                                <td className="p-2 font-medium">2</td>
                                <td className="p-2 font-semibold text-slate-900">Premium Support & Setup Fee</td>
                                <td className="p-2 text-center">998314</td>
                                <td className="p-2 text-center font-bold">1</td>
                                <td className="p-2 text-right">₹2,000.00</td>
                                <td className="p-2 text-right font-bold">₹2,000.00</td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="h-16 w-16 border border-slate-300 rounded-lg p-1 bg-white flex items-center justify-center shadow-xs">
                                <QrCode className="h-14 w-14 text-slate-800" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-xs">Scan & Pay via UPI</p>
                                <p className="text-xs text-slate-500">VPA: vertofi@icici</p>
                                <p className="text-[10px] text-slate-400">Instant GST Verification</p>
                              </div>
                            </div>

                            <div className="w-56 space-y-1 text-right">
                              <div className="flex justify-between text-slate-500">
                                <span>Taxable Amount:</span>
                                <span>₹14,000.00</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>CGST (9%):</span>
                                <span>₹1,260.00</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>SGST (9%):</span>
                                <span>₹1,260.00</span>
                              </div>
                              <div className="flex justify-between font-bold text-sm text-blue-600 border-t border-slate-200 pt-1">
                                <span>Total Amount:</span>
                                <span>₹16,520.00</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setPreviewModal(null)}
                            className="px-5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTemplate(previewModal);
                              const updatedForm = { ...templateForm, templateId: previewModal, theme: `template_${previewModal}` };
                              setTemplateForm(updatedForm);
                              try {
                                localStorage.setItem("vertofi_selected_template", String(previewModal));
                                localStorage.setItem("vertofi_invoice_template_settings", JSON.stringify(updatedForm));
                                window.dispatchEvent(new CustomEvent("vertofi:template-changed", { detail: { templateId: previewModal } }));
                              } catch (_e) {}
                              setPreviewModal(null);
                              setTemplateSaved(true);
                              setTimeout(() => setTemplateSaved(false), 3000);
                            }}
                            className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition shadow-sm cursor-pointer"
                          >
                            ✓ Select Template {previewModal}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tmpl = TEMPLATES_REGISTRY[(previewModal - 1) % TEMPLATES_REGISTRY.length];
                              setPreviewModal(null);
                              setActiveEditorTemplate(tmpl);
                            }}
                            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition shadow-sm cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 inline mr-1" /> Customize & Generate PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: USER SECURITY */}
          {activeTab === "User Security" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-600">User Security & Authentication</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-800">Two-Factor Authentication (2FA)</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Require an OTP code sent via SMS/Email on every new sign-in.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecurityState({ ...securityState, twoFactor: !securityState.twoFactor })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      securityState.twoFactor ? "bg-[#1E60D5]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        securityState.twoFactor ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-800">IP Location Lock</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Restrict workspace logins exclusively to verified business networks.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSecurityState({ ...securityState, ipLock: !securityState.ipLock })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      securityState.ipLock ? "bg-[#1E60D5]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        securityState.ipLock ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2">
                  <h4 className="font-semibold text-slate-700 mb-2">Active Sessions</h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">Current Browser (Chrome Windows)</p>
                        <p className="text-slate-400 text-[11px]">Hyderabad, Telangana • Active now</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        This Device
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NOTIFICATION SETTING */}
          {activeTab === "Notification Setting" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-700">
                <Bell className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-600">Notification Preferences</h3>
              </div>

              {notifSaved && (
                <div className="p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Preferences updated!
                </div>
              )}

              <div className="space-y-3 text-xs">
                {[
                  { key: "emailInvoices", title: "Email Invoice Confirmations", desc: "Receive email notification whenever an invoice is created or dispatched." },
                  { key: "smsReceipts", title: "SMS Payment Receipts", desc: "Send automated SMS confirmation to customer upon receiving payments." },
                  { key: "whatsappUpdates", title: "WhatsApp CFO Alerts", desc: "Receive instant WhatsApp notifications for critical business health events." },
                  { key: "taxAlerts", title: "Tax Due Reminders", desc: "Alerts for GSTR-1, GSTR-3B, and Advance Tax deadlines 3 days in advance." },
                ].map((item) => (
                  <label key={item.key} className="flex items-start justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/40 cursor-pointer hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!notifState[item.key as keyof typeof notifState]}
                      onChange={(e) => setNotifState({ ...notifState, [item.key]: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand mt-1"
                    />
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotifSaved(true);
                    setTimeout(() => setNotifSaved(false), 3000);
                  }}
                  className="rounded-lg bg-[#1E60D5] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
                >
                  Save Notification Preferences
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: MANAGE UPI */}
          {activeTab === "Manage UPI" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-700">
                <QrCode className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-600">UPI & Payment Collection</h3>
              </div>

              {upiSaved && (
                <div className="p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> UPI settings saved!
                </div>
              )}

              <div className="space-y-4 max-w-md text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Business UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={upiForm.vpa}
                    onChange={(e) => setUpiForm({ ...upiForm, vpa: e.target.value })}
                    placeholder="company@bank"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">Merchant Display Name</label>
                  <input
                    type="text"
                    value={upiForm.merchantName}
                    onChange={(e) => setUpiForm({ ...upiForm, merchantName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={upiForm.autoQr}
                    onChange={(e) => setUpiForm({ ...upiForm, autoQr: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  Print dynamic QR code on PDF invoices for instant customer UPI payments
                </label>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUpiSaved(true);
                      setTimeout(() => setUpiSaved(false), 3000);
                    }}
                    className="rounded-lg bg-[#1E60D5] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
                  >
                    Save UPI Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ROLE ACCESS — USER ACCOUNTS & TEAM MANAGEMENT BASED ON PRICING PLAN */}
          {activeTab === "Role Access" && (() => {
            const planKey = companyForm.plan || (typeof window !== "undefined" ? localStorage.getItem("vertofi.plan") : null) || "FREE";
            const limits = getPlanLimits(planKey);
            const userCount = teamAccounts.length;
            const maxUsers = limits.maxUsers;
            const isUnlimited = maxUsers >= 999999;
            const isAtLimit = !isUnlimited && userCount >= maxUsers;
            const usagePercent = isUnlimited ? Math.min(100, userCount * 10) : Math.min(100, (userCount / maxUsers) * 100);

            const handleAddUser = () => {
              setInviteError(null);
              setInviteSuccess(null);
              if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
                setInviteError("Please enter full name and email address.");
                return;
              }
              if (!inviteForm.email.includes("@")) {
                setInviteError("Please enter a valid work email address.");
                return;
              }
              if (isAtLimit) {
                setInviteError(`User limit reached (${maxUsers} users on ${limits.name} plan). Upgrade your plan or purchase an Extra User add-on.`);
                return;
              }
              if (teamAccounts.some((m) => m.email.toLowerCase() === inviteForm.email.trim().toLowerCase())) {
                setInviteError("A team member with this email is already registered.");
                return;
              }

              const newMember: TeamAccount = {
                id: `usr-${Date.now()}`,
                name: inviteForm.name.trim(),
                email: inviteForm.email.trim().toLowerCase(),
                mobile: inviteForm.mobile.trim(),
                role: inviteForm.role,
                status: "ACTIVE",
                addedAt: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
              };

              const updated = [...teamAccounts, newMember];
              setTeamAccounts(updated);
              localStorage.setItem("vertofi_team_accounts", JSON.stringify(updated));
              window.dispatchEvent(new Event("vertofi:users-changed"));
              setInviteSuccess(`Invited ${newMember.name} as ${newMember.role}!`);
              setInviteForm({ name: "", email: "", mobile: "", role: "ACCOUNTANT" });
              setShowInviteModal(false);
            };

            const handleRemoveUser = (id: string) => {
              const target = teamAccounts.find((m) => m.id === id);
              if (target?.role === "OWNER") {
                alert("The primary business owner account cannot be deleted.");
                return;
              }
              if (confirm(`Remove ${target?.name || "this user"} from your organization?`)) {
                const updated = teamAccounts.filter((m) => m.id !== id);
                setTeamAccounts(updated);
                localStorage.setItem("vertofi_team_accounts", JSON.stringify(updated));
                window.dispatchEvent(new Event("vertofi:users-changed"));
              }
            };

            return (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-6">
                {/* Header with Plan Info & User Capacity Tracker */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-bold text-slate-900">User Accounts & Team Access</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      User accounts allocated based on your <strong className="text-slate-800 font-semibold">{limits.name} Plan</strong> ({limits.price}).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                        isAtLimit
                          ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" /> Invite User Account
                    </button>
                  </div>
                </div>

                {/* Plan Capacity & Quota Gauge Card */}
                <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-[11px]">
                        👥
                      </span>
                      <div>
                        <span className="font-bold text-slate-900">User Accounts Capacity: </span>
                        <span className="font-extrabold text-blue-700">
                          {userCount} / {isUnlimited ? "Unlimited" : maxUsers} Accounts Used
                        </span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
                      isAtLimit
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {isAtLimit ? "Quota Reached" : `${isUnlimited ? "Unlimited" : maxUsers - userCount + " Seats Free"}`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isAtLimit ? "bg-rose-500" : usagePercent > 70 ? "bg-amber-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>

                  {/* Capacity Info Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Plan</span>
                      <span className="font-bold text-slate-800">{limits.name} ({limits.outcome})</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Users</span>
                      <span className="font-bold text-slate-800">{isUnlimited ? "Unlimited" : `${maxUsers} Seats`}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">GSTINs Allowed</span>
                      <span className="font-bold text-slate-800">{limits.maxGstins === 999999 ? "Unlimited" : `${limits.maxGstins} GSTIN`}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Extra User Add-on</span>
                      <span className="font-bold text-blue-700">₹149 / month</span>
                    </div>
                  </div>
                </div>

                {/* Quota Limit Warning Banner */}
                {isAtLimit && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">You have reached the maximum {maxUsers} user accounts for {limits.name} Plan.</p>
                        <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                          Upgrade to {limits.id === "FREE" ? "Starter (2 users)" : limits.id === "STARTER" ? "Growth (5 users)" : "Scale (15 users)"} or add Extra Users @ ₹149/mo to continue adding team members.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/pricing"
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-900 px-3.5 py-1.5 font-bold text-white text-[11px] hover:bg-amber-800 transition shadow-xs"
                    >
                      Upgrade Plan <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {inviteSuccess && (
                  <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {inviteSuccess}
                  </div>
                )}

                {/* Team Members List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                    <span>Active User Accounts ({teamAccounts.length})</span>
                    <span>Role & Status</span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {teamAccounts.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 transition text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs uppercase shadow-2xs">
                            {member.name.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{member.name}</p>
                              {member.role === "OWNER" && (
                                <span className="rounded-md bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800">
                                  PRIMARY OWNER
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px]">{member.email} {member.mobile ? `· +91 ${member.mobile}` : ""}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                            {member.role}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            {member.status}
                          </span>
                          {member.role !== "OWNER" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(member.id)}
                              title="Remove user account"
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Add-ons Reference Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>Plan Add-on Pricing Reference</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                    <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                      <span className="font-bold text-slate-800">Extra User Account:</span> ₹149/month
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                      <span className="font-bold text-slate-800">Extra GSTIN / Business:</span> ₹299/month
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                      <span className="font-bold text-slate-800">Extra 500 Scanned Bills:</span> ₹299/month
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Modal for Inviting New User Account */}
          {showInviteModal && (() => {
            const planKey = companyForm.plan || (typeof window !== "undefined" ? localStorage.getItem("vertofi.plan") : null) || "FREE";
            const limits = getPlanLimits(planKey);
            const userCount = teamAccounts.length;
            const maxUsers = limits.maxUsers;
            const isUnlimited = maxUsers >= 999999;
            const isAtLimit = !isUnlimited && userCount >= maxUsers;

            const handleAddUser = () => {
              setInviteError(null);
              setInviteSuccess(null);
              if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
                setInviteError("Please enter full name and email address.");
                return;
              }
              if (!inviteForm.email.includes("@")) {
                setInviteError("Please enter a valid work email address.");
                return;
              }
              if (isAtLimit) {
                setInviteError(`User limit reached (${maxUsers} users on ${limits.name} plan). Upgrade your plan or purchase an Extra User add-on.`);
                return;
              }
              if (teamAccounts.some((m) => m.email.toLowerCase() === inviteForm.email.trim().toLowerCase())) {
                setInviteError("A team member with this email is already registered.");
                return;
              }

              const newMember: TeamAccount = {
                id: `usr-${Date.now()}`,
                name: inviteForm.name.trim(),
                email: inviteForm.email.trim().toLowerCase(),
                mobile: inviteForm.mobile.trim(),
                role: inviteForm.role,
                status: "ACTIVE",
                addedAt: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
              };

              const updated = [...teamAccounts, newMember];
              setTeamAccounts(updated);
              localStorage.setItem("vertofi_team_accounts", JSON.stringify(updated));
              window.dispatchEvent(new Event("vertofi:users-changed"));
              setInviteSuccess(`Invited ${newMember.name} as ${newMember.role}!`);
              setInviteForm({ name: "", email: "", mobile: "", role: "ACCOUNTANT" });
              setShowInviteModal(false);
            };

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
                <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <h3 className="text-base font-bold text-slate-800">Invite Team Member / User Account</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {inviteError && (
                    <div className="p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
                      {inviteError}
                    </div>
                  )}

                  {isAtLimit && (
                    <div className="p-3 rounded-xl text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 space-y-1">
                      <p className="font-bold">Plan User Account Limit Reached ({maxUsers}/{maxUsers})</p>
                      <p className="text-[11px] text-amber-800">
                        Upgrade your plan from <strong>{limits.name}</strong> to unlock additional user accounts, or add extra users at ₹149/mo.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">Full Name</label>
                      <input
                        type="text"
                        value={inviteForm.name}
                        onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">Work Email Address</label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        placeholder="e.g. rahul@company.com"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">Mobile Number (Optional)</label>
                      <input
                        type="text"
                        value={inviteForm.mobile}
                        onChange={(e) => setInviteForm({ ...inviteForm, mobile: e.target.value })}
                        placeholder="10-digit mobile"
                        maxLength={10}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">Account Role & Permission</label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as TeamAccount["role"] })}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand bg-white font-medium"
                      >
                        <option value="ACCOUNTANT">Accountant / Finance Staff (Manage entries, reconciliation, reports)</option>
                        <option value="BILLING">Billing Manager (Create invoices, quotes, receipts)</option>
                        <option value="SALES">Sales Representative (Customer management & invoicing)</option>
                        <option value="ADMIN">Administrator (Full company workspace access)</option>
                        <option value="VIEWER">Read-Only Viewer (View financial dashboards and reports only)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddUser}
                      className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm shadow-blue-500/20"
                    >
                      Add User Account
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* TAB 9: MANAGE ACCOUNTS */}
          {activeTab === "Manage Accounts" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-slate-700">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Balance Total</p>
                    <p className="text-lg font-bold text-emerald-600">₹ 0.00</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-slate-700">
                    <Banknote className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Cash</p>
                    <p className="text-lg font-bold text-emerald-600">₹ 0.00</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-slate-700">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Accounts Total</p>
                    <p className="text-lg font-bold text-emerald-600">0</p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-end gap-3">
                <select className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition">
                  <option value="">Select Account</option>
                </select>
                <button
                  onClick={() => setShowAddBankModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#2b7bc7] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#256bb0] transition"
                >
                  <Plus className="h-4 w-4" /> Add New
                </button>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                        <th className="px-4 py-3 font-semibold w-16">
                          <div className="flex items-center gap-2">#</div>
                        </th>
                        <th className="px-4 py-3 font-semibold">
                          <div className="flex items-center justify-between gap-2">Account No <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" /></div>
                        </th>
                        <th className="px-4 py-3 font-semibold">
                          <div className="flex items-center justify-between gap-2">Name <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" /></div>
                        </th>
                        <th className="px-4 py-3 font-semibold">
                          <div className="flex items-center justify-between gap-2">Balance <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" /></div>
                        </th>
                        <th className="px-4 py-3 font-semibold">
                          <div className="flex items-center justify-between gap-2">Type <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" /></div>
                        </th>
                        <th className="px-4 py-3 font-semibold text-right">
                          <div className="flex items-center justify-end gap-2">Action <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" /></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm font-medium text-[#2b7bc7]">
                          No data available in table
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <p className="text-sm font-medium text-[#2b7bc7]">Showing 0 to 0 of 0 entries</p>
                  <div className="flex gap-4 text-sm font-medium text-slate-700">
                    <button className="hover:text-[#2b7bc7] transition">Previous</button>
                    <button className="hover:text-[#2b7bc7] transition">Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal for Personal Information & Address */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingSection === "personal" ? "Edit Personal Information" : "Edit Address Information"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {savedSuccess && (
              <div className="rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Profile updated successfully!
              </div>
            )}

            {editingSection === "personal" ? (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">E-mail Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Mobile Number</label>
                  <input
                    type="text"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Alternate Mobile Number</label>
                  <input
                    type="text"
                    value={editForm.altMobile}
                    onChange={(e) => setEditForm({ ...editForm, altMobile: e.target.value })}
                    placeholder="Optional"
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Aadhaar</label>
                  <input
                    type="text"
                    value={editForm.aadhaar}
                    onChange={(e) => setEditForm({ ...editForm, aadhaar: e.target.value })}
                    placeholder="Optional 12-digit Aadhaar"
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Country</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Postal Code</label>
                  <input
                    type="text"
                    value={editForm.postalCode}
                    onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Street Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-800 outline-none focus:border-brand shadow-2xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-[#1E60D5] px-5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Add Account</h3>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Account No*</label>
                  <input type="text" placeholder="Account No" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Initial Balance*</label>
                  <input type="text" placeholder="Initial Balance" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-500 shadow-sm" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Name*</label>
                  <input type="text" placeholder="Enter Name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Account Type*</label>
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-500 shadow-sm bg-white">
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">Bank Name*</label>
                  <input type="text" placeholder="Enter Bank Name" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">IFSC Code*</label>
                  <input type="text" placeholder="Enter IFSC Code" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-500 shadow-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Note</label>
                <textarea rows={3} placeholder="Note" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-blue-500 shadow-sm resize-none"></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm shadow-blue-500/20"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
