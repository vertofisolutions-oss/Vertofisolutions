"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SidebarShell } from "../../components/SidebarShell";
import { LockedFeatureGate } from "../../components/LockedFeatureGate";
import {
  TrendingDown, FileWarning, Search, AlertCircle, AlertTriangle, ShieldCheck, 
  Activity, ArrowRight, DollarSign, Ban, UploadCloud, Download, CheckCircle2,
  PieChart, LineChart as LineChartIcon, RefreshCw
} from "lucide-react";

export default function ProfitLeakFinderPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [orgId, setOrgId] = useState("demo-business-org");

  useEffect(() => {
    fetchIssues();
  }, [orgId]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/accounting/${orgId}/profit_leakage_issues`);
      if (res.ok) {
        const data = await res.json();
        setIssues(Array.isArray(data) ? data : []);
      } else {
        setIssues([]);
      }
    } catch (err) {
      console.error(err);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await fetch("/api/v1/profitleak-finder/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        await fetchIssues();
      }
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateIssueStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/v1/accounting/${orgId}/profit_leakage_issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setIssues(issues.map(i => i.id === id ? { ...i, status } : i));
    } catch (err) {
      console.error("Failed to update issue status", err);
    }
  };

  const metrics = useMemo(() => {
    const activeIssues = issues.filter(i => i.status !== "Resolved" && i.status !== "Ignored");
    const totalLeakage = activeIssues.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const resolvedIssues = issues.filter(i => i.status === "Resolved");
    const actualSavings = resolvedIssues.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    
    const highRisk = activeIssues.filter(i => i.riskLevel === "High").length;
    const medRisk = activeIssues.filter(i => i.riskLevel === "Medium").length;
    const lowRisk = activeIssues.filter(i => i.riskLevel === "Low").length;

    return { totalLeakage, actualSavings, activeIssues: activeIssues.length, highRisk, medRisk, lowRisk };
  }, [issues]);

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: PieChart },
    { id: "issues", label: "Action Center", icon: AlertTriangle },
    { id: "ingestion", label: "Data Ingestion", icon: UploadCloud },
    { id: "report", label: "Monthly Report", icon: Download },
  ];

  return (
    <SidebarShell>
      <LockedFeatureGate feature="profitleak_finder">
        <div className="mx-auto w-full max-w-[1600px] p-6 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 shadow-xl text-white overflow-hidden relative">
            {/* Abstract background shapes */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-purple-500 blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                  <TrendingDown className="h-8 w-8 text-indigo-300" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">Profit Leakage Detector</h1>
                  <p className="text-indigo-200 mt-1 font-medium">AI-Driven Internal Audit &amp; Money-Saving Engine</p>
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              <button 
                onClick={runAnalysis}
                disabled={analyzing}
                className="group relative flex items-center gap-2 px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-70"
              >
                <RefreshCw className={`h-5 w-5 ${analyzing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                {analyzing ? "AI Auditing Ledger..." : "Run AI Audit Now"}
                {/* Ping animation when active */}
                {analyzing && <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>}
              </button>
            </div>
          </div>

          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Potential Savings</p>
                  <h3 className="text-3xl font-black text-rose-600 mt-2 tracking-tight">₹{metrics.totalLeakage.toLocaleString("en-IN")}</h3>
                  <p className="text-xs text-rose-500 font-medium mt-1">Detected this month</p>
                </div>
                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Actual Money Saved</p>
                  <h3 className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">₹{metrics.actualSavings.toLocaleString("en-IN")}</h3>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Resolved issues</p>
                </div>
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">High Risk Issues</p>
                  <h3 className="text-3xl font-black text-amber-600 mt-2 tracking-tight">{metrics.highRisk}</h3>
                  <p className="text-xs text-amber-600 font-medium mt-1">Require immediate attention</p>
                </div>
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Leakages</p>
                  <h3 className="text-3xl font-black text-indigo-600 mt-2 tracking-tight">{metrics.activeIssues}</h3>
                  <p className="text-xs text-indigo-600 font-medium mt-1">Total pending items</p>
                </div>
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Interface Navigation */}
          <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-max overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    activeTab === tab.id 
                      ? "bg-white text-indigo-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${activeTab === tab.id ? "text-indigo-600" : ""}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Contents */}
          <div className="min-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="font-medium">Loading ledger data...</p>
              </div>
            ) : (
              <>
                {activeTab === "dashboard" && <DashboardTab issues={issues} metrics={metrics} />}
                {activeTab === "issues" && <ActionCenterTab issues={issues} updateStatus={updateIssueStatus} />}
                {activeTab === "ingestion" && <DataIngestionTab />}
                {activeTab === "report" && <MonthlyReportTab issues={issues} metrics={metrics} />}
              </>
            )}
          </div>
        </div>
      </LockedFeatureGate>
    </SidebarShell>
  );
}

