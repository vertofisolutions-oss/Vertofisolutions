"use client";

import { useEffect, useState } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";
import { 
  Database, Activity, AlertOctagon, History, ShieldAlert,
  ArrowRight, Search, Calendar, FileText, Download, Target, 
  Settings, Users, ChevronRight, Laptop, AlertTriangle
} from "lucide-react";

export default function BlackBoxPage() {
  const [orgId] = useState("demo-business-org");
  const [view, setView] = useState<"overview" | "timeline" | "incidents" | "snapshots">("overview");
  const [loading, setLoading] = useState(true);
  
  const [events, setEvents] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [activeIncident, setActiveIncident] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [evRes, incRes] = await Promise.all([
        fetch(`/api/v1/blackbox/events`),
        fetch(`/api/v1/blackbox/incidents`)
      ]);
      const [evJson, incJson] = await Promise.all([
        evRes.ok ? evRes.json() : [],
        incRes.ok ? incRes.json() : []
      ]);
      setEvents(evJson);
      setIncidents(incJson);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    if (sev === 'Critical') return 'bg-rose-500 text-white';
    if (sev === 'High') return 'bg-amber-500 text-white';
    if (sev === 'Medium') return 'bg-blue-500 text-white';
    return 'bg-slate-200 text-slate-700';
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in">
      {/* Status Hero */}
      <div className="rounded-2xl bg-slate-900 p-8 shadow-2xl text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-emerald-500/30">
              <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></span>
              BLACK BOX ACTIVE
            </span>
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">DEMO DATA</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Database className="h-8 w-8 text-indigo-400" /> Financial Black Box
          </h1>
          <p className="text-slate-400 text-sm mb-6 max-w-xl leading-relaxed">
            Continuous Financial Event Recording & Incident Reconstruction. <br/>
            Just like airplanes have a black box to diagnose accidents, your business now has one too.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setView("timeline")} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg">
              View Live Timeline
            </button>
            <button onClick={() => setView("incidents")} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold transition-colors backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4" /> Incident Center
            </button>
          </div>
        </div>
        
        <div className="relative z-10 w-full md:w-auto flex flex-col gap-3">
          <div className="bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-4 min-w-[250px]">
            <History className="h-8 w-8 text-blue-400 opacity-70" />
            <div><p className="text-xs text-slate-400 uppercase font-bold">Events Recorded</p><p className="text-2xl font-black tabular-nums">12,842</p></div>
          </div>
          <div className="bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 backdrop-blur-md flex items-center gap-4 min-w-[250px]">
            <ShieldAlert className="h-8 w-8 text-rose-400 opacity-70" />
            <div><p className="text-xs text-rose-300 uppercase font-bold">Active Incidents</p><p className="text-2xl font-black text-rose-400 tabular-nums">{incidents.length}</p></div>
          </div>
        </div>

        {/* BG flair */}
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Anomalies Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Target className="h-4 w-4 text-indigo-500" /> Recent AI Anomalies</h3>
            <button onClick={() => setView("timeline")} className="text-xs text-indigo-600 font-bold hover:underline">View All</button>
          </div>
          <div className="p-4 flex-1 space-y-4">
            {(Array.isArray(events) ? events : []).filter(e => e.severity === 'Critical' || e.severity === 'High').map((e, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="mt-1 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{e.type}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{e.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{e.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Snapshot Widget */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar className="h-4 w-4 text-indigo-500" /> Current Financial Snapshot</h3>
            <button onClick={() => setView("snapshots")} className="text-xs text-indigo-600 font-bold hover:underline">90-Day History</button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
            <div><p className="text-[10px] uppercase font-bold text-slate-400">Ledger State</p><p className="text-lg font-bold text-slate-800 tabular-nums">₹8,45,000</p></div>
            <div><p className="text-[10px] uppercase font-bold text-slate-400">GST Position</p><p className="text-lg font-bold text-slate-800 tabular-nums">₹52,000</p></div>
            <div><p className="text-[10px] uppercase font-bold text-slate-400">Bank Balance</p><p className="text-lg font-bold text-slate-800 tabular-nums">₹12,40,000</p></div>
            <div><p className="text-[10px] uppercase font-bold text-slate-400">Profit Estimate</p><p className="text-lg font-bold text-emerald-600 tabular-nums">₹2,80,000</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><History className="h-6 w-6 text-indigo-600" /> Continuous Timeline Recorder</h2>
          <p className="text-slate-500 text-sm mt-1">Immutable, append-only log of all financial actions.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search events..." className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-200">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
        {loading ? <p className="text-slate-500 p-4">Loading audit trail...</p> : (Array.isArray(events) ? events : []).map((ev, i) => (
          <div key={i} className="relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            {/* Timeline dot */}
            <div className={`absolute -left-[31px] top-5 h-4 w-4 rounded-full border-4 border-white ${ev.severity === 'Critical' ? 'bg-rose-500' : ev.severity === 'High' ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
            
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-800 text-lg">{ev.type}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{ev.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityColor(ev.severity)}`}>{ev.severity}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">{ev.tag}</span>
                </div>
                <p className="text-slate-600 text-sm">{ev.description}</p>
              </div>
              <div className="text-left md:text-right text-xs text-slate-500">
                <p className="font-bold text-slate-700 mb-1">{ev.timestamp}</p>
                <p className="flex items-center gap-1 md:justify-end"><Users className="h-3 w-3" /> {ev.user} ({ev.role})</p>
                <p className="flex items-center gap-1 md:justify-end mt-0.5"><Laptop className="h-3 w-3" /> {ev.ip} • {ev.device}</p>
              </div>
            </div>

            {/* Old vs New Value Diffs */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full bg-white border border-rose-100 rounded p-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-400"></div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 ml-2">Previous Value</p>
                <p className="font-medium text-rose-700 text-sm ml-2 font-mono">{ev.oldValue}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 hidden md:block shrink-0" />
              <div className="flex-1 w-full bg-white border border-emerald-100 rounded p-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-400"></div>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 ml-2">New Value</p>
                <p className="font-medium text-emerald-700 text-sm ml-2 font-mono">{ev.newValue}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIncidents = () => {
    if (activeIncident) {
      const inc = activeIncident;
      return (
        <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-20">
          <button onClick={() => setActiveIncident(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <ArrowRight className="h-4 w-4 rotate-180" /> Back to Incidents
          </button>
          
          <div className="bg-rose-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="flex items-center gap-2 bg-black/20 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10 mb-4">
                <AlertOctagon className="h-3 w-3 text-rose-300 animate-pulse" /> CRASH DETECTION MODE ACTIVE
              </span>
              <h1 className="text-3xl font-black mb-2">Incident: {inc.type}</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div><p className="text-xs uppercase font-bold text-rose-200">Incident ID</p><p className="font-bold">{inc.id}</p></div>
                <div><p className="text-xs uppercase font-bold text-rose-200">Detected</p><p className="font-bold">{inc.detectedAt}</p></div>
                <div><p className="text-xs uppercase font-bold text-rose-200">Trigger</p><p className="font-bold">{inc.trigger}</p></div>
                <div><p className="text-xs uppercase font-bold text-rose-200">Financial Impact</p><p className="font-bold">{inc.financialImpact}</p></div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-rose-500/50 blur-3xl"></div>
          </div>

          <div className="flex justify-end">
            <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2 transition-colors">
              <FileText className="h-4 w-4" /> Generate Regulatory Defense Pack
            </button>
          </div>

          <h3 className="font-bold text-slate-800 text-xl mt-4">Timeline Reconstruction</h3>
          <p className="text-sm text-slate-500 mb-4">Black Box auto-compiled the chain of events leading to this incident.</p>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="p-4 w-32">Time</th>
                  <th className="p-4">Event</th>
                  <th className="p-4 w-32">User</th>
                  <th className="p-4">Change Log</th>
                  <th className="p-4">System Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inc.reconstructionTimeline.map((rt:any, i:number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-4 font-mono text-xs text-slate-500">{rt.time}</td>
                    <td className="p-4 font-bold text-slate-800">{rt.event}</td>
                    <td className="p-4 text-slate-600">{rt.user}</td>
                    <td className="p-4 font-mono text-xs bg-slate-50 rounded m-2 inline-block px-2 py-1 border border-slate-200">{rt.change}</td>
                    <td className="p-4 text-xs font-semibold text-rose-600">{rt.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-bold text-slate-800 text-xl mt-8">Snapshot Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 pb-2 border-b border-slate-100">Before Incident</h4>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between"><span>Bank Balance</span><span className="font-bold">{inc.snapshots.before.bank}</span></div>
                <div className="flex justify-between"><span>Vendor Outstanding</span><span className="font-bold">{inc.snapshots.before.vendor}</span></div>
                <div className="flex justify-between"><span>GST Position</span><span className="font-bold">{inc.snapshots.before.gst}</span></div>
                <div className="flex justify-between"><span>Profit Estimate</span><span className="font-bold">{inc.snapshots.before.profit}</span></div>
              </div>
            </div>
            <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500"></div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-4 pb-2 border-b border-rose-50">After Incident</h4>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between"><span>Bank Balance</span><span className="font-bold text-rose-600">{inc.snapshots.after.bank}</span></div>
                <div className="flex justify-between"><span>Vendor Outstanding</span><span className="font-bold text-rose-600">{inc.snapshots.after.vendor}</span></div>
                <div className="flex justify-between"><span>GST Position</span><span className="font-bold text-rose-600">{inc.snapshots.after.gst}</span></div>
                <div className="flex justify-between"><span>Profit Estimate</span><span className="font-bold text-rose-600">{inc.snapshots.after.profit}</span></div>
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
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><AlertOctagon className="h-6 w-6 text-rose-500" /> Incident Center</h2>
            <p className="text-slate-500 text-sm mt-1">Crash Detection mode triggers compiled incident reports.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {(incidents?.length || 0) === 0 ? <p className="text-slate-500">No active incidents.</p> : (Array.isArray(incidents) ? incidents : []).map((inc, i) => (
            <div key={i} onClick={() => setActiveIncident(inc)} className="bg-white border border-rose-200 hover:border-rose-400 rounded-xl p-5 shadow-sm cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {inc.status}</span>
                  <span className="text-xs font-mono text-slate-400">{inc.id}</span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{inc.type}</h3>
                <p className="text-sm text-slate-600 mt-1">Triggered by: {inc.trigger}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-bold text-rose-600 mb-1">{inc.financialImpact}</p>
                <p className="text-xs text-slate-500">{inc.detectedAt}</p>
                <button className="mt-3 text-xs font-bold text-indigo-600 flex items-center gap-1 md:justify-end group">
                  Reconstruct Timeline <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSnapshots = () => (
    <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
      <Calendar className="h-16 w-16 text-indigo-300 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800">90-Day Rolling Snapshots</h2>
      <p className="text-slate-500 max-w-md text-center">Calendar UI to traverse historical daily ledger states, GST positions, and bank balances. (UI Component pending integration).</p>
      <button onClick={() => setView("overview")} className="mt-4 text-indigo-600 font-bold hover:underline">Back to Overview</button>
    </div>
  );

  return (
    <SidebarShell>
      <LockedFeatureGate feature="financial_blackbox">
        <main className="px-4 py-8">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-8 bg-slate-100 p-1 rounded-lg w-fit mx-auto border border-slate-200">
            <button onClick={() => setView("overview")} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'overview' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><Database className="h-4 w-4" /> Overview</button>
            <button onClick={() => setView("timeline")} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'timeline' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><History className="h-4 w-4" /> Live Timeline</button>
            <button onClick={() => { setView("incidents"); setActiveIncident(null); }} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'incidents' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><AlertOctagon className="h-4 w-4" /> Incidents</button>
            <button onClick={() => setView("snapshots")} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${view === 'snapshots' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><Calendar className="h-4 w-4" /> Snapshots</button>
          </div>

          {view === "overview" && renderOverview()}
          {view === "timeline" && renderTimeline()}
          {view === "incidents" && renderIncidents()}
          {view === "snapshots" && renderSnapshots()}
        </main>
      </LockedFeatureGate>
    </SidebarShell>
  );
}
