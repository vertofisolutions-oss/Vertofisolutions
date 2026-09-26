"use client";

import { useEffect, useState, useMemo } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";
import {
  Activity, ArrowRight, DollarSign, TrendingDown, TrendingUp, AlertTriangle, 
  Settings, Clock, PieChart, Info, Download, Maximize2, X
} from "lucide-react";

export default function MoneyMapPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState("demo-business-org");

  // Scenario Builder State
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioType, setScenarioType] = useState("receivables");
  const [scenarioValue, setScenarioValue] = useState(15);
  const [scenarioResult, setScenarioResult] = useState<any>(null);

  useEffect(() => {
    fetchMoneyMapData();
  }, [orgId]);

  const fetchMoneyMapData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/money-map/data?orgId=${orgId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runScenario = () => {
    if (!data) return;
    let newRunway = data.runwayDays;
    let newBalance = data.currentBalance;
    
    if (scenarioType === "receivables") {
      newBalance += (data.inflows.Revenue * (scenarioValue / 100));
    } else if (scenarioType === "subscriptions") {
      const savings = (data.outflows.OpEx * (scenarioValue / 100));
      newRunway = Math.floor(data.currentBalance / (((data.outflows.COGS + data.outflows.OpEx) - savings) / 30));
    } else if (scenarioType === "financing") {
      newBalance += scenarioValue;
    }
    
    // Simplistic runway recalculation for demo
    if (scenarioType !== "subscriptions") {
      newRunway = Math.floor(newBalance / ((data.outflows.COGS + data.outflows.OpEx) / 30));
    }

    setScenarioResult({
      newRunway,
      newBalance,
      difference: newRunway - data.runwayDays
    });
  };

  if (loading || !data) {
    return (
      <SidebarShell>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="text-center">
            <Activity className="mx-auto h-8 w-8 animate-pulse text-emerald-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">Connecting to Bank Feeds & Generating Map...</p>
          </div>
        </div>
      </SidebarShell>
    );
  }

  const totalInflow = Object.values(data.inflows).reduce((a: any, b: any) => a + b, 0) as number;
  const totalOutflow = Object.values(data.outflows).reduce((a: any, b: any) => a + b, 0) as number;

  return (
    <SidebarShell>
      <LockedFeatureGate feature="moneymap_live">
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        
        {/* TOP BAR */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-900 p-6 shadow-lg text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Bank Balance</p>
            <h1 className="text-3xl font-bold mt-1">₹{data.currentBalance.toLocaleString("en-IN")}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${data.netCashFlow >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {data.netCashFlow >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                Net: ₹{Math.abs(data.netCashFlow).toLocaleString("en-IN")}
              </span>
              <span className="text-slate-400">|</span>
              <span className="font-medium text-slate-200">Runway: <span className="font-bold text-emerald-400">{data.runwayDays} Days</span></span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => { setScenarioOpen(true); setScenarioResult(null); }}
              className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              Run Scenario
            </button>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 transition-colors">
              Export PDF
            </button>
          </div>
        </div>

        {/* MONEY MAP CANVAS (Interactive SVG) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Money Map (Last 30 Days)</h2>
              <p className="text-xs text-slate-500">Interactive cash flow visualisation. Hover over flows for details.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md"><div className="h-2 w-2 rounded-full bg-emerald-500"></div> Live Connection</span>
            </div>
          </div>

          <div className="relative h-[400px] w-full flex items-center justify-between px-4 sm:px-12">
            
            {/* Left Nodes (Inflows) */}
            <div className="flex flex-col gap-8 w-1/4 z-10">
              {Object.entries(data.inflows).map(([key, val]: any) => (
                <div key={key} className="group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-400 transition-all cursor-pointer">
                  <p className="text-xs font-bold text-slate-500 uppercase">{key}</p>
                  <p className="text-lg font-bold text-slate-800">₹{val.toLocaleString("en-IN")}</p>
                  
                  {/* Tooltip */}
                  <div className="absolute left-0 -top-12 hidden group-hover:block w-48 rounded bg-slate-800 p-2 text-xs text-white shadow-xl z-50">
                    {key === "Revenue" ? "Primary sales engine. Suggest chasing 0-30 day receivables." : "Secondary inflow"}
                  </div>
                </div>
              ))}
            </div>

            {/* SVG Sankey Connections */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none z-0">
              {/* Inflow paths */}
              <path d="M 25% 30% C 40% 30%, 40% 50%, 50% 50%" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="40" className="animate-pulse" />
              <path d="M 25% 70% C 40% 70%, 40% 50%, 50% 50%" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="15" />
              
              {/* Outflow paths */}
              <path d="M 50% 50% C 60% 50%, 60% 20%, 75% 20%" fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="30" />
              <path d="M 50% 50% C 60% 50%, 60% 50%, 75% 50%" fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="25" />
              <path d="M 50% 50% C 60% 50%, 60% 80%, 75% 80%" fill="none" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="15" />
              
              {/* Leak Indicator Dot */}
              <circle cx="65%" cy="73%" r="6" fill="#ef4444" className="animate-ping" />
              <circle cx="65%" cy="73%" r="6" fill="#ef4444" />
            </svg>

            {/* Central Treasury Node */}
            <div className="z-10 rounded-full border-4 border-indigo-100 bg-white p-6 shadow-xl text-center w-48 h-48 flex flex-col justify-center items-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Treasury</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">₹{data.currentBalance.toLocaleString("en-IN")}</h3>
              <p className="text-xs text-indigo-600 font-semibold mt-2 bg-indigo-50 px-2 py-1 rounded-full">Net: {data.netCashFlow > 0 ? '+' : ''}₹{(data.netCashFlow/1000).toFixed(1)}k</p>
            </div>

            {/* Right Nodes (Outflows) */}
            <div className="flex flex-col gap-8 w-1/4 z-10">
              {Object.entries(data.outflows).map(([key, val]: any) => (
                <div key={key} className="group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-400 transition-all cursor-pointer">
                  <p className="text-xs font-bold text-slate-500 uppercase">{key}</p>
                  <p className="text-lg font-bold text-slate-800">₹{val.toLocaleString("en-IN")}</p>
                  
                  {/* Tooltip & Actions */}
                  <div className="absolute right-0 -top-16 hidden group-hover:block w-48 rounded bg-slate-800 p-3 text-xs text-white shadow-xl z-50">
                    <p className="mb-2">{key === "Tax" ? "Includes GST & TDS." : key === "OpEx" ? "High spend detected on recurring software." : "Cost of goods."}</p>
                    <button className="w-full bg-slate-600 hover:bg-slate-500 rounded py-1 text-[10px] uppercase font-bold">View Transactions</button>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
          
          {/* Seasonality Ribbon */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Seasonality (Rolling 12 Months)</h3>
            <div className="flex h-8 w-full gap-1">
              {[...Array(12)].map((_, i) => {
                // Mock seasonality heat
                const heat = [30, 40, 25, 60, 80, 100, 40, 50, 70, 90, 85, 45][i];
                return (
                  <div 
                    key={i} 
                    className="flex-1 rounded-sm transition-all hover:opacity-80 cursor-pointer relative group"
                    style={{ backgroundColor: `rgba(16, 185, 129, ${heat / 100})` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded">Vol: {heat}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM PANES */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Profit Zone Treemap */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Profit Zones</h3>
              <Info className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex flex-col gap-2">
              {data.profitZones.map((pz: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-emerald-50 cursor-pointer transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{pz.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Margin: {pz.margin}% | Velocity: {pz.velocity}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">₹{(pz.contribution/1000).toFixed(0)}k</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Cash Drains */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-slate-800 mb-4">Top Cash Drains</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                    <th className="pb-3 pr-4">Vendor / Subscription</th>
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4">Amount / mo</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topDrains.map((drain: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 pr-4 font-medium text-slate-800">{drain.name}</td>
                      <td className="py-3 pr-4 text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{drain.category}</span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-800 flex items-center gap-1">
                        ₹{drain.amount.toLocaleString("en-IN")}
                        {drain.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                      </td>
                      <td className="py-3">
                        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">{drain.action}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        </main>
      </LockedFeatureGate>

      {/* SCENARIO BUILDER MODAL */}
      {scenarioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">What-If Scenario Builder</h3>
              <button onClick={() => setScenarioOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Scenario Type</label>
                <select 
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="receivables">Accelerate Receivables (%)</option>
                  <option value="subscriptions">Reduce Subscriptions/OpEx (%)</option>
                  <option value="financing">Add Financing (₹)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  {scenarioType === "financing" ? "Amount (₹)" : "Percentage (%)"}
                </label>
                <input 
                  type="number" 
                  value={scenarioValue}
                  onChange={(e) => setScenarioValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <button 
                onClick={runScenario}
                className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                Calculate Impact
              </button>

              {scenarioResult && (
                <div className="mt-6 rounded-xl bg-slate-50 border border-slate-100 p-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Projected Impact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">New Cash Runway</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{scenarioResult.newRunway} Days</p>
                      <p className="text-xs text-emerald-600 font-medium">+{scenarioResult.difference} days improvement</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">New Bank Balance</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">₹{(scenarioResult.newBalance/1000).toFixed(0)}k</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </SidebarShell>
  );
}
