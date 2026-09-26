"use client";

import { useEffect, useState } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";
import { 
  ShieldCheck, Search, ShieldAlert, AlertTriangle, AlertOctagon, AlertCircle,
  CheckCircle, ArrowRight, Activity, TrendingUp, TrendingDown,
  Building, FileText, Landmark, Clock, Info
} from "lucide-react";

type VendorReport = any;

export default function VendorTrustPage() {
  const [orgId] = useState("demo-business-org");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [report, setReport] = useState<VendorReport | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const scanSteps = [
    "Verifying GSTIN records & GSTR-3B filings...",
    "Scanning MCA databases for ROC compliance...",
    "Querying NCLT & Legal dispute registries...",
    "Analyzing payment behaviour patterns...",
    "Calculating AI Fraud Probability Score..."
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/v1/vendor_trust_reports/${orgId}`);
      if (res.ok) {
        const json = await res.json();
        setHistory(Array.isArray(json) ? json.reverse().slice(0, 5) : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e?: React.FormEvent, historicalQuery?: string) => {
    e?.preventDefault();
    const rawQuery = historicalQuery || query;
    const searchQuery = rawQuery.trim().toUpperCase();

    if (!searchQuery) {
      setErrorMessage("Please enter a valid GSTIN.");
      setReport(null);
      return;
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(searchQuery)) {
      if (searchQuery.length !== 15) {
        setErrorMessage("Please enter a GSTIN for verified vendor analysis.");
      } else {
        setErrorMessage("Please enter a valid GSTIN.");
      }
      setReport(null);
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setReport(null);
    setScanStep(0);

    const interval = setInterval(() => {
      setScanStep(s => {
        if (s >= scanSteps.length - 1) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 350);

    try {
      const res = await fetch("/api/v1/vendor-trust/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorQuery: searchQuery })
      });
      const json = await res.json();
      if (json.success && json.report) {
        setReport(json.report);
        await fetch(`/api/v1/vendor_trust_reports/${orgId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, score: json.report.trustScore, date: new Date().toISOString() })
        });
        fetchHistory();
      } else {
        setErrorMessage(json.error || "GSTIN not found or no registration information is available.");
      }
    } catch (err) {
      setErrorMessage("GST verification service is currently unavailable. Please try again.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const getColorClass = (score: number) => {
    if (score >= 80) return "emerald";
    if (score >= 60) return "blue";
    if (score >= 40) return "amber";
    return "rose";
  };

  const renderVendorAnalysisCard = () => {
    if (!report) return null;
    const v = report.vendorInfo;
    const isCancelled = v.status === "CANCELLED";
    const isSuspended = v.status === "SUSPENDED";

    return (
      <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
        {/* VENDOR ANALYSIS CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {v.verificationStatus || "VERIFIED"}
                </span>
                <span className={`text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded border ${
                  isCancelled 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : isSuspended 
                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  STATUS: {v.status}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">VENDOR ANALYSIS</h2>
              <p className="text-xs text-slate-500 mt-0.5">GST Registration &amp; Taxpayer Compliance Profile</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 font-medium">GSTIN</span>
              <p className="font-mono text-base font-bold text-slate-800">{v.gstin}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Legal Business Name</span>
                <p className="text-base font-semibold text-slate-900 mt-0.5">{v.name || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Trade Name</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{v.tradeName || v.name || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Taxpayer Type</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{v.taxpayerType || "Regular Taxpayer"}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Registration Date</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{v.registrationDate || "—"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">State / Jurisdiction</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{v.state || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Business Address</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5 leading-relaxed">{v.address || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Primary Business Activities</span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{v.businessActivities || "Commercial Services & Trading"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* VENDOR TRUST INDICATOR & SCORE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Application Assessment</span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">VENDOR TRUST INDICATOR</h3>
              <p className="text-xs text-slate-500 mt-1">
                Data-backed reliability indicator generated from available GSTN and statutory registries.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4 shrink-0">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500">Trust Score</span>
                <div className={`text-4xl font-black tabular-nums text-${getColorClass(report.trustScore)}-600`}>
                  {report.trustScore}<span className="text-lg font-bold text-slate-400">/100</span>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200"></div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Risk Classification</span>
                <div className={`text-sm font-bold uppercase ${
                  report.riskLevel === "LOW" 
                    ? "text-emerald-700" 
                    : report.riskLevel === "MEDIUM" 
                    ? "text-amber-700" 
                    : "text-rose-700"
                }`}>
                  {report.riskLevel} RISK
                </div>
                <span className="text-[11px] text-slate-500 block">GST Verified</span>
              </div>
            </div>
          </div>

          {/* KEY FINDINGS & WHY THIS RESULT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> Key Findings
              </h4>
              <div className="space-y-2.5">
                {report.keyFindings?.map((finding: string, idx: number) => {
                  const isWarn = finding.startsWith("⚠");
                  return (
                    <div 
                      key={idx} 
                      className={`text-xs p-2.5 rounded-lg border flex items-start gap-2 ${
                        isWarn 
                          ? "bg-amber-50/70 border-amber-200/60 text-amber-900" 
                          : "bg-emerald-50/50 border-emerald-100 text-slate-800"
                      }`}
                    >
                      <span className="font-bold shrink-0">{isWarn ? "⚠" : "✓"}</span>
                      <span className="leading-snug">{finding.replace(/^[✓⚠]\s*/, "")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-blue-600" /> Why this result?
              </h4>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs text-slate-700">
                {report.whyThisResult?.map((reason: string, idx: number) => (
                  <p key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-400 font-bold">•</span>
                    <span>{reason}</span>
                  </p>
                ))}
                <div className="pt-2 mt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Assessment Note:</span> This score reflects available GST compliance and public record data. It serves as a vendor reliability indicator rather than a guarantee of honesty.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 PILLAR DETAILED RISK BREAKDOWN */}
        <div className="pt-2">
          <h3 className="font-bold text-slate-800 text-base mb-4">Detailed Compliance &amp; Risk Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 1. GST Compliance */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /> GST Compliance</h4>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${report.pillars.gst.status.includes('High') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{report.pillars.gst.status}</span>
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Filing Consistency</span><span className="font-medium text-slate-800">{report.pillars.gst.details.onTime} On-time, {report.pillars.gst.details.late} Late</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>GSTR-1/3B Match</span><span className={`font-medium ${report.pillars.gst.details.mismatch.includes('⚠') ? 'text-rose-600' : 'text-slate-800'}`}>{report.pillars.gst.details.mismatch}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>ITC Claimed</span><span className="font-medium text-slate-800">{report.pillars.gst.details.itcSpike}</span></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: GSTN Records</p>
            </div>

            {/* 2. Legal Intelligence */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-amber-500" /> Legal Intelligence</h4>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${report.pillars.legal.status.includes('High') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{report.pillars.legal.status}</span>
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Open Disputes</span><span className={`font-medium ${report.pillars.legal.details.openDisputes > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{report.pillars.legal.details.openDisputes} detected</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>NCLT Insolvency</span><span className={`font-medium ${report.pillars.legal.details.nclt !== 'None detected' ? 'text-rose-600' : 'text-slate-800'}`}>{report.pillars.legal.details.nclt}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>MCA Status</span><span className="font-medium text-slate-800">{report.pillars.legal.details.mcaHealth}</span></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: MCA &amp; Court Registry</p>
            </div>

            {/* 3. Payment Behaviour */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-500" /> Payment Behaviour</h4>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${report.pillars.payment.status === 'Stable' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{report.pillars.payment.status}</span>
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>On-Time Rate</span><span className="font-medium text-slate-800">{report.pillars.payment.details.onTimeRate}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Average Delay</span><span className="font-medium text-slate-800">{report.pillars.payment.details.avgDelay}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Overdue Invoices</span><span className="font-medium text-slate-800">{report.pillars.payment.details.overdueInvoices}</span></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: Ledger &amp; Invoices</p>
            </div>

            {/* 4. Financial Stability */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Financial Stability</h4>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${report.pillars.financial.status === 'Strong' ? 'bg-emerald-100 text-emerald-700' : report.pillars.financial.status === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{report.pillars.financial.status}</span>
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Sales Trend</span><span className={`font-medium ${report.pillars.financial.details.yoySales.includes('-') ? 'text-rose-600' : 'text-emerald-600'}`}>{report.pillars.financial.details.yoySales}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Cashflow Strength</span><span className="font-medium text-slate-800">{report.pillars.financial.details.cashflow}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Director History</span><span className="font-medium text-slate-800">{report.pillars.financial.details.directorHistory}</span></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: Statutory Filings</p>
            </div>

            {/* 5. Historical Reliability */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Reliability</h4>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${report.pillars.reliability.status === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{report.pillars.reliability.status}</span>
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>On-Time Delivery</span><span className="font-medium text-slate-800">{report.pillars.reliability.details.onTimeDelivery}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Disputes</span><span className="font-medium text-slate-800">{report.pillars.reliability.details.disputes}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-1"><span>Overbilling Check</span><span className="font-medium text-slate-800">{report.pillars.reliability.details.overbilling}</span></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: Trade References</p>
            </div>

            {/* 6. Fraud Probability Indicator */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm text-white">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2"><AlertOctagon className="h-4 w-4 text-rose-400" /> Fraud Risk Indicator</h4>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${report.pillars.fraudRisk.indicator === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-300'}`}>{report.pillars.fraudRisk.indicator} RISK</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{report.pillars.fraudRisk.summary}</p>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">AI-based risk indicator</p>
                <p className="text-[11px] text-slate-300">Predictive intelligence generated from verified statutory filings.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <SidebarShell>
      <LockedFeatureGate feature="vendor_trust">
        <main className="px-4 py-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
          {/* SEARCH CARD */}
          <div className="rounded-2xl bg-slate-900 p-8 shadow-2xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-emerald-400" /> Vendor Trust Score
              </h1>
              <p className="text-slate-300 text-sm mb-6 max-w-lg">
                Business Fraud Prevention &amp; Vendor Reliability Intelligence System. Answer the question: <span className="font-bold text-white">&quot;Should I trust this vendor?&quot;</span>
              </p>
              
              <form onSubmit={handleSearch} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Check a Vendor</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input 
                      type="text" 
                      value={query}
                      onChange={e => {
                        setQuery(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Enter Vendor Name or GSTIN (e.g. 27ABCDE1234F1Z5)" 
                      className="w-full rounded-lg bg-white/10 pl-10 pr-4 py-3 text-white placeholder-slate-400 border border-slate-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-sm"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? "Analyzing..." : "Analyze"}
                  </button>
                </div>

                {errorMessage && (
                  <div className="mt-3 p-3 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            </div>
            {/* BG flair */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"></div>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center min-h-[250px]">
              <div className="relative h-16 w-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                <ShieldCheck className="absolute inset-0 m-auto h-7 w-7 text-emerald-500 animate-pulse" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Running Due Diligence...</h3>
              <p className="text-xs font-medium text-emerald-600 h-5">{scanSteps[scanStep]}</p>
            </div>
          )}

          {/* VENDOR ANALYSIS & TRUST INDICATOR RESULT (DIRECTLY BELOW SEARCH) */}
          {!loading && report && renderVendorAnalysisCard()}

          {/* RECENT SEARCHES */}
          {!loading && !report && history.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Recently Checked Vendors</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {history.map((h, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      setQuery(h.query);
                      handleSearch(undefined, h.query);
                    }} 
                    className="border border-slate-100 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{h.query}</p>
                      <p className="text-[10px] text-slate-500">{new Date(h.date).toLocaleDateString()}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold text-white bg-${getColorClass(h.score)}-500`}>
                      {h.score}/100
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </LockedFeatureGate>
    </SidebarShell>
  );
}
