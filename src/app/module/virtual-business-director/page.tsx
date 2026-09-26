"use client";

import { useEffect, useState } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { 
  BrainCircuit, ShieldAlert, LineChart, MessageSquare, 
  CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight,
  UserCheck, ShieldCheck, TrendingUp, Calculator
} from "lucide-react";

type VbdDecision = any;

export default function VBDPage() {
  const [orgId] = useState("demo-business-org");
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<VbdDecision[]>([]);
  
  // Roles: "client" | "cpa"
  const [role, setRole] = useState<"client" | "cpa">("client");
  
  // Views
  const [view, setView] = useState<"dashboard" | "wizard" | "analyzing" | "result">("dashboard");
  const [activeDecision, setActiveDecision] = useState<VbdDecision | null>(null);

  // Wizard state
  const [category, setCategory] = useState<string>("Hiring");
  const [question, setQuestion] = useState("");
  const [details, setDetails] = useState<any>({});
  const [missingDataMsg, setMissingDataMsg] = useState("");

  useEffect(() => {
    if (view === "dashboard" || role === "cpa") {
      fetchDecisions();
    }
  }, [view, role]);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/vbd_decisions/${orgId}`);
      if (res.ok) {
        const json = await res.json();
        setDecisions(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startWizard = (cat: string) => {
    setCategory(cat);
    setDetails({});
    setMissingDataMsg("");
    setView("wizard");
  };

  const runAnalysis = async () => {
    setView("analyzing");
    try {
      const res = await fetch("/api/v1/vbd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details })
      });
      
      const json = await res.json();
      
      if (!json.success && json.missingData) {
        setMissingDataMsg(`More information required: ${json.requiredFields.join(", ")}`);
        setView("wizard");
        return;
      }

      const newDecision = {
        id: `VBD-${Math.floor(1000 + Math.random() * 9000)}`,
        category,
        question,
        inputs: details,
        analysis: json.analysis,
        createdAt: new Date().toISOString(),
      };

      const saveRes = await fetch(`/api/v1/vbd_decisions/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDecision)
      });
      const saveJson = await saveRes.json();
      
      setActiveDecision({ ...newDecision, dbId: saveJson.id });
      setView("result");
    } catch (err) {
      console.error(err);
      setView("wizard");
    }
  };

  const cpaApprove = async (id: string, dbId: string) => {
    try {
      const updated = { ...activeDecision, analysis: { ...activeDecision.analysis, cpaStatus: "CPA Approved" } };
      await fetch(`/api/v1/vbd_decisions/${orgId}/${dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      setActiveDecision(updated);
      fetchDecisions();
    } catch (err) {
      console.error(err);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left: Input & Categories */}
        <div className="flex-1 space-y-6">
          <div className="rounded-2xl bg-indigo-900 p-8 shadow-2xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <BrainCircuit className="h-8 w-8 text-indigo-400" /> Virtual Business Director
              </h1>
              <p className="text-indigo-200 text-sm mb-6">Not just a CFO — your business decision assistant. AI + Human CPA hybrid.</p>
              
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">What business decision are you considering?</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="e.g. Should I hire another developer?" 
                    className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-white placeholder-indigo-300 border border-indigo-400/30 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button onClick={() => startWizard("Hiring")} className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                    Ask VBD
                  </button>
                </div>
              </div>
            </div>
            {/* BG flair */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {["Hiring", "Capex", "Supplier", "Business Structure", "Pricing", "Loan", "Expansion"].map(cat => (
              <button 
                key={cat} onClick={() => startWizard(cat)}
                className="flex flex-col items-start p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all text-left"
              >
                <span className="font-bold text-slate-800 text-sm">{cat}</span>
                <span className="text-[10px] text-slate-500 mt-1 uppercase">Decision Engine</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Decision History Log */}
        <div className="w-full md:w-96 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Decision Logs</h3>
            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{decisions.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
            {loading ? <p className="text-xs text-slate-500 text-center py-4">Loading logs...</p> : 
             decisions.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No decisions analyzed yet.</p> :
             decisions.map((d, i) => (
               <div key={i} onClick={() => { setActiveDecision(d); setView("result"); }} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer">
                 <div className="flex items-center justify-between mb-1">
                   <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{d.category}</span>
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.analysis?.decision === 'YES' ? 'bg-emerald-100 text-emerald-700' : d.analysis?.decision === 'NO' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{d.analysis?.decision}</span>
                 </div>
                 <p className="text-xs font-medium text-slate-800 line-clamp-2">{d.question || `Decision regarding ${d.category}`}</p>
                 <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                   {d.analysis?.cpaStatus === 'CPA Approved' ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : <Clock className="h-3 w-3 text-amber-500" />}
                   {d.analysis?.cpaStatus}
                 </p>
               </div>
             ))
            }
          </div>
        </div>

      </div>
    </div>
  );

  const renderWizard = () => (
    <div className="mx-auto max-w-2xl mt-8 animate-in fade-in">
      <button onClick={() => setView("dashboard")} className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowRight className="h-4 w-4 rotate-180" /> Back to Dashboard
      </button>
      
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-800">{category} Decision Engine</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">Provide the financial parameters to run the AI Simulation.</p>

        {missingDataMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="text-sm font-bold text-rose-800">{missingDataMsg}</p>
          </div>
        )}

        {category === "Hiring" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Proposed Monthly Salary (₹)</label>
              <input type="number" onChange={e => setDetails({...details, salary: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Expected Monthly Revenue Contribution (₹)</label>
              <input type="number" onChange={e => setDetails({...details, revenueContribution: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Training/Onboarding Cost (₹)</label>
              <input type="number" onChange={e => setDetails({...details, trainingCost: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
          </div>
        )}

        {category === "Capex" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Purchase Price (₹)</label>
              <input type="number" onChange={e => setDetails({...details, purchasePrice: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Target Payback Period (Months)</label>
              <input type="number" onChange={e => setDetails({...details, paybackMonths: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
          </div>
        )}

        {category === "Loan" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Loan Amount (₹)</label>
              <input type="number" onChange={e => setDetails({...details, amount: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Interest Rate (%)</label>
              <input type="number" onChange={e => setDetails({...details, interestRate: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
          </div>
        )}

        {/* Fallback for others */}
        {!["Hiring", "Capex", "Loan"].includes(category) && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Estimated Cost Impact</label>
              <input type="number" onChange={e => setDetails({...details, cost: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Estimated Revenue Impact</label>
              <input type="number" onChange={e => setDetails({...details, revenue: e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </div>
          </div>
        )}

        <div className="mt-8">
          <button onClick={runAnalysis} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200">
            Run AI Simulation
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in">
      <div className="relative h-24 w-24 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        <BrainCircuit className="absolute inset-0 m-auto h-10 w-10 text-indigo-600 animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800">Simulating Business Impact...</h2>
      <p className="text-slate-500 mt-2 text-sm max-w-sm text-center">Calculating 24-month cashflow stress, tax implications, and generating risk score.</p>
    </div>
  );

  const renderResult = () => {
    if (!activeDecision?.analysis) return null;
    const a = activeDecision.analysis;
    const isYes = a.decision === "YES";
    const isNo = a.decision === "NO" || a.decision === "AVOID";

    return (
      <div className="space-y-6 animate-in fade-in pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <ArrowRight className="h-4 w-4 rotate-180" /> Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">CPA Review Status:</span>
            <span className={`text-[10px] font-bold flex items-center gap-1 ${a.cpaStatus === 'CPA Approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {a.cpaStatus === 'CPA Approved' ? <ShieldCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {a.cpaStatus}
            </span>
          </div>
        </div>

        {/* Hero Result */}
        <div className={`rounded-2xl p-8 text-white shadow-xl ${isYes ? 'bg-emerald-600' : isNo ? 'bg-rose-600' : 'bg-amber-500'}`}>
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex-1">
              <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-2">VBD Decision Engine Result</p>
              <h1 className="text-6xl font-black mb-4">{a.decision}</h1>
              <div className="bg-black/10 rounded-xl p-5 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase opacity-80 mb-1">Why?</p>
                <p className="text-lg font-medium leading-snug">{a.explanation}</p>
              </div>
            </div>
            
            {/* Risk Gauge */}
            <div className="w-full md:w-64 bg-white/10 rounded-xl p-6 backdrop-blur-sm text-center border border-white/20">
              <p className="text-xs font-bold uppercase opacity-80 mb-4">Risk Score</p>
              <div className="relative h-32 w-32 mx-auto">
                {/* SVG Gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${a.riskScore}, 100`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black">{a.riskScore}</span>
                  <span className="text-[10px] uppercase font-bold opacity-80">/ 100</span>
                </div>
              </div>
              <p className="text-xs font-medium mt-4">{a.riskScore > 70 ? 'High Risk' : a.riskScore > 40 ? 'Moderate Risk' : 'Low Risk'}</p>
            </div>
          </div>
        </div>

        {/* Impact Grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><LineChart className="h-5 w-5 text-indigo-500" /> Financial Impact</h3>
            <div className="space-y-4">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Initial Cost</p><p className="font-bold text-slate-800">{a.financialImpact?.initialCost || '-'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Recurring Cost</p><p className="font-bold text-slate-800">{a.financialImpact?.recurringCost || '-'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Profit Impact</p><p className="font-bold text-emerald-600">{a.financialImpact?.profitImpact || '-'}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-indigo-500" /> Tax & Compliance</h3>
            <div className="space-y-4">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Tax Effect</p><p className="text-sm text-slate-700">{a.taxEffect}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Compliance Impact</p><p className="text-sm text-slate-700">{a.complianceImpact}</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm flex flex-col">
            <h3 className="font-bold text-indigo-900 mb-2">Recommendation</h3>
            <p className="text-sm text-indigo-800 flex-1">{a.recommendation}</p>
            {role === "cpa" && a.cpaStatus !== "CPA Approved" && (
              <button onClick={() => cpaApprove(activeDecision.id, activeDecision.dbId)} className="mt-4 w-full bg-indigo-600 text-white font-bold py-2 rounded shadow hover:bg-indigo-700">
                CPA: Approve Decision
              </button>
            )}
          </div>
        </div>

        {/* Simulation Charts */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">12-Month Financial Simulation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Cashflow Chart */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-4 text-center">Cashflow Trajectory</p>
              <div className="h-48 w-full flex items-end justify-between gap-1 border-b border-slate-200 pb-2 relative">
                {a.cashflowImpact?.map((c: any, i: number) => {
                  const max = Math.max(...a.cashflowImpact.map((x:any) => x.value), 1);
                  const h = Math.max((c.value / max) * 100, 5);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded z-10 whitespace-nowrap">
                        {c.month}: ₹{c.value.toLocaleString()}
                      </div>
                      <div className={`w-full rounded-t-sm transition-all ${c.value < 0 ? 'bg-rose-500' : 'bg-emerald-400 group-hover:bg-emerald-500'}`} style={{ height: `${h}%` }}></div>
                      <span className="text-[8px] text-slate-400 mt-1">{c.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Profit Simulation Chart */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-4 text-center">Profit Simulation (Current vs Proposed)</p>
              <div className="h-48 w-full flex items-end justify-between gap-2 border-b border-slate-200 pb-2 relative">
                {a.profitSimulation?.map((p: any, i: number) => {
                  const max = Math.max(...a.profitSimulation.map((x:any) => Math.max(x.current, x.proposed)), 1);
                  const hCur = Math.max((p.current / max) * 100, 5);
                  const hProp = Math.max((p.proposed / max) * 100, 5);
                  return (
                    <div key={i} className="flex-1 flex items-end gap-[1px] group relative">
                       {/* Tooltip */}
                       <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded z-10 whitespace-nowrap">
                        Current: ₹{p.current.toLocaleString()}<br/>Proposed: ₹{p.proposed.toLocaleString()}
                      </div>
                      <div className="w-1/2 bg-slate-300 rounded-t-sm" style={{ height: `${hCur}%` }}></div>
                      <div className="w-1/2 bg-indigo-500 rounded-t-sm" style={{ height: `${hProp}%` }}></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-300"></div><span className="text-[9px] text-slate-500">Current</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-500"></div><span className="text-[9px] text-slate-500">Proposed</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <SidebarShell>
      <main className="mx-auto max-w-6xl px-4 py-8">
        
        {/* Role Toggle Header */}
        <div className="flex justify-end mb-4">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
            <button onClick={() => { setRole("client"); setView("dashboard"); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${role === 'client' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Business Owner View</button>
            <button onClick={() => { setRole("cpa"); setView("dashboard"); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${role === 'cpa' ? 'bg-indigo-600 shadow text-white' : 'text-slate-500 hover:text-slate-800'}`}>CPA Review Dashboard</button>
          </div>
        </div>

        {/* CPA Review Dashboard */}
        {role === "cpa" && view === "dashboard" ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="rounded-2xl bg-indigo-900 p-6 text-white shadow-lg flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="h-6 w-6" /> CPA Human Oversight Dashboard</h1>
                <p className="text-indigo-200 text-sm mt-1">Review, validate, and approve AI decisions before they reach the client.</p>
              </div>
              <div className="bg-indigo-800 px-4 py-2 rounded-lg text-center">
                <p className="text-3xl font-black text-emerald-400">{decisions.filter(d => d.analysis?.cpaStatus !== 'CPA Approved').length}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Pending</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="p-4">Case ID</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">AI Decision</th>
                    <th className="p-4">Risk</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {decisions.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No decisions in queue.</td></tr>
                  ) : decisions.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">{d.id}</td>
                      <td className="p-4 text-slate-600">{d.category}</td>
                      <td className="p-4 font-bold">{d.analysis?.decision}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${d.analysis?.riskScore > 70 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{d.analysis?.riskScore}/100</span></td>
                      <td className="p-4"><span className="text-xs font-semibold text-slate-500">{d.analysis?.cpaStatus}</span></td>
                      <td className="p-4 text-right">
                        <button onClick={() => { setActiveDecision(d); setView("result"); }} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded">Review Case</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            {view === "dashboard" && renderDashboard()}
            {view === "wizard" && renderWizard()}
            {view === "analyzing" && renderAnalyzing()}
            {view === "result" && renderResult()}
          </>
        )}
      </main>
    </SidebarShell>
  );
}
