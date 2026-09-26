"use client";

import { useEffect, useState, useRef } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, FileText, CheckCircle, 
  ArrowRight, UploadCloud, Clock, History, FileWarning, 
  Activity, Calendar, Briefcase, FileSearch, Check, Download,
  Sparkles, Layers, RefreshCw, XCircle, Info, Zap, ChevronRight,
  HelpCircle, Eye, Printer, Loader2
} from "lucide-react";

export default function AccountingWarrantyPage() {
  const [view, setView] = useState<"overview" | "claims" | "conditions">("overview");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [activeClaim, setActiveClaim] = useState<any | null>(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [claimToast, setClaimToast] = useState<string | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Claim Form State
  const [claimForm, setClaimForm] = useState({
    clientName: "Demo Business Org",
    penaltyType: "GST Late Filing Fee (GSTR-3B)",
    complianceArea: "GST",
    amount: "",
    noticeDate: new Date().toISOString().split("T")[0],
    description: "",
    dataProvidedOnTime: true,
    documentType: "Notice & Penalty Order",
    fileName: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch warranty data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [stRes, clRes] = await Promise.all([
        fetch(`/api/v1/warranty/status`),
        fetch(`/api/v1/warranty/claims`),
      ]);
      const [stJson, clJson] = await Promise.all([
        stRes.ok ? stRes.json() : { status: null },
        clRes.ok ? clRes.json() : { claims: [] },
      ]);
      if (stJson.status) {
        setStatus(stJson.status);
      }
      setClaims(clJson.claims || []);
    } catch (err) {
      console.error("Error loading warranty data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPenaltyReport = async () => {
    try {
      const res = await fetch(`/api/v1/warranty/penalty-report`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json.report);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(claimForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid penalty amount greater than ₹0.");
      return;
    }
    if (!claimForm.description.trim()) {
      setFormError("Please provide a description of the penalty notice and what occurred.");
      return;
    }

    try {
      setSubmittingClaim(true);
      const res = await fetch(`/api/v1/warranty/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: claimForm.clientName,
          penaltyType: claimForm.penaltyType,
          complianceArea: claimForm.complianceArea,
          amount: amt,
          noticeDate: claimForm.noticeDate,
          description: claimForm.description,
          dataProvidedOnTime: claimForm.dataProvidedOnTime,
          documents: claimForm.fileName ? [{ name: claimForm.fileName, type: claimForm.documentType }] : [],
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setClaimToast(
          "Warranty claim submitted successfully. Vertofi will review the reason for the penalty and determine whether the issue was caused by Vertofi, the client, or a system/government issue."
        );
        setShowClaimForm(false);
        setClaimForm({
          clientName: status?.plan || "Demo Business Org",
          penaltyType: "GST Late Filing Fee (GSTR-3B)",
          complianceArea: "GST",
          amount: "",
          noticeDate: new Date().toISOString().split("T")[0],
          description: "",
          dataProvidedOnTime: true,
          documentType: "Notice & Penalty Order",
          fileName: "",
        });
        fetchData();
        setTimeout(() => setClaimToast(null), 8000);
      } else {
        setFormError(json.error || "Failed to submit claim. Please check your inputs.");
      }
    } catch {
      setFormError("Network error while submitting claim. Please retry.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. OVERVIEW TAB
  // ─────────────────────────────────────────────────────────────
  const renderOverview = () => {
    const currentPlan = status?.plan || "ENTERPRISE";
    const annualLimit = status?.coverageLimit ?? 100000;
    const used = status?.coverageUsed ?? 0;
    const remaining = status?.coverageRemaining ?? annualLimit;
    const usedPct = annualLimit > 0 ? Math.min(100, Math.round((used / annualLimit) * 100)) : 0;

    return (
      <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-16">
        
        {/* Top Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-200">
                Service Mistake Warranty
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Protection
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-indigo-600 shrink-0" /> ACCOUNTING WARRANTY
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">
              Subscription-backed protection for qualifying accounting and compliance penalties.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => { setView("claims"); setShowClaimForm(true); }}
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" /> Submit Claim
            </button>
            <button
              type="button"
              onClick={() => setView("conditions")}
              className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              Conditions & Terms
            </button>
          </div>
        </div>

        {/* Highlighted Banner: Penalty? Relax. Vertofi pays. */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden border border-indigo-800/40">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest mb-3 border border-amber-400/30">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Vertofi Accounting Warranty+™
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-white">
              Penalty? Relax. Vertofi pays.
            </h2>
            <p className="text-slate-300 text-base leading-relaxed mb-4">
              Vertofi’s Accounting Warranty+ protects clients from qualifying penalties arising from Vertofi’s own errors or delays in accounting and compliance filings. If we make a service mistake that leads to a qualifying statutory penalty, Vertofi covers it.
            </p>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-xs text-slate-300 flex items-start gap-2 max-w-2xl">
              <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Important Legal Notice:</strong> Warranty coverage is subject to eligibility, verification, applicable limits, client responsibilities, exclusions and the Conditions & Terms. This is a <strong>Service Mistake Warranty</strong> and is <strong>NOT general insurance</strong>.
              </span>
            </div>
          </div>
          <ShieldCheck className="absolute -right-16 -bottom-16 h-80 w-80 text-white/5 rotate-12 pointer-events-none" />
        </div>

        {/* Prominent Status Card & Current Plan Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Status Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Warranty Status</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    ACTIVE
                  </h3>
                </div>
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-extrabold border border-emerald-200">
                  Protected
                </span>
              </div>

              <div className="space-y-3 text-sm py-2">
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Current Plan:</span>
                  <span className="font-bold text-slate-800">{currentPlan}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Coverage:</span>
                  <span className="font-bold text-indigo-600 text-right">Qualifying Vertofi Penalties</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Waiting Period:</span>
                  <span className="font-bold text-emerald-600">Active (30+ Days Completed)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Subscription:</span>
                  <span className="font-bold text-emerald-600">Active & Paid</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
              <p className="text-xs text-slate-500 leading-relaxed">
                Warranty starts after 30 days and remains valid only while your Vertofi subscription is active.
              </p>
            </div>
          </div>

          {/* Current Warranty Plan & Limit */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between lg:col-span-2">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Current Warranty Plan</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {status?.planTierName || `${currentPlan} Plan + Warranty`}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Warranty Fee</p>
                  <p className="text-lg font-black text-indigo-600">{status?.monthlyFee || "₹3,999/month extra"}</p>
                </div>
              </div>

              {/* Coverage Limit Progress */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Annual Coverage Limit</span>
                  <span className="text-lg font-black text-slate-900">₹{annualLimit.toLocaleString("en-IN")} / year</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 mb-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(2, usedPct)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Claimed: ₹{used.toLocaleString("en-IN")} ({usedPct}%)</span>
                  <span className="text-emerald-700 font-bold">Remaining Available: ₹{remaining.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-indigo-900 font-medium">
                  <CheckCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Coverage: {status?.coverageScope || "All compliance penalties + Notice handling"}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-emerald-900 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Includes dedicated notice assistance & verification</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
              <span>Backed by Vertofi Zero-Entry Compliance Engine</span>
              <button 
                type="button" 
                onClick={() => setView("claims")} 
                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                View Claims <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Section: WHAT VERTOFI COVERS (4 Major Cards) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Protection Scope</p>
              <h2 className="text-2xl font-black text-slate-900">WHAT VERTOfi COVERS</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Coverage applies when Vertofi made an operational mistake, computation error, or missed statutory deadlines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: GST */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black mb-4">
                  GST
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">GST Compliance Warranty</h3>
                <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider">Covered Examples:</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Late GSTR-1 or GSTR-3B filings caused by Vertofi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Incorrect ITC calculation caused by Vertofi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Late payment interest when Vertofi missed deadline</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-indigo-600">
                Covers statutory late fees & interest
              </div>
            </div>

            {/* Card 2: Income Tax */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black mb-4">
                  IT
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Income Tax Compliance Warranty</h3>
                <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider">Covered Examples:</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Late ITR filing when required docs provided on time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Incorrect computation performed by Vertofi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Wrong TDS filings & delayed 26Q/24Q submissions</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-blue-600">
                Covers 234E & computation fines
              </div>
            </div>

            {/* Card 3: Payroll & PF/ESI */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-black mb-4">
                  PF
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Payroll & PF/ESI Warranty</h3>
                <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider">Covered Examples:</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Incorrect payroll wage processing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Wrong PF/ESI challan generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Late ECR filing caused by Vertofi delays</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-violet-600">
                Covers PF damages & interest u/s 14B
              </div>
            </div>

            {/* Card 4: Books & Documentation */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black mb-4">
                  DOC
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Books & Documentation Warranty</h3>
                <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider">Covered Examples:</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Assessment notices from Vertofi accounting errors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Scrutiny penalties resulting from Vertofi errors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Expense disallowances from Vertofi mistakes</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-amber-700">
                Subject to applicable warranty limits
              </div>
            </div>

          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Coverage Notice:</strong> Coverage is subject to applicable warranty limits and Conditions & Terms. Vertofi does NOT cover penalties caused by client delays, hidden sales, cash transactions, wrong information provided by client, or government portal outages.
            </p>
          </div>
        </div>

        {/* Section: SUBSCRIPTION WARRANTY PLANS (Comparison Table) */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Pricing & Tiers</p>
            <h2 className="text-2xl font-black text-slate-900">SUBSCRIPTION WARRANTY PLANS</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Basic Plan */}
            <div className={`bg-white rounded-2xl p-6 border ${currentPlan === "BASIC" ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-md" : "border-slate-200"} shadow-xs flex flex-col justify-between relative`}>
              {currentPlan === "BASIC" && (
                <span className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
                  Active Plan
                </span>
              )}
              <div>
                <h3 className="font-black text-xl text-slate-900">BASIC PLAN + WARRANTY</h3>
                <p className="text-xs text-slate-500 mt-1">Core GST & TDS protection</p>
                
                <div className="my-5">
                  <span className="text-3xl font-black text-slate-900">₹999</span>
                  <span className="text-xs text-slate-500 font-bold"> / month extra</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span><strong>Coverage:</strong> GST + TDS only</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span><strong>Annual Limit:</strong> ₹10,000 / year</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <XCircle className="h-4 w-4 text-slate-300" />
                    <span>Income Tax & PF/ESI not included</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400">Standard SLA Deadlines</span>
              </div>
            </div>

            {/* Pro Plan */}
            <div className={`bg-white rounded-2xl p-6 border ${currentPlan === "PRO" ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-md" : "border-slate-200"} shadow-xs flex flex-col justify-between relative`}>
              {currentPlan === "PRO" && (
                <span className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
                  Active Plan
                </span>
              )}
              <div>
                <h3 className="font-black text-xl text-slate-900">PRO PLAN + WARRANTY</h3>
                <p className="text-xs text-slate-500 mt-1">Comprehensive accounting protection</p>
                
                <div className="my-5">
                  <span className="text-3xl font-black text-slate-900">₹1,999</span>
                  <span className="text-xs text-slate-500 font-bold"> / month extra</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span><strong>Coverage:</strong> GST + TDS + Income Tax + PF/ESI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span><strong>Annual Limit:</strong> ₹30,000 / year</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Priority filing validation</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400">7-Day Claim Verification</span>
              </div>
            </div>

            {/* Elite / Enterprise Plan */}
            <div className={`bg-gradient-to-b from-indigo-50/50 to-white rounded-2xl p-6 border ${currentPlan === "ENTERPRISE" || currentPlan === "ELITE" ? "border-indigo-600 ring-2 ring-indigo-600/30 shadow-lg" : "border-indigo-200"} shadow-xs flex flex-col justify-between relative`}>
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-xs">
                {currentPlan === "ENTERPRISE" ? "Active On Your Account" : "Best Protection"}
              </span>
              <div>
                <h3 className="font-black text-xl text-slate-900">ELITE / ENTERPRISE WARRANTY</h3>
                <p className="text-xs text-slate-500 mt-1">Maximum protection & notice handling</p>
                
                <div className="my-5">
                  <span className="text-3xl font-black text-indigo-600">₹3,999</span>
                  <span className="text-xs text-slate-500 font-bold"> / month extra</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-800 border-t border-slate-200/60 pt-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-indigo-600" />
                    <span><strong>Coverage:</strong> All compliance penalties</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-indigo-600" />
                    <span><strong>Annual Limit:</strong> ₹1,00,000 / year</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-indigo-900">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Includes Dedicated Notice Handling</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/60">
                <span className="text-xs font-bold text-indigo-700">Highest Tier Coverage Active</span>
              </div>
            </div>

          </div>
        </div>

        {/* Penalty Scorecard & Compliance Monitoring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Penalty Scorecard */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" /> PENALTY SCORECARD
                </h3>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border border-emerald-200">
                  Low Risk
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center mb-4">
                <div className="h-20 w-20 rounded-full border-4 border-indigo-600 flex items-center justify-center bg-white shadow-xs mb-2">
                  <span className="text-3xl font-black text-indigo-600">{status?.scorecard?.overall ?? 94}</span>
                </div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Compliance Risk Score</p>
                <p className="text-[11px] text-slate-500 mt-0.5">High score = low risk of statutory penalties</p>
              </div>

              <div className="space-y-3 text-xs">
                {(status?.scorecard?.components || []).map((comp: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{comp.name}</span>
                      <span className="font-bold text-indigo-600">{comp.score}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${comp.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
              Calculated automatically from upload speed, GST 2B accuracy, and filing habits.
            </p>
          </div>

          {/* Compliance Monitoring */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" /> COMPLIANCE MONITORING
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Live tracking across all statutory filing areas</p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold">
                  6/6 Healthy
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(status?.monitoring || []).map((m: any, i: number) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs">{m.area}</h4>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          {m.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{m.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Continuous portal scanning & 2B reconciliations</span>
              <span className="font-mono text-[10px]">Updated: Today</span>
            </div>
          </div>

        </div>

        {/* Guaranteed Filing SLA (4 Cards) */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Commitment</p>
            <h2 className="text-2xl font-black text-slate-900">VERTOfi FILING SLA</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(status?.sla || []).map((item: any, i: number) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-indigo-100">
                    {item.status}
                  </span>
                  <h3 className="font-black text-slate-900 text-base mt-2 mb-1">{item.name}</h3>
                  <p className="text-2xl font-black text-indigo-600 mb-2">{item.commitment}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-3 pt-2 border-t border-slate-100">
                  Backed by the applicable warranty terms.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Penalty-Proof Report & Vertofi Black Box Record */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Penalty-Proof Report Banner */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">
                  Monthly Transparency
                </span>
                <span className="text-xs text-slate-400 font-medium">September 2026</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">PENALTY-PROOF REPORT</h3>
              <p className="text-slate-600 text-xs leading-relaxed mb-4">
                Monthly transparency statement verifying all filings completed, deadlines met, ITC matched, TDS accuracy, and predicted compliance risks.
              </p>

              <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Filings Met</p>
                  <p className="text-base font-black text-slate-900">100% (6/6)</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ITC Matched</p>
                  <p className="text-base font-black text-emerald-600">₹8.42L</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">TDS Accuracy</p>
                  <p className="text-base font-black text-indigo-600">100%</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchPenaltyReport();
                setShowReportModal(true);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Eye className="h-4 w-4" /> VIEW PENALTY-PROOF REPORT
            </button>
          </div>

          {/* Vertofi Black Box Record */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-600" /> VERTOfi BLACK BOX RECORD
                </h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Immutable Log</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed mb-3">
                Every action, file, edit and submission is logged to help determine responsibility if a penalty occurs.
              </p>

              <div className="space-y-2 text-xs">
                {(status?.blackbox || []).slice(0, 3).map((bb: any, i: number) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{bb.action}</p>
                      <p className="text-[10px] text-slate-400">{bb.actor} • {bb.timestamp}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-emerald-200">
                      {bb.logId}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between items-center">
              <span>Cryptographic audit trail active</span>
              <span className="font-bold text-indigo-600">Tamper-Proof</span>
            </div>
          </div>

        </div>

        {/* Quick Footer Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="font-bold text-indigo-950 text-sm">Need to report a penalty notice?</h4>
              <p className="text-xs text-indigo-700 mt-0.5">Submit penalty documentation for Vertofi 7–15 day review.</p>
            </div>
            <button
              type="button"
              onClick={() => { setView("claims"); setShowClaimForm(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-xs cursor-pointer"
            >
              OPEN CLAIMS CENTER
            </button>
          </div>

          <div className="bg-slate-100 border border-slate-200 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Review warranty conditions & exclusions</h4>
              <p className="text-xs text-slate-500 mt-0.5">Check document deadlines, client responsibilities, and limits.</p>
            </div>
            <button
              type="button"
              onClick={() => setView("conditions")}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs px-4 py-2 rounded-xl shrink-0 shadow-xs cursor-pointer"
            >
              VIEW CONDITIONS & TERMS
            </button>
          </div>
        </div>

      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // 2. CLAIMS CENTER TAB
  // ─────────────────────────────────────────────────────────────
  const renderClaims = () => {
    return (
      <div className="space-y-8 animate-in fade-in max-w-6xl mx-auto pb-20">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              Warranty Review
            </span>
            <h1 className="text-3xl font-black text-slate-900 mt-1 flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-amber-500 shrink-0" /> WARRANTY CLAIMS CENTER
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Submit a qualifying penalty for Vertofi review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowClaimForm(!showClaimForm)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xs flex items-center gap-2 transition cursor-pointer"
          >
            {showClaimForm ? <XCircle className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
            {showClaimForm ? "Close Form" : "SUBMIT A WARRANTY CLAIM"}
          </button>
        </div>

        {/* Claim Success / Alert Toast */}
        {claimToast && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-4 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Claim Submitted Successfully</p>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">{claimToast}</p>
            </div>
          </div>
        )}

        {/* Verification & Reimbursement Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">CLAIM REVIEW & VERIFICATION</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Claims are reviewed to determine whether the client, Vertofi or a system issue caused the penalty.
            </p>
            <div className="mt-3 p-2.5 bg-indigo-50 rounded-lg text-xs font-bold text-indigo-900 flex justify-between items-center">
              <span>Standard Review Period:</span>
              <span className="font-mono font-black text-indigo-700">7–15 Days</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">REIMBURSEMENT METHODS (IF APPROVED)</h3>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>1. Full penalty reimbursement:</strong> Directly to registered bank account</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>2. Fee adjustment:</strong> Credit adjusted against next month subscription</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span><strong>3. Direct payment:</strong> Paid directly by Vertofi to department where applicable</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Submit Claim Form */}
        {showClaimForm && (
          <div className="bg-white rounded-2xl border border-amber-300 shadow-md p-6 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-amber-500" /> SUBMIT A WARRANTY CLAIM
              </h3>
              <button 
                type="button" 
                onClick={() => setShowClaimForm(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Client / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={claimForm.clientName}
                    onChange={(e) => setClaimForm({ ...claimForm, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Compliance Area *
                  </label>
                  <select
                    value={claimForm.complianceArea}
                    onChange={(e) => setClaimForm({ ...claimForm, complianceArea: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-indigo-500"
                  >
                    <option value="GST">GST (GSTR-1, 3B, ITC)</option>
                    <option value="TDS">TDS (26Q, 24Q, Late Deductions)</option>
                    <option value="Income Tax">Income Tax (ITR, Computation)</option>
                    <option value="Payroll">Payroll & PF/ESI (ECR, Challans)</option>
                    <option value="Books">Books & Documentation (Assessment/Scrutiny)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Penalty Type *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GST Late Filing Fee"
                    value={claimForm.penaltyType}
                    onChange={(e) => setClaimForm({ ...claimForm, penaltyType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Penalty Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2500"
                    value={claimForm.amount}
                    onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Date of Penalty / Notice *
                  </label>
                  <input
                    type="date"
                    required
                    value={claimForm.noticeDate}
                    onChange={(e) => setClaimForm({ ...claimForm, noticeDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description: What happened? *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain the penalty notice received, the department order reference, and why you believe Vertofi is responsible..."
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-indigo-500"
                ></textarea>
              </div>

              {/* Required Data On-Time Toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Was required accounting/tax data provided on time?</p>
                  <p className="text-[11px] text-slate-500">Invoices, bank statements, and payroll inputs submitted within SLA deadlines</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClaimForm({ ...claimForm, dataProvidedOnTime: true })}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${claimForm.dataProvidedOnTime ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}
                  >
                    Yes, On Time
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimForm({ ...claimForm, dataProvidedOnTime: false })}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${!claimForm.dataProvidedOnTime ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700"}`}
                  >
                    No / Delayed
                  </button>
                </div>
              </div>

              {/* Supporting Document Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Supporting Documents (Notice, Penalty Order, GST/IT Summary, Proof of Payment)
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setClaimForm({ ...claimForm, fileName: f.name });
                  }}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50"
                >
                  <UploadCloud className="h-6 w-6 text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-700">
                    {claimForm.fileName ? `Selected File: ${claimForm.fileName}` : "Click to select and attach penalty document"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, PNG, JPG (Notice copy, demand challan, proof of payment)</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClaimForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {submittingClaim && <Loader2 className="h-4 w-4 animate-spin" />}
                  SUBMIT CLAIM
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Claim Detail Modal */}
        {activeClaim && (
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-lg p-6 space-y-6">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="bg-indigo-100 text-indigo-700 font-mono text-xs font-black px-2 py-0.5 rounded uppercase">
                  {activeClaim.id || activeClaim.claimId}
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{activeClaim.penaltyType}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Notice Date: {activeClaim.noticeDate} • Compliance: {activeClaim.complianceArea}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Penalty Claimed</p>
                <p className="text-2xl font-black text-indigo-600">₹{(Number(activeClaim.amount) || 0).toLocaleString("en-IN")}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  activeClaim.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                  activeClaim.status === "Reimbursed" ? "bg-emerald-100 text-emerald-800" :
                  activeClaim.status === "Denied" ? "bg-rose-100 text-rose-800" :
                  "bg-amber-100 text-amber-800"
                }`}>
                  Status: {activeClaim.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Eligibility Verification
                </h4>
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscription Status:</span>
                    <span className="font-bold text-emerald-600">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waiting Period (30 days):</span>
                    <span className="font-bold text-emerald-600">Completed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Submitted On Time:</span>
                    <span className="font-bold text-slate-800">{activeClaim.dataProvidedOnTime ? "Yes" : "No / Under Review"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Review Window:</span>
                    <span className="font-bold text-indigo-600">7–15 Days</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <FileSearch className="h-4 w-4 text-blue-600" /> Evidence & Responsibility
                </h4>
                <p className="text-slate-600 leading-relaxed pt-2">
                  {activeClaim.evidence?.responsibility || "Vertofi audit team is currently verifying the filing timestamp logs against the department notice reference to confirm liability."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveClaim(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Claim Details
              </button>
            </div>
          </div>
        )}

        {/* My Warranty Claims List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900">MY WARRANTY CLAIMS</h2>
            <span className="text-xs font-bold text-slate-400">Total: {claims.length} Claims</span>
          </div>

          {claims.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-xs text-center">
              <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base">No claims submitted yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                If you ever receive an unexpected penalty notice caused by a Vertofi error, click the button above to submit it for full reimbursement review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {claims.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setActiveClaim(c)}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 shadow-xs transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {c.id || c.claimId}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        c.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                        c.status === "Reimbursed" ? "bg-emerald-100 text-emerald-800" :
                        c.status === "Denied" ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition">
                      {c.penaltyType}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Notice Date: {c.noticeDate} • Submitted: {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "Recent"}
                    </p>
                  </div>

                  <div className="text-left md:text-right flex md:flex-col items-center md:items-end justify-between w-full md:w-auto">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Amount</p>
                      <p className="text-lg font-black text-slate-900">₹{(Number(c.amount) || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Review <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // 3. CONDITIONS & TERMS TAB (Full 15 Points from Source Doc)
  // ─────────────────────────────────────────────────────────────
  const renderConditions = () => {
    return (
      <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto pb-20">
        
        {/* Header */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border border-indigo-200">
            Terms of Coverage
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2 mb-1 tracking-tight">
            VERTOfi ACCOUNTING WARRANTY+™
          </h1>
          <h2 className="text-xl font-bold text-indigo-600">
            CONDITIONS & TERMS
          </h2>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Readable + practical guide to warranty rules, eligibility criteria, document cut-off deadlines, and exclusions.
          </p>
        </div>

        <div className="space-y-6">

          {/* 1. Client Data Requirements */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
              CLIENT MUST PROVIDE COMPLETE AND ACCURATE DATA
            </h3>
            <p className="text-xs text-slate-600 mb-3">To qualify for warranty coverage, clients must ensure:</p>
            <ul className="space-y-2 text-xs text-slate-700 pl-4 list-disc">
              <li>All sales and purchase invoices shared on time</li>
              <li>All bills and operational expenses submitted</li>
              <li>All bank statements provided monthly</li>
              <li>No hidden or undisclosed transactions</li>
              <li>No unreported cash sales or purchases</li>
            </ul>
            <p className="mt-3 text-xs font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <strong>Reason:</strong> Statutory penalties often arise from incomplete or delayed accounting data — this requirement ensures clean compliance.
            </p>
          </div>

          {/* 2. Document Submission Deadlines Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
              DOCUMENT SUBMISSION DEADLINES
            </h3>
            <p className="text-xs text-slate-600 mb-4">Cut-off timelines for document submissions:</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Activity / Document</th>
                    <th className="p-3 text-right">Applicable Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Purchase / Sales Invoices</td>
                    <td className="p-3 text-right font-bold text-indigo-600">Within 5 days of month end</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Bank Statements</td>
                    <td className="p-3 text-right font-bold text-indigo-600">5th of every month</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Payroll Inputs</td>
                    <td className="p-3 text-right font-bold text-indigo-600">25th of every month</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">GST Data</td>
                    <td className="p-3 text-right font-bold text-indigo-600">Before the 5th</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">TDS Details</td>
                    <td className="p-3 text-right font-bold text-indigo-600">3 days before due date</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Other Compliance Documents</td>
                    <td className="p-3 text-right font-bold text-indigo-600">As requested by Vertofi</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
              Important: If required documents are not submitted within the applicable deadline, warranty coverage may not apply.
            </div>
          </div>

          {/* 3. No Manual Changes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span>
              NO MANUAL CHANGES BY CLIENT
            </h3>
            <p className="text-xs text-slate-600 mb-2">The client must NOT:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              <li>Change ledger entries themselves</li>
              <li>File GST manually outside the Vertofi platform</li>
              <li>Modify books in third-party software</li>
              <li>Submit backdated documents or alter recorded transactions</li>
            </ul>
            <p className="mt-3 text-xs font-bold text-rose-600">
              Any unauthorized manual interference voids the warranty.
            </p>
          </div>

          {/* 4. Service Mistake Warranty */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span>
              WARRANTY COVERS VERTOfi ERRORS ONLY
            </h3>
            <p className="text-xs text-slate-600 mb-2">Qualifying situations include:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              <li>A filing was incorrectly performed by Vertofi</li>
              <li>A compliance deadline was missed by Vertofi</li>
              <li>Incorrect data or computation entered by Vertofi</li>
              <li>Tax or ITC amount miscalculated by Vertofi</li>
            </ul>
            <div className="mt-3 inline-block bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-xs font-black uppercase border border-indigo-200">
              SERVICE MISTAKE WARRANTY
            </div>
          </div>

          {/* 5. Exclusions (Not Covered) */}
          <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs">
            <h3 className="text-lg font-black text-rose-800 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">5</span>
              NOT COVERED (EXCLUSIONS)
            </h3>
            <p className="text-xs text-slate-600 mb-3">Vertofi does NOT cover penalties due to:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Client delays in providing docs</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Wrong info supplied by client</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Hidden sales or unreported cash</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Backdated or modified entries</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Fake or invalid supplier invoices</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Government portal crashes & outages</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Past non-compliance before joining</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Filings performed outside Vertofi</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Legal investigations, fraud, or tax evasion</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg">
                <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Non-payment of taxes by client</span>
              </div>
            </div>

            <p className="mt-4 text-xs font-bold text-rose-900 bg-rose-100 p-2.5 rounded-lg">
              Important: Warranty is NOT general insurance.
            </p>
          </div>

          {/* 6. System Control Requirement */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">6</span>
              VERTOfi MUST CONTROL THE ACCOUNTING SYSTEM
            </h3>
            <p className="text-xs text-slate-600 mb-2">For warranty eligibility, Vertofi handles:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              <li>GST compliance & return filing</li>
              <li>Primary accounting & ledger reconciliation</li>
              <li>TDS calculations & returns</li>
              <li>Payroll & statutory deductions</li>
              <li>No outside accountant interference</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">If multiple third-party accountants are involved without authorization, warranty eligibility may be affected.</p>
          </div>

          {/* 7. Zero-Entry Accounting */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">7</span>
              VERTOfi ZERO-ENTRY ACCOUNTING SYSTEM
            </h3>
            <p className="text-xs text-slate-600 mb-2">For high accuracy, clients must:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              <li>Upload documents via WhatsApp or portal</li>
              <li>Sync bank accounts</li>
              <li>Allow GST auto-fetch</li>
              <li>Allow automatic data validation & AI audits</li>
            </ul>
          </div>

          {/* 8. 48-Hour Response Requirement */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">8</span>
              CLIENT 48-HOUR RESPONSE REQUIREMENT
            </h3>
            <p className="text-xs text-slate-600 mb-2">If Vertofi requests:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              <li>Clarification on transaction or invoice</li>
              <li>Missing bill or vendor details</li>
              <li>Invoice proof or bank entry explanation</li>
            </ul>
            <p className="mt-3 text-xs font-bold text-indigo-700">
              The client must respond within 48 HOURS. Failure to respond may make the warranty inapplicable.
            </p>
          </div>

          {/* 9. Warranty Limits */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">9</span>
              WARRANTY LIMITS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Basic Tier</p>
                <p className="text-base font-black text-indigo-600 mt-1">₹10,000 / year</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Pro Tier</p>
                <p className="text-base font-black text-indigo-600 mt-1">₹30,000 / year</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="font-bold text-indigo-950">Elite / Enterprise Tier</p>
                <p className="text-base font-black text-indigo-600 mt-1">₹1,00,000 / year</p>
              </div>
            </div>
          </div>

          {/* 10. Documentation of Penalty */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">10</span>
              DOCUMENTATION OF PENALTY MUST BE PROVIDED
            </h3>
            <p className="text-xs text-slate-600 mb-2">When claiming, client must submit:</p>
            <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
              <li>Notice from tax or statutory department</li>
              <li>Penalty demand order copy</li>
              <li>GST / IT summary statement</li>
              <li>Proof of penalty payment (challan) where applicable</li>
            </ul>
          </div>

          {/* 11. 7-15 Days Verification */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">11</span>
              7–15 DAYS TO VERIFY PENALTY REASON
            </h3>
            <p className="text-xs text-slate-600">
              Vertofi has a standard 7–15 day audit window to inspect timestamp logs and determine whether the client, Vertofi, or a system failure caused the issue.
            </p>
          </div>

          {/* 12. Reimbursement Method */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">12</span>
              REIMBURSEMENT METHODS
            </h3>
            <p className="text-xs text-slate-600">
              Warranty settlements are disbursed via: Full penalty reimbursement, adjustment against next month subscription fees, or direct payment to the department where feasible.
            </p>
          </div>

          {/* 13. Penalty vs Tax Distinction */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">13</span>
              WARRANTY ONLY COVERS PENALTIES — NOT TAXES
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Penalty = Late fees, interest, compliance penalty.</strong><br />
              Warranty does <strong>NOT</strong> cover tax dues themselves. The client remains responsible for all actual tax liabilities.
            </p>
          </div>

          {/* 14. 30-Day Waiting Period */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">14</span>
              WARRANTY STARTS AFTER 30 DAYS
            </h3>
            <p className="text-xs text-slate-600">
              Warranty starts after 30 days of active subscription to prevent claims for issues that existed prior to joining Vertofi.
            </p>
          </div>

          {/* 15. Active Subscription Requirement */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">15</span>
              WARRANTY VALID ONLY WITH ACTIVE SUBSCRIPTION
            </h3>
            <p className="text-xs text-slate-600">
              If the client stops paying for the subscription or defaults, warranty coverage ends immediately.
            </p>
          </div>

          {/* Ready-to-Use Statement */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
            <h3 className="font-bold text-amber-400 text-sm uppercase tracking-wider mb-2">
              Ready-to-Use Warranty Statement (Short Version)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              "Vertofi Accounting Warranty+™ covers penalties arising only from Vertofi’s own errors in accounting or compliance filings. Client must provide accurate data on time, follow workflows, and avoid manual interference. Any penalty caused by client delay, mismatch, omission, incorrect data, legal investigation, fraud, or government system issues is not covered. Warranty limits apply."
            </p>
          </div>

        </div>

      </div>
    );
  };

  return (
    <SidebarShell>
      <main className="px-4 py-8 bg-slate-50 min-h-screen">
        <LockedFeatureGate feature="accounting_warranty">
          
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-8 w-fit mx-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setView("overview")}
              className={`px-5 py-2 text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                view === "overview"
                  ? "bg-indigo-600 shadow-sm text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Overview
            </button>
            <button
              type="button"
              onClick={() => {
                setView("claims");
                setActiveClaim(null);
              }}
              className={`px-5 py-2 text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                view === "claims"
                  ? "bg-indigo-600 shadow-sm text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Briefcase className="h-4 w-4" /> Claims Center
            </button>
            <button
              type="button"
              onClick={() => setView("conditions")}
              className={`px-5 py-2 text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                view === "conditions"
                  ? "bg-indigo-600 shadow-sm text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-4 w-4" /> Conditions & Terms
            </button>
          </div>

          {/* Tab Views */}
          {view === "overview" && renderOverview()}
          {view === "claims" && renderClaims()}
          {view === "conditions" && renderConditions()}

          {/* Monthly Penalty-Proof Transparency Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                  <div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      Transparency Statement
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-1">
                      {reportData?.title || "Monthly Penalty-Proof Transparency Report"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Period: {reportData?.period || "September 2026"} • Guaranteed by Vertofi Accounting Warranty+™
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Filings Completed</p>
                    <p className="text-xl font-black text-slate-900">{reportData?.filingsCompleted ?? 6} / 6</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Deadlines Met</p>
                    <p className="text-xl font-black text-emerald-700">{reportData?.deadlinesMet ?? "100%"}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase">ITC Reconciled</p>
                    <p className="text-xl font-black text-indigo-700">{reportData?.itcMatched ?? "₹8.42L"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Filings Summary</h4>
                  <div className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl overflow-hidden">
                    {(reportData?.filingsSummary || [
                      { name: "GSTR-1 Return", dueDate: "11th of month", filedDate: "9th of month", status: "Filed Early" },
                      { name: "GSTR-3B Return", dueDate: "20th of month", filedDate: "17th of month", status: "Filed Early" },
                      { name: "TDS Challan Deposit", dueDate: "7th of month", filedDate: "5th of month", status: "Deposited On Time" },
                      { name: "PF/ESI Statutory Filing", dueDate: "15th of month", filedDate: "12th of month", status: "Filed On Time" },
                    ]).map((f: any, i: number) => (
                      <div key={i} className="p-3 flex justify-between items-center bg-slate-50/50">
                        <div>
                          <p className="font-bold text-slate-800">{f.name}</p>
                          <p className="text-[10px] text-slate-400">Due: {f.dueDate} • Filed: {f.filedDate}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          {f.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Protection Certified:</strong> All statutory deadlines and filings for the period have been verified with zero qualifying penalties incurred.
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Print Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </LockedFeatureGate>
      </main>
    </SidebarShell>
  );
}
