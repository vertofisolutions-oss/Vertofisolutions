"use client";

import { useEffect, useState } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, FileText, CheckCircle, 
  ArrowRight, UploadCloud, Clock, History, FileWarning, 
  Activity, Calendar, Briefcase, FileSearch
} from "lucide-react";

export default function WarrantyPlusPage() {
  const [view, setView] = useState<"overview" | "claims" | "conditions">("overview");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [activeClaim, setActiveClaim] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stRes, clRes] = await Promise.all([
        fetch(`/api/v1/warranty-plus/status`),
        fetch(`/api/v1/warranty-plus/claims`)
      ]);
      const [stJson, clJson] = await Promise.all([
        stRes.ok ? stRes.json() : { status: null },
        clRes.ok ? clRes.json() : { claims: [] }
      ]);
      setStatus(stJson.status);
      setClaims(clJson.claims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!status) return null;

    return (
      <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
        {/* Status Hero */}
        <div className="rounded-2xl bg-slate-900 p-8 shadow-2xl text-white relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-emerald-500/30">
                <span className="h-2 w-2 bg-emerald-400 rounded-full"></span>
                {status.status}
              </span>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">DEMO DATA</span>
            </div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-amber-400" /> Vertofi Accounting Warranty+™
            </h1>
            <p className="text-slate-400 text-lg mb-6 font-bold tracking-tight">
              Penalties? We Cover It.
            </p>
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 max-w-lg">
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Annual Coverage Limit</p>
                <p className="text-xl font-bold">₹{status.coverageLimit.toLocaleString()}</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2">
                <div className="bg-amber-400 h-2.5 rounded-full" style={{ width: `${(status.coverageUsed / status.coverageLimit) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Used: ₹{status.coverageUsed.toLocaleString()}</span>
                <span>Remaining: ₹{status.coverageRemaining.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 grid grid-cols-2 gap-4 min-w-[300px]">
             <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Current Plan</p>
                <p className="text-lg font-bold text-amber-400">{status.plan}</p>
             </div>
             <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Waiting Period</p>
                <p className="text-lg font-bold text-emerald-400">{status.waitingPeriod}</p>
             </div>
             <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-md col-span-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Subscription Requirement</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-medium">Vertofi Subscription is Active</p>
                </div>
             </div>
          </div>

          <ShieldCheck className="absolute -right-20 -top-20 h-96 w-96 text-amber-500/10 rotate-12 blur-sm" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Penalty Scorecard */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                <Activity className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-slate-800">Penalty Scorecard</h3>
              </div>
              <div className="p-6 flex flex-col items-center border-b border-slate-50">
                 <div className="relative h-24 w-24 rounded-full border-8 border-slate-100 flex items-center justify-center mb-2">
                    <svg className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="40" cy="40" r="40" className="stroke-current text-amber-400" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (251 * status.scorecard.overall) / 100} />
                    </svg>
                    <span className="text-3xl font-black text-slate-800">{status.scorecard.overall}</span>
                 </div>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compliance Score</p>
              </div>
              <div className="p-4 space-y-3 bg-slate-50">
                {status.scorecard.components.map((c:any, i:number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{c.name}</span>
                    <span className={`font-bold ${c.score < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>{c.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Interference Monitor */}
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-amber-100 flex items-center gap-2 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-amber-900">Manual Interference Monitor</h3>
              </div>
              <div className="p-4">
                {status.manualInterference.map((m:any, i:number) => (
                  <div key={i} className="bg-amber-100/50 p-3 rounded-lg border border-amber-200 text-sm">
                    <p className="font-bold text-amber-900 mb-1">⚠ Warranty Eligibility Risk</p>
                    <p className="text-amber-800">{m.log}</p>
                    <p className="text-[10px] uppercase font-bold text-amber-600 mt-2">{m.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center Column: Matrix & Docs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Coverage Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-slate-800">Coverage Matrix</h3>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Covered</th>
                    <th className="p-3">Conditions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">GST Compliance</td>
                    <td className="p-3"><CheckCircle className="h-4 w-4 text-emerald-500" /></td>
                    <td className="p-3 text-slate-600">Vertofi error/delay (e.g. Late GSTR-1/3B filing)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">Income Tax</td>
                    <td className="p-3"><CheckCircle className="h-4 w-4 text-emerald-500" /></td>
                    <td className="p-3 text-slate-600">Documents provided on time, Vertofi computation error</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">TDS</td>
                    <td className="p-3"><CheckCircle className="h-4 w-4 text-emerald-500" /></td>
                    <td className="p-3 text-slate-600">Vertofi filing error</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">Payroll & PF/ESI</td>
                    <td className="p-3"><CheckCircle className="h-4 w-4 text-emerald-500" /></td>
                    <td className="p-3 text-slate-600">Incorrect processing or challan generation by Vertofi</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2">
                <FileWarning className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <p><strong>What's NOT Covered:</strong> Penalties due to clients not providing documents on time, hidden transactions, illegal cash activities, wrong information supplied by client, non-payment of taxes, or government system failures.</p>
              </div>
            </div>

            {/* Document Deadlines */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-bold text-slate-800">Document Deadlines & SLA</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {status.deadlines.map((d:any, i:number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-800">{d.doc}</p>
                        <p className="text-xs text-slate-500">Due: {d.due}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          d.status === 'On Time' ? 'bg-emerald-100 text-emerald-700' :
                          d.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {d.status}
                        </span>
                        {d.warning && <span className="text-[10px] text-rose-500 mt-1 font-bold">Eligibility may be affected</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderClaims = () => {
    if (activeClaim) {
      const c = activeClaim;
      return (
        <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto pb-20">
          <button onClick={() => setActiveClaim(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <ArrowRight className="h-4 w-4 rotate-180" /> Back to Claims
          </button>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold uppercase mb-2 inline-block">Claim {c.id}</span>
                <h2 className="text-2xl font-bold text-slate-800">{c.penaltyType}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 uppercase font-bold mb-1">Claim Amount</p>
                <p className="text-3xl font-black text-amber-500">{c.amount}</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Eligibility Check */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Warranty Eligibility Check</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-4 w-4" /> Active subscription</div>
                  <div className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-4 w-4" /> Waiting period completed</div>
                  <div className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-4 w-4" /> Category covered by plan</div>
                  <div className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-4 w-4" /> Documents submitted on time</div>
                  <div className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-4 w-4" /> Coverage remaining</div>
                </div>
                <div className="mt-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                  <p className="text-xs uppercase font-bold text-slate-500">Status</p>
                  <p className="font-bold text-slate-800">{c.eligibility.status}</p>
                </div>
              </div>

              {/* Evidence Timeline */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileSearch className="h-4 w-4 text-blue-500" /> Evidence Timeline</h3>
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-slate-300 border-2 border-white"></div>
                    <p className="text-xs text-slate-500">Client documents received</p>
                    <p className="font-bold text-slate-700 text-sm">{c.evidence.clientDocsReceived}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-white"></div>
                    <p className="text-xs text-slate-500">Vertofi filing deadline</p>
                    <p className="font-bold text-slate-700 text-sm">{c.evidence.vertotiDeadline}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-rose-500 border-2 border-white"></div>
                    <p className="text-xs text-slate-500">Actual filing</p>
                    <p className="font-bold text-rose-600 text-sm">{c.evidence.actualFiling}</p>
                  </div>
                </div>
                <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs uppercase font-bold text-amber-700">Responsibility Analysis</p>
                  <p className="font-bold text-amber-900">{c.evidence.responsibility}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Briefcase className="h-6 w-6 text-amber-500" /> Claims Center</h2>
            <p className="text-slate-500 text-sm mt-1">Submit penalty notices for Warranty+ reimbursement review.</p>
          </div>
          <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2 transition-colors">
            <UploadCloud className="h-4 w-4" /> Submit New Claim
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {claims.length === 0 ? <p className="text-slate-500">No active claims.</p> : claims.map((c, i) => (
            <div key={i} onClick={() => setActiveClaim(c)} className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-5 shadow-sm cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{c.status}</span>
                  <span className="text-xs font-mono text-slate-400">{c.id}</span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{c.penaltyType}</h3>
                <p className="text-sm text-slate-500 mt-1">Notice Date: {c.noticeDate}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-bold text-amber-600 mb-1">{c.amount}</p>
                <button className="mt-3 text-xs font-bold text-indigo-600 flex items-center gap-1 md:justify-end group">
                  View Review Details <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConditions = () => (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Warranty Conditions & Terms</h2>
      <div className="prose prose-slate max-w-none text-sm">
        <h3 className="font-bold text-lg text-slate-800">1. Client Must Provide Complete & Accurate Data</h3>
        <p>To qualify for warranty coverage, all invoices, bills, and bank statements must be shared on time. No hidden transactions or unreported cash sales are permitted.</p>
        
        <h3 className="font-bold text-lg text-slate-800 mt-6">2. All Documents Must Be Submitted Before Deadline</h3>
        <ul>
          <li><strong>Purchase/Sales invoices:</strong> Within 5 days of month end</li>
          <li><strong>Bank statements:</strong> 5th of every month</li>
          <li><strong>Payroll inputs:</strong> 25th of every month</li>
        </ul>
        <p className="text-rose-600 font-bold">If deadlines are missed, the Warranty does NOT apply.</p>

        <h3 className="font-bold text-lg text-slate-800 mt-6">3. No Manual Changes by Client</h3>
        <p>Clients must NOT change entries themselves, file GST manually, or modify books in other software. Any such interference voids the warranty.</p>

        <h3 className="font-bold text-lg text-slate-800 mt-6">4. Warranty Covers Penalties Caused by Vertofi Errors Only</h3>
        <p>Vertofi covers penalties ONLY when a filing was done incorrectly by Vertofi, Vertofi missed a compliance deadline, or Vertofi miscalculated tax amounts. This is a <strong>Service Mistake Warranty.</strong></p>

        <h3 className="font-bold text-lg text-slate-800 mt-6">5. Warranty Does NOT Cover</h3>
        <p>Penalties due to client mistakes (not providing docs, giving wrong info, hiding sales), non-payment of taxes by client, government system failures, or legal investigations/fraud.</p>
      </div>
    </div>
  );

  return (
    <SidebarShell>
      <LockedFeatureGate feature="accounting_warranty">
        <main className="px-4 py-8">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-100 p-1 rounded-lg w-fit mx-auto border border-slate-200">
            <button onClick={() => setView("overview")} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'overview' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Overview</button>
            <button onClick={() => { setView("claims"); setActiveClaim(null); }} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'claims' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Claims Center</button>
            <button onClick={() => setView("conditions")} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'conditions' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Conditions & Terms</button>
          </div>

          {view === "overview" && renderOverview()}
          {view === "claims" && renderClaims()}
          {view === "conditions" && renderConditions()}
        </main>
      </LockedFeatureGate>
    </SidebarShell>
  );
}