// ---------------- COMPONENTS ---------------- //

function DashboardTab({ issues, metrics }: { issues: any[], metrics: any }) {
  const CATEGORIES = [
    { id: "Overspending", name: "Overspending Alerts", desc: "Sudden spending spikes & abnormal vendor costs", icon: TrendingDown, color: "rose" },
    { id: "DuplicateInvoice", name: "Duplicate Invoices", desc: "Repeated invoices, double payments", icon: FileWarning, color: "orange" },
    { id: "HiddenFee", name: "Hidden Bank Fees", desc: "SMS charges, overdrafts, payment gateway fees", icon: Ban, color: "purple" },
    { id: "UnnecessarySubscription", name: "Subscription Audit", desc: "Unused SaaS, duplicate tools", icon: LineChartIcon, color: "blue" },
    { id: "UnclaimedITC", name: "Unclaimed ITC", desc: "Mismatched GST, vendors not filing", icon: ShieldCheck, color: "emerald" },
    { id: "MissedDeduction", name: "Missed Tax Deductions", desc: "Missed depreciation, 80JJAA, etc", icon: DollarSign, color: "teal" },
  ];

  const getAmountForCategory = (catId: string) => {
    return issues
      .filter(i => i.category === catId && i.status !== "Resolved" && i.status !== "Ignored")
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  };

  const getCountForCategory = (catId: string) => {
    return issues.filter(i => i.category === catId && i.status !== "Resolved" && i.status !== "Ignored").length;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" /> Financial Leakage Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const amt = getAmountForCategory(cat.id);
            const count = getCountForCategory(cat.id);
            const colorClasses = {
              rose: "bg-rose-50 text-rose-600 border-rose-100",
              orange: "bg-orange-50 text-orange-600 border-orange-100",
              purple: "bg-purple-50 text-purple-600 border-purple-100",
              blue: "bg-blue-50 text-blue-600 border-blue-100",
              emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
              teal: "bg-teal-50 text-teal-600 border-teal-100",
            }[cat.color];

            return (
              <div key={cat.id} className={`rounded-xl border p-5 flex flex-col justify-between transition hover:shadow-md bg-white border-slate-200`}>
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${colorClasses}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {count > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {count} Issues
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <h3 className="font-bold text-slate-800">{cat.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{cat.desc}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Leakage Amount</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">₹{amt.toLocaleString("en-IN")}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

function ActionCenterTab({ issues, updateStatus }: { issues: any[], updateStatus: (id: string, s: string) => void }) {
  const [filter, setFilter] = useState("Active"); // Active, Resolved, All

  const filteredIssues = useMemo(() => {
    let sorted = [...issues].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter === "Active") return sorted.filter(i => i.status !== "Resolved" && i.status !== "Ignored");
    if (filter === "Resolved") return sorted.filter(i => i.status === "Resolved" || i.status === "Ignored");
    return sorted;
  }, [issues, filter]);

  const riskColor = (r: string) => {
    if (r === "High") return "bg-rose-100 text-rose-700 border-rose-200";
    if (r === "Medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  };

  const statusColor = (s: string) => {
    if (s === "Resolved") return "bg-emerald-100 text-emerald-700";
    if (s === "Under Review" || s === "Investigating") return "bg-blue-100 text-blue-700";
    if (s === "Ignored") return "bg-slate-100 text-slate-600";
    return "bg-rose-100 text-rose-700"; // New
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h2 className="text-lg font-bold text-slate-900">Issue Action Center</h2>
        <div className="flex gap-2">
          {["Active", "Resolved", "All"].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === f ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="p-4">Issue Description</th>
              <th className="p-4">Category</th>
              <th className="p-4">Risk Level</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                  No issues found for the selected filter.
                </td>
              </tr>
            ) : filteredIssues.map(issue => (
              <tr key={issue.id} className="hover:bg-slate-50/50 transition">
                <td className="p-4">
                  <p className="font-bold text-slate-900">{issue.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 max-w-sm">{issue.description}</p>
                </td>
                <td className="p-4 text-sm font-medium text-slate-700">
                  {issue.category.replace(/([A-Z])/g, ' $1').trim()}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${riskColor(issue.riskLevel)}`}>
                    {issue.riskLevel}
                  </span>
                </td>
                <td className="p-4 font-black text-slate-900">
                  ₹{Number(issue.amount).toLocaleString("en-IN")}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusColor(issue.status)}`}>
                    {issue.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {issue.status !== "Resolved" && issue.status !== "Ignored" ? (
                    <div className="flex justify-end gap-2">
                      <select 
                        value={issue.status}
                        onChange={(e) => updateStatus(issue.id, e.target.value)}
                        className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="New">New</option>
                        <option value="Under Review">Review</option>
                        <option value="Investigating">Investigate</option>
                      </select>
                      <button 
                        onClick={() => updateStatus(issue.id, "Resolved")}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition shadow-sm"
                        title="Mark as Resolved (Add to Savings)"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => updateStatus(issue.id, "Ignored")}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1.5 rounded-lg transition"
                        title="Ignore Issue"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => updateStatus(issue.id, "New")}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Reopen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataIngestionTab() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
      <div className="text-center max-w-lg mx-auto">
        <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <UploadCloud className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Data Ingestion Center</h2>
        <p className="text-sm text-slate-500 mt-2">
          Upload bank statements, GSTR-2B JSON, credit card statements, or Tally backups. Our AI will classify transactions and identify profit leaks.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Bank Statements", desc: "PDF or Excel formats" },
          { title: "GST Data (2A/2B/3B)", desc: "JSON or Excel downloads" },
          { title: "Invoices & Receipts", desc: "PDFs or scanned images" },
          { title: "Tally / Zoho Backup", desc: "XML or Excel exports" },
          { title: "Payroll Sheets", desc: "Excel formats" },
          { title: "Credit Card Statements", desc: "PDF formats" }
        ].map(item => (
          <div key={item.title} className="border-2 border-dashed border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:bg-indigo-50/50 transition cursor-pointer text-center group">
            <h3 className="font-bold text-slate-800 group-hover:text-indigo-700">{item.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            <button className="mt-4 text-xs font-bold bg-white border border-slate-200 px-4 py-2 rounded-lg group-hover:border-indigo-300">
              Select File
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyReportTab({ issues, metrics }: { issues: any[], metrics: any }) {
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white max-w-4xl mx-auto border border-slate-200 shadow-xl print:shadow-none print:border-none p-10 print:p-0">
      
      {/* Report Header */}
      <div className="border-b-4 border-indigo-900 pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Profit Leakage Report</h1>
          <p className="text-lg font-bold text-indigo-600 mt-1">{currentMonth}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800">Generated by Vertofi AI</p>
          <p className="text-sm text-slate-500">Internal Audit & Advisory</p>
        </div>
      </div>

      {/* Exec Summary */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Executive Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Leakage Found</p>
            <p className="text-2xl font-black text-rose-600 mt-1">₹{metrics.totalLeakage.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Actual Savings</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">₹{metrics.actualSavings.toLocaleString("en-IN")}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase">High Risk Issues</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.highRisk}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Issues</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{issues.length}</p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Leakage Breakdown by Category</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-100 text-xs font-bold text-slate-600 uppercase">
              <th className="p-3 rounded-tl-lg">Risk</th>
              <th className="p-3">Issue Title</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right rounded-tr-lg">Amount Detected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {issues.filter(i => i.status !== "Ignored").map(issue => (
              <tr key={issue.id} className="text-sm">
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${issue.riskLevel === 'High' ? 'bg-rose-100 text-rose-700' : issue.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {issue.riskLevel}
                  </span>
                </td>
                <td className="p-3 font-bold text-slate-800">{issue.title}</td>
                <td className="p-3 text-slate-600 text-xs">{issue.description}</td>
                <td className="p-3 font-black text-slate-900 text-right">
                  {issue.status === "Resolved" ? (
                     <span className="text-emerald-600 flex items-center justify-end gap-1"><CheckCircle2 className="h-3 w-3" /> Saved ₹{Number(issue.amount).toLocaleString("en-IN")}</span>
                  ) : (
                     <span>₹{Number(issue.amount).toLocaleString("en-IN")}</span>
                  )}
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-slate-500">No issues detected this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recommended Actions */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Recommended Actions</h2>
        <ul className="list-disc pl-5 space-y-3 text-sm text-slate-700">
          {issues.filter(i => i.riskLevel === "High" && i.status !== "Resolved").length > 0 && (
            <li className="font-medium">Immediately review the high-risk duplicate invoices and unclaimed ITC flagged above to prevent permanent cash loss.</li>
          )}
          {issues.some(i => i.category === "UnnecessarySubscription" && i.status !== "Resolved") && (
            <li className="font-medium">Consolidate redundant SaaS subscriptions. You are paying for multiple tools serving the same purpose.</li>
          )}
          {issues.some(i => i.category === "HiddenFee" && i.status !== "Resolved") && (
            <li className="font-medium">Negotiate with your banking partner to waive off SMS and NEFT processing fees, or switch to a corporate zero-fee account.</li>
          )}
          {issues.length === 0 && (
            <li className="font-medium">Your business is running efficiently with no major financial leaks detected. Keep up the good work!</li>
          )}
        </ul>
      </div>

      <div className="text-center pt-8 border-t border-slate-200 print:hidden">
        <button onClick={() => window.print()} className="bg-indigo-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-800 transition">
          Print / Save PDF Report
        </button>
      </div>
    </div>
  );
}
