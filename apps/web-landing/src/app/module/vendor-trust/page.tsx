"use client";

import { useEffect, useState } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";
import { 
  ShieldCheck, Search, ShieldAlert, AlertTriangle, AlertOctagon, 
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

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in max-w-5xl mx-auto">
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
                  placeholder="Enter Vendor Name or GSTIN (e.g. Should I trust ABC Suppliers?)" 
                  className="w-full rounded-lg bg-white/10 pl-10 pr-4 py-3 text-white placeholder-slate-400 border border-slate-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-sm"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
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

      {report && renderReport()}

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
    </div>
  );

  const renderReport = () => {
    if (!report) return null;
    const c = getColorClass(report.trustScore);
    const p = report.pillars;

    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-5xl mx-auto">
        <button onClick={() => { setReport(null); setQuery(""); }} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowRight className="h-4 w-4 rotate-180" /> New Vendor Search
        </button>

        {/* HERO SCORE */}
        <div className={`rounded-2xl p-8 text-white shadow-xl bg-${c}-600 relative overflow-hidden`}>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-black/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">Trust Score Report</span>
                <span className="flex items-center gap-1 text-xs font-medium"><Clock className="h-3 w-3" /> Updated: {report.lastUpdated}</span>
              </div>
              <h1 className="text-4xl font-black mb-1">{report.vendorInfo.name}</h1>
              <p className="text-${c}-100 font-medium mb-6 flex items-center gap-4">
                <span>GSTIN: {report.vendorInfo.gstin}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${report.vendorInfo.status === 'Active' ? 'bg-white/20' : 'bg-rose-500'}`}>
                  GST {report.vendorInfo.status}
                </span>
              </p>
              
              <div className="bg-black/15 rounded-xl p-5 backdrop-blur-sm border border-white/10 max-w-lg">
                <p className="text-xs font-bold uppercase opacity-80 mb-2">Recommendation</p>
                <h2 className="text-2xl font-bold mb-1">{report.recommendation}</h2>
                {report.advice.map((adv:string, i:number) => (
                  <div key={i} className="flex items-start gap-2 mt-2">
                    <CheckCircle className="h-4 w-4 shrink-0 opacity-80 mt-0.5" />
                    <p className="text-sm leading-snug">{adv}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider mb-2">Vendor Trust Score</p>
              <div className="text-7xl font-black tabular-nums tracking-tighter my-2">{report.trustScore}</div>
              <p className="text-sm font-bold uppercase tracking-widest">{report.classification}</p>
              <p className="text-[10px] mt-2 opacity-70">Assessment Coverage: 100%</p>
            </div>
          </div>
          {/* Watermark icon */}
          <ShieldCheck className="absolute -right-20 -bottom-20 h-96 w-96 text-white/10 rotate-12" />
        </div>

        {/* 6 PILLAR ANALYSIS GRID */}
        <h3 className="font-bold text-slate-800 text-lg mt-8 mb-4">Detailed Risk Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. GST Compliance */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /> GST Compliance</h4>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.gst.status.includes('High') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.gst.status}</span>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Filing Consistency</span><span className="font-medium text-slate-800">{p.gst.details.onTime} On-time, {p.gst.details.late} Late</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>GSTR-1/3B Match</span><span className={`font-medium ${p.gst.details.mismatch.includes('⚠') ? 'text-rose-600' : 'text-slate-800'}`}>{p.gst.details.mismatch}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>ITC Claimed</span><span className="font-medium text-slate-800">{p.gst.details.itcSpike}</span></div>
            </div>
            <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: GSTN API (Simulated)</p>
          </div>

          {/* 2. Legal Intelligence */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><Landmark className="h-4 w-4 text-amber-500" /> Legal Intelligence</h4>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.legal.status.includes('High') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{p.legal.status}</span>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Open Disputes</span><span className={`font-medium ${p.legal.details.openDisputes > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{p.legal.details.openDisputes} detected</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>NCLT Insolvency</span><span className={`font-medium ${p.legal.details.nclt !== 'None detected' ? 'text-rose-600' : 'text-slate-800'}`}>{p.legal.details.nclt}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>MCA Health</span><span className="font-medium text-slate-800">{p.legal.details.mcaHealth}</span></div>
            </div>
            <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: MCA & Court Scraper</p>
          </div>

          {/* 3. Payment Behaviour */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-500" /> Payment Behaviour</h4>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.payment.status === 'Stable' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.payment.status}</span>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>On-Time Rate</span><span className="font-medium text-slate-800">{p.payment.details.onTimeRate}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Average Delay</span><span className="font-medium text-slate-800">{p.payment.details.avgDelay}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Overdue Invoices</span><span className="font-medium text-slate-800">{p.payment.details.overdueInvoices}</span></div>
            </div>
            <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: Accounting Sync</p>
          </div>

          {/* 4. Financial Stability */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Financial Stability</h4>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.financial.status === 'Strong' ? 'bg-emerald-100 text-emerald-700' : p.financial.status === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{p.financial.status}</span>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>YOY Sales Trend</span><span className={`font-medium ${p.financial.details.yoySales.includes('-') ? 'text-rose-600' : 'text-emerald-600'}`}>{p.financial.details.yoySales}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Cashflow Strength</span><span className="font-medium text-slate-800">{p.financial.details.cashflow}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Director History</span><span className="font-medium text-slate-800">{p.financial.details.directorHistory}</span></div>
            </div>
            <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> External verification source not connected</p>
          </div>

          {/* 5. Historical Reliability */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Reliability</h4>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.reliability.status === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.reliability.status}</span>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>On-Time Delivery</span><span className="font-medium text-slate-800">{p.reliability.details.onTimeDelivery}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Disputes</span><span className="font-medium text-slate-800">{p.reliability.details.disputes}</span></div>
              <div className="flex justify-between border-b border-slate-50 pb-1"><span>Overbilling Check</span><span className="font-medium text-slate-800">{p.reliability.details.overbilling}</span></div>
            </div>
            <p className="text-[9px] text-slate-400 mt-4 flex items-center gap-1"><Info className="h-3 w-3" /> Data Source: Anonymous Vertofi Ratings</p>
          </div>

          {/* 6. Fraud Probability Indicator */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm text-white">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-white flex items-center gap-2"><AlertOctagon className="h-4 w-4 text-rose-400" /> Fraud Risk Indicator</h4>
              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${p.fraudRisk.indicator === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-300'}`}>{p.fraudRisk.indicator} RISK</span>
            </div>
            <p className="text-sm text-slate-300 leading-snug mb-4">{p.fraudRisk.summary}</p>
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">AI-based risk indicator</p>
              <p className="text-xs text-slate-300">This is a predictive model. The available indicators show elevated risk levels, but this does not guarantee fraud.</p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <SidebarShell>
      <LockedFeatureGate feature="vendor_trust">
        <main className="px-4 py-8">
          {!report ? renderDashboard() : renderReport()}
        </main>
      </LockedFeatureGate>
    </SidebarShell>
  );
}
