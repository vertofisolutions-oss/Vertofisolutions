"use client";

import { useEffect, useState } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import {
  LifeBuoy, AlertTriangle, CheckCircle2, Clock, UploadCloud, ArrowRight,
  ShieldAlert, ShieldCheck, X, FileText, MessageSquare, Plus, Activity
} from "lucide-react";

type LifeguardCase = any;

export default function BusinessLifeguardPage() {
  const [cases, setCases] = useState<LifeguardCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("demo-business-org");

  // Router states
  const [view, setView] = useState<"dashboard" | "wizard" | "triage_result" | "case_detail">("dashboard");
  const [activeCase, setActiveCase] = useState<LifeguardCase | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [sosCategory, setSosCategory] = useState("");
  const [sosDetails, setSosDetails] = useState<any>({});
  const [sosFiles, setSosFiles] = useState<File[]>([]);
  const [triaging, setTriaging] = useState(false);
  const [triageData, setTriageData] = useState<any>(null);

  useEffect(() => {
    if (view === "dashboard") {
      fetchCases();
    }
  }, [view, orgId]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/lifeguard/${orgId}`);
      if (res.ok) {
        const json = await res.json();
        setCases(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startSos = () => {
    setWizardStep(1);
    setSosCategory("");
    setSosDetails({});
    setSosFiles([]);
    setView("wizard");
  };

  const submitSos = async () => {
    setWizardStep(4); // Loading Screen
    setTriaging(true);
    try {
      // 1. Call AI Triage
      const triageRes = await fetch("/api/v1/lifeguard/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: sosCategory, details: sosDetails })
      });
      const triageJson = await triageRes.json();
      const triage = triageJson.triage;
      setTriageData(triage);

      // 2. Create the case in the DB
      const newCase = {
        id: `VL-${Math.floor(10000 + Math.random() * 90000)}`,
        category: sosCategory,
        details: sosDetails,
        triage,
        status: "Assigned",
        createdAt: new Date().toISOString(),
        timeline: [
          { event: "Emergency Activated", time: new Date().toISOString() },
          { event: "AI Triage Completed", time: triage.triageCompletedAt },
          { event: `${triage.priority} Assigned`, time: triage.triageCompletedAt },
          { event: `${triage.assignedExpert} Assigned`, time: triage.triageCompletedAt }
        ]
      };

      const saveRes = await fetch(`/api/v1/lifeguard/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCase)
      });
      const saveJson = await saveRes.json();
      setActiveCase({ ...newCase, dbId: saveJson.id });

      setTriaging(false);
      setView("triage_result");
    } catch (err) {
      console.error(err);
      setTriaging(false);
    }
  };

  const openCase = (c: LifeguardCase) => {
    setActiveCase(c);
    setView("case_detail");
  };

  const renderWizardQuestions = () => {
    switch (sosCategory) {
      case "GST":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Notice Type</label>
              <select onChange={e => setSosDetails({...sosDetails, noticeType: e.target.value})} className="mt-1 w-full rounded border p-2">
                <option value="">Select...</option>
                <option value="Demand/Show Cause">Demand / Show Cause Notice</option>
                <option value="Mismatch">Input Tax Credit Mismatch</option>
                <option value="Registration">Registration Cancellation</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Tax Amount in Dispute (₹)</label>
              <input type="number" onChange={e => setSosDetails({...sosDetails, amount: e.target.value})} className="mt-1 w-full rounded border p-2" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Due Date</label>
              <input type="date" onChange={e => setSosDetails({...sosDetails, dueDate: e.target.value})} className="mt-1 w-full rounded border p-2" />
            </div>
          </div>
        );
      case "Income Tax":
      case "TDS":
      case "Cashflow":
      case "Fraud":
      case "Vendor/Client Dispute":
      case "Payroll":
      case "Other":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Briefly describe the emergency</label>
              <textarea rows={3} onChange={e => setSosDetails({...sosDetails, description: e.target.value})} className="mt-1 w-full rounded border p-2"></textarea>
            </div>
            {sosCategory !== 'Other' && (
              <div>
                <label className="text-sm font-semibold text-slate-700">Estimated Financial Impact (₹)</label>
                <input type="number" onChange={e => setSosDetails({...sosDetails, amount: e.target.value})} className="mt-1 w-full rounded border p-2" />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarShell>
      <main className="mx-auto max-w-6xl px-4 py-8">
        
        {/* ===================== DASHBOARD VIEW ===================== */}
        {view === "dashboard" && (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-900 p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <LifeBuoy className="h-8 w-8 text-rose-500" />
                  <h1 className="text-3xl font-bold tracking-tight">Business Lifeguard</h1>
                </div>
                <p className="mt-2 text-slate-400">Fast Business Rescue. 24/7 Emergency Support Desk.</p>
              </div>
              <button onClick={startSos} className="relative z-10 flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 font-bold text-white hover:bg-rose-500 shadow-xl shadow-rose-900/50 transition-all active:scale-95">
                <AlertTriangle className="h-5 w-5" />
                ACTIVATE SOS
              </button>
              {/* Background styling */}
              <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Emergencies</p>
                <p className="mt-2 text-3xl font-bold text-slate-800">{cases.filter(c => c.status !== "Resolved").length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Priority 1 Cases</p>
                <p className="mt-2 text-3xl font-bold text-rose-600">{cases.filter(c => c.triage?.priority === "Priority 1" && c.status !== "Resolved").length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Human Response</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">4.2 min</p>
                <p className="text-[10px] font-semibold text-emerald-600 mt-1">SLA Target: 5 mins</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Action Plan</p>
                <p className="mt-2 text-3xl font-bold text-indigo-600">22 min</p>
                <p className="text-[10px] font-semibold text-indigo-600 mt-1">SLA Target: 30 mins</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                <h3 className="font-bold text-slate-800">Your Case History</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-500">Loading cases...</div>
                ) : cases.length === 0 ? (
                  <div className="p-12 text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                    <h3 className="text-lg font-bold text-slate-800">No active emergencies</h3>
                    <p className="text-sm text-slate-500">Your business is running smoothly.</p>
                  </div>
                ) : (
                  cases.map((c, i) => (
                    <div key={i} onClick={() => openCase(c)} className="flex items-center justify-between p-6 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${c.triage?.priority === 'Priority 1' ? 'bg-rose-100 text-rose-600' : c.triage?.priority === 'Priority 2' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{c.id}</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">• {c.category}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{c.triage?.assignedExpert || 'Analyst'} Assigned</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'Awaiting Your Document' ? 'bg-amber-100 text-amber-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {c.status}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== SOS WIZARD ===================== */}
        {view === "wizard" && (
          <div className="mx-auto max-w-2xl mt-8">
            <button onClick={() => setView("dashboard")} className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
              <X className="h-4 w-4" /> Cancel SOS
            </button>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
              
              {wizardStep === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">What is the emergency?</h2>
                  <p className="text-sm text-slate-500 mb-6">Select the category that best matches your situation so we can assign the correct expert immediately.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["GST", "Income Tax", "TDS", "Cashflow", "Fraud", "Vendor/Client Dispute", "Payroll", "Other"].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => { setSosCategory(cat); setWizardStep(2); }}
                        className="flex flex-col items-start p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md transition-all text-left"
                      >
                        <span className="font-bold text-slate-800">{cat}</span>
                        <span className="text-xs text-slate-500 mt-1">Tap to select</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{sosCategory} Emergency Details</h2>
                  <p className="text-sm text-slate-500 mb-6">Help the AI Triage engine assess the priority by providing basic details.</p>
                  
                  {renderWizardQuestions()}

                  <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setWizardStep(1)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Back</button>
                    <button onClick={() => setWizardStep(3)} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700">Continue</button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Document Vault Upload</h2>
                  <p className="text-sm text-slate-500 mb-6">Upload any relevant notices, invoices, or evidence. Our AI will extract key data.</p>
                  
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                    <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="font-semibold text-slate-700">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                    <button onClick={() => setWizardStep(2)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Back</button>
                    <button onClick={submitSos} className="px-6 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 shadow-lg shadow-rose-200">Submit to Triage</button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="py-12 text-center animate-in fade-in">
                  <div className="relative mx-auto h-24 w-24">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                    <ShieldAlert className="absolute inset-0 m-auto h-10 w-10 text-indigo-600 animate-pulse" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-slate-800">AI Auto-Triage Engine Running</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">Analyzing threat level, assessing penalties, and routing to the correct expert...</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ===================== TRIAGE RESULT ===================== */}
        {view === "triage_result" && triageData && (
          <div className="mx-auto max-w-3xl mt-8 animate-in zoom-in-95">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl">
              <div className={`p-8 text-white ${triageData.priority === 'Priority 1' ? 'bg-rose-600' : triageData.priority === 'Priority 2' ? 'bg-orange-500' : 'bg-indigo-600'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-6 w-6 opacity-80" />
                  <span className="text-sm font-bold uppercase tracking-wider opacity-90">Triage Complete</span>
                </div>
                <h2 className="text-4xl font-black mb-2">{triageData.priority} Assessed</h2>
                <p className="text-lg opacity-90">{sosCategory} Emergency • Case {activeCase?.id}</p>
              </div>

              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Assessed Threat Level</p>
                  <p className="font-bold text-slate-800 text-lg">{triageData.threatLevel}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Deadline Severity</p>
                  <p className="font-bold text-slate-800 text-lg">{triageData.deadlineSeverity}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Possible Penalty</p>
                  <p className="font-bold text-slate-800 text-lg">{triageData.penalty}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Legal Involvement</p>
                  <p className="font-bold text-slate-800 text-lg">{triageData.legalInvolvement}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Assigned Expert</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                      {triageData.assignedExpert.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{triageData.assignedExpert}</p>
                      <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Response target: 5 mins</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setView("case_detail")} className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transition-colors">
                  Enter Emergency Workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== CASE DETAIL WORKSPACE ===================== */}
        {view === "case_detail" && activeCase && (
          <div className="space-y-6">
            <button onClick={() => setView("dashboard")} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
              <ArrowRight className="h-4 w-4 rotate-180" /> Back to Dashboard
            </button>
            
            {/* Header & Status Tracker */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{activeCase.id}: {activeCase.category} Emergency</h2>
                  <p className="text-sm text-slate-500 mt-1">Managed by {activeCase.triage?.assignedExpert || 'Specialist'}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${activeCase.triage?.priority === 'Priority 1' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {activeCase.triage?.priority || 'Priority 3'}
                </div>
              </div>

              {/* Delivery-style Tracker */}
              <div className="relative">
                <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-slate-100 z-0"></div>
                <div className="absolute left-0 top-1/2 h-0.5 w-1/3 -translate-y-1/2 bg-emerald-500 z-0"></div>
                <div className="relative z-10 flex justify-between">
                  {["Assigned", "Working", "Awaiting Document", "Resolved"].map((step, idx) => {
                    const isCompleted = idx < 2; // Mock state
                    const isCurrent = idx === 1;
                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isCurrent ? 'bg-white border-emerald-500 text-emerald-500' : 'bg-white border-slate-200 text-slate-300'}`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-2 w-2 rounded-full bg-current"></div>}
                        </div>
                        <p className={`mt-2 text-xs font-bold uppercase tracking-wider ${isCompleted || isCurrent ? 'text-slate-800' : 'text-slate-400'}`}>{step}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Dynamic Toolkit & Action Plan */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Dynamic Toolkit */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                    <ShieldAlert className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800">{activeCase.category} Rapid Action Toolkit</h3>
                  </div>
                  
                  {activeCase.category === "GST" ? (
                    <div className="space-y-4">
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                        <p className="text-xs font-bold text-indigo-500 uppercase mb-2">Notice Analysis (AI Extracted)</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-slate-500 block">Due Date</span><span className="font-bold text-slate-800">{activeCase.details?.dueDate || 'Extracting...'}</span></div>
                          <div><span className="text-slate-500 block">Tax Amount</span><span className="font-bold text-slate-800">₹{activeCase.details?.amount || 'Extracting...'}</span></div>
                        </div>
                        <p className="text-xs text-indigo-600 mt-3 italic">Data extracted for client confirmation. Do not blindly trust OCR.</p>
                      </div>
                      <button className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" /> Prepare Reconciliation Report
                      </button>
                    </div>
                  ) : activeCase.category === "Cashflow" ? (
                    <div className="space-y-4">
                       <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg">
                        <p className="text-xs font-bold text-rose-500 uppercase mb-2">Cashflow Rescue Plan</p>
                        <p className="text-sm font-semibold text-slate-800 mb-1">Immediate Actions:</p>
                        <ul className="list-disc list-inside text-sm text-slate-600 mb-3">
                          <li>Delay vendor payment to Logistics Co.</li>
                          <li>Chase 0-30 day receivables (₹2.4L outstanding).</li>
                        </ul>
                        <p className="text-sm font-semibold text-slate-800 mb-1">Short-Term:</p>
                        <ul className="list-disc list-inside text-sm text-slate-600">
                          <li>Pause non-essential SaaS subscriptions.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      <Activity className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                      Specialized {activeCase.category} tools are booting up...
                    </div>
                  )}
                </div>

                {/* Action Plan */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                   <h3 className="font-bold text-emerald-900 mb-4">Action Plan</h3>
                   <div className="space-y-3">
                     <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-emerald-100">
                       <div>
                         <p className="font-bold text-slate-800">Draft Response Letter</p>
                         <p className="text-xs text-slate-500">Requires your approval before submission.</p>
                       </div>
                       <button className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700">Approve Action</button>
                     </div>
                   </div>
                </div>

              </div>

              {/* Right Column: Vault & Timeline */}
              <div className="space-y-6">
                
                {/* Secure Document Vault */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                    Secure Vault <button className="text-indigo-600 hover:text-indigo-800"><Plus className="h-4 w-4" /></button>
                  </h3>
                  
                  {activeCase.triage?.requiredDocs?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-rose-500 uppercase mb-2">Documents Required</p>
                      <div className="space-y-2">
                        {activeCase.triage.requiredDocs.map((doc: string, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm p-2 bg-rose-50 rounded border border-rose-100">
                            <span className="text-rose-900">{doc}</span>
                            <span className="text-[10px] font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200">Missing</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Uploaded</p>
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                      <p className="text-xs text-slate-500">No documents uploaded yet.</p>
                    </div>
                  </div>
                </div>

                {/* Timeline / Audit Trail */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-[400px] flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-4">Emergency Timeline</h3>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {activeCase.timeline?.map((t: any, i: number) => (
                      <div key={i} className="relative pl-6 border-l-2 border-slate-200 last:border-transparent">
                        <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-slate-300"></div>
                        <p className="text-xs text-slate-500 mb-0.5">{new Date(t.time).toLocaleTimeString()}</p>
                        <p className="text-sm font-semibold text-slate-800">{t.event}</p>
                      </div>
                    ))}
                    {/* Fake Live Event */}
                    <div className="relative pl-6 border-l-2 border-transparent">
                        <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-indigo-500 animate-pulse"></div>
                        <p className="text-xs text-indigo-500 font-semibold mb-0.5 animate-pulse">Right now</p>
                        <p className="text-sm font-semibold text-slate-800">{activeCase.triage?.assignedExpert || 'Expert'} is reviewing details...</p>
                      </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>
    </SidebarShell>
  );
}
