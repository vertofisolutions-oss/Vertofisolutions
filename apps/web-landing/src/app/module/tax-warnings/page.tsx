"use client";

import { useEffect, useState, useMemo } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import {
  AlertTriangle, ShieldCheck, Activity, Search, AlertCircle, ArrowRight, DollarSign,
  TrendingDown, RefreshCw, UploadCloud, PieChart, LineChart as LineChartIcon
} from "lucide-react";

export default function PredictiveTaxWarningsPage() {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("risk-feed");
  const [orgId, setOrgId] = useState("demo-business-org");

  // Simulation State
  const [simType, setSimType] = useState("INVOICE");
  const [simAmount, setSimAmount] = useState(200000);
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchWarnings();
  }, [orgId]);

  const fetchWarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/accounting/${orgId}/tax_warnings`);
      if (res.ok) {
        const data = await res.json();
        setWarnings(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await fetch("/api/v1/tax-warnings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        await fetchWarnings();
      }
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const runSimulation = async () => {
    try {
      setSimulating(true);
      const res = await fetch("/api/v1/tax-warnings/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: simType, amount: simAmount, orgId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data.result);
      }
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulating(false);
    }
  };

  const activeWarnings = useMemo(() => warnings.filter(w => w.status !== "RESOLVED"), [warnings]);
  
  const criticalCount = activeWarnings.filter(w => w.priority === "Critical").length;
  const highCount = activeWarnings.filter(w => w.priority === "High").length;
  const penaltyRiskScore = criticalCount * 25 + highCount * 15; // Basic heuristic
  const cappedPenaltyRisk = Math.min(100, Math.max(0, penaltyRiskScore));

  const totalImpact = activeWarnings.reduce((acc, w) => acc + (w.impact || 0), 0);

  return (
    <SidebarShell>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Predictive Tax Warnings</h1>
            <p className="text-sm text-slate-500">
              AI-powered tax intelligence. Prevent penalties, optimize cash flow, and forecast liabilities.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-70"
          >
            {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            {analyzing ? "Analyzing..." : "Run AI Audit"}
          </button>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Penalty Risk Score</p>
              <AlertTriangle className={`h-4 w-4 ${cappedPenaltyRisk > 50 ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">{cappedPenaltyRisk}/100</p>
            <p className="mt-1 text-xs text-slate-500">Based on {activeWarnings.length} active alerts</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Critical Alerts</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">{criticalCount}</p>
            <p className="mt-1 text-xs text-slate-500">Require immediate action</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">High Priority Alerts</p>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">{highCount}</p>
            <p className="mt-1 text-xs text-slate-500">Tax liability &gt; 20% impact</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tax Impact</p>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
              ₹{totalImpact.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-slate-500">Estimated preventable loss</p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex space-x-1 rounded-xl bg-slate-100 p-1">
          {["risk-feed", "simulators", "data-ingestion"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              {tab === "risk-feed" ? "Risk Feed" : tab === "simulators" ? "What-If Simulators" : "Data Ingestion"}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        {activeTab === "risk-feed" && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading alerts...</div>
            ) : activeWarnings.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No active tax risks</h3>
                <p className="mt-2 text-sm text-slate-500">Your financial trajectory is currently stable.</p>
              </div>
            ) : (
              activeWarnings.map(warning => (
                <div key={warning.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          warning.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                          warning.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {warning.priority}
                        </span>
                        <span className="text-xs text-slate-400">Confidence: {warning.confidence}%</span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-slate-800">{warning.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{warning.message}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Impact</p>
                      <p className="text-lg font-bold text-slate-800">₹{(warning.impact || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Why did this alert appear?</p>
                    <ul className="list-inside list-disc text-xs text-slate-600 space-y-1">
                      {warning.explainability?.map((reason: string, i: number) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">Recommended Action:</span>
                      <span className="text-xs text-slate-600">{warning.recommendedAction}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Snooze</button>
                      <button className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Take Action</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "simulators" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800">What-If Scenario Builder</h3>
              <p className="text-xs text-slate-500">Test business decisions to predict their tax and cashflow impact before executing them.</p>
              
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Action Type</label>
                <select 
                  value={simType} 
                  onChange={(e) => setSimType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="INVOICE">Invoice Timing</option>
                  <option value="PAYROLL">Hire Employees</option>
                  <option value="PURCHASE">Large Purchase</option>
                  <option value="LOAN">Take a Loan</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Estimated Amount (₹)</label>
                <input 
                  type="number" 
                  value={simAmount} 
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <button
                onClick={runSimulation}
                disabled={simulating}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
              >
                {simulating ? "Simulating..." : "Run Simulation"}
              </button>
            </div>

            <div className="col-span-1 lg:col-span-2">
              {simResult ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">Simulation Results</h3>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      Confidence: {simResult.confidence}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase">Scenario A</p>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{simResult.scenarioA.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        ₹{(simResult.scenarioA.projectedTax || simResult.scenarioA.tdsAndPf || 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Projected {simResult.impactType}</p>
                    </div>
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 relative overflow-hidden">
                      <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500"></div>
                      <p className="text-xs font-bold text-indigo-500 uppercase">Scenario B</p>
                      <p className="text-sm font-semibold text-indigo-900 mt-1">{simResult.scenarioB.label}</p>
                      <p className="text-2xl font-bold text-indigo-900 mt-2">
                        ₹{(simResult.scenarioB.projectedTax || simResult.scenarioB.tdsAndPf || 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-indigo-700/70 mt-1">Projected {simResult.impactType}</p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">Difference in {simResult.impactType}</p>
                        <p className="text-xl font-bold text-slate-900">
                          ₹{Math.abs(simResult.delta).toLocaleString("en-IN")} 
                          <span className="text-sm font-medium text-slate-500 ml-2">({simResult.percentageChange.toFixed(1)}%)</span>
                        </p>
                      </div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700">
                        <span className="font-semibold block mb-1">Recommendation:</span>
                        {simResult.recommendation}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50 p-12 text-center h-full flex flex-col items-center justify-center">
                  <LineChartIcon className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-500 text-sm">Select an action and run a simulation to see the projected tax and cashflow impact.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "data-ingestion" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Data Upload & Connectors</h3>
            <p className="text-sm text-slate-500 mb-8">The Predictive Tax Warning system requires high-quality data to improve its forecasting models. Connect your accounting and bank platforms or upload CSV files.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Accounting', 'Bank Feeds', 'Payroll', 'GST Portal'].map((src) => (
                <div key={src} className="border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <UploadCloud className="h-5 w-5 text-slate-600" />
                  </div>
                  <p className="font-semibold text-sm text-slate-800">{src}</p>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Waiting for setup</span>
                  <button className="text-xs text-indigo-600 font-semibold mt-2 hover:underline">Connect</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEGAL DISCLAIMER */}
        <div className="mt-12 text-center border-t border-slate-200 pt-6">
          <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
            Disclaimer: This is predictive guidance — consult your tax advisor for legally binding advice.
          </p>
        </div>

      </main>
    </SidebarShell>
  );
}
