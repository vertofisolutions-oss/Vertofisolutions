"use client";

import { useEffect, useState } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { 
  MessageCircle, FileText, Image as ImageIcon, Mic, 
  CheckCircle, AlertTriangle, ShieldCheck, Download, 
  Clock, ArrowRight, Settings, Smartphone, Bell
} from "lucide-react";

export default function WhatsAppAccountingPage() {
  const [view, setView] = useState<"inbox" | "documents" | "settings">("inbox");
  const [loading, setLoading] = useState(true);
  
  const [inbox, setInbox] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDoc, setActiveDoc] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inRes, docRes] = await Promise.all([
        fetch(`/api/v1/whatsapp-accounting/inbox`),
        fetch(`/api/v1/whatsapp-accounting/documents`)
      ]);
      const [inJson, docJson] = await Promise.all([
        inRes.ok ? inRes.json() : { messages: [] },
        docRes.ok ? docRes.json() : { documents: [] }
      ]);
      setInbox(inJson.messages || []);
      setDocuments(docJson.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    if (type === "Photo") return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (type === "Voice Note") return <Mic className="h-5 w-5 text-emerald-500" />;
    return <FileText className="h-5 w-5 text-indigo-500" />;
  };

  const renderInbox = () => (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="rounded-2xl bg-slate-900 p-8 shadow-2xl text-white relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-emerald-500/30">
              <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></span>
              AI PROCESSING ACTIVE
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-emerald-400" /> WhatsApp Micro Accounting
          </h1>
          <p className="text-slate-400 text-lg mb-6 max-w-xl">
            The world's simplest accounting system. Clients send bills on WhatsApp, Vertofi AI extracts the data and updates the ledgers.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/10 px-4 py-2 rounded-lg font-bold backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-400" /> Zero Effort Data Collection
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg font-bold backdrop-blur-sm border border-white/10 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-400" /> Fraud Prevention Active
            </div>
          </div>
        </div>
        <MessageCircle className="absolute -right-10 -bottom-10 h-64 w-64 text-emerald-500/10 rotate-12 blur-sm" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Clock className="h-5 w-5 text-indigo-500" /> AI Processing Inbox</h2>
        
        {loading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>
        ) : (
          <div className="space-y-4">
            {inbox.map((msg:any, i:number) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col lg:flex-row gap-6">
                
                {/* Raw Input Column */}
                <div className="flex-1 lg:max-w-xs border-r border-slate-100 pr-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{msg.timestamp}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${msg.status === 'Processed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{msg.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {getIcon(msg.type)}
                    <h3 className="font-bold text-slate-800">{msg.client}</h3>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-100 font-medium">
                    {msg.rawInput}
                  </div>
                  {msg.transcription && (
                    <div className="mt-2 text-xs italic text-slate-500 border-l-2 border-slate-300 pl-2">
                      "{msg.transcription}"
                    </div>
                  )}
                </div>

                {/* AI Extraction Column */}
                <div className="flex-[2]">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Vertofi AI Extraction</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Vendor</p>
                      <p className="font-bold text-slate-700">{msg.aiExtraction.vendorName}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Amount</p>
                      <p className="font-bold text-emerald-600">{msg.aiExtraction.amount}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Category</p>
                      <p className="font-bold text-slate-700">{msg.aiExtraction.category}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">GST</p>
                      <p className="font-bold text-slate-700">{msg.aiExtraction.gstBreakdown}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Payment</p>
                      <p className="font-bold text-slate-700">{msg.aiExtraction.paymentMode}</p>
                    </div>
                  </div>

                  {msg.ledgerUpdates.length > 0 && (
                    <div className="flex gap-2">
                      {msg.ledgerUpdates.map((l:string, idx:number) => (
                        <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          ✓ Updated {l}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.alerts.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.alerts.map((a:any, idx:number) => (
                        <div key={idx} className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-sm font-bold">
                          <AlertTriangle className="h-4 w-4" /> {a.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDocuments = () => {
    if (activeDoc) {
      const d = activeDoc;
      return (
        <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto pb-20">
          <button onClick={() => setActiveDoc(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
            <ArrowRight className="h-4 w-4 rotate-180" /> Back to Vault
          </button>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase mb-2 inline-block ${d.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                <h2 className="text-2xl font-bold text-slate-800">{d.type} {d.id}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 uppercase font-bold mb-1">Total</p>
                <p className="text-3xl font-black text-slate-800">{d.amount}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-xs font-bold text-blue-800 uppercase mb-1">WhatsApp Trigger</p>
                <p className="text-blue-900 italic">"{d.trigger}"</p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-slate-50 mb-6">
                <FileText className="h-16 w-16 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">{d.documentPreview}</h3>
                <p className="text-sm text-slate-500 mt-2">PDF generation complete. Sent via WhatsApp if approved.</p>
                <button className="mt-4 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-lg text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50">
                  <Download className="h-4 w-4" /> Download PDF Preview
                </button>
              </div>

              {d.status === 'Pending Approval' && (
                <div className="flex gap-4 justify-end border-t border-slate-100 pt-6">
                  <button className="px-6 py-2 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                    Reject
                  </button>
                  <button className="px-6 py-2 rounded-lg font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow flex items-center gap-2 transition-colors">
                    <CheckCircle className="h-5 w-5" /> Approve & Send via WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileText className="h-6 w-6 text-indigo-500" /> Document Vault & Approvals</h2>
            <p className="text-slate-500 text-sm mt-1">Invoices, Credit Notes, and Receipts generated automatically from WhatsApp inputs.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {documents.map((d, i) => (
            <div key={i} onClick={() => setActiveDoc(d)} className="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 shadow-sm cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${d.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                  <span className="text-xs font-mono text-slate-400">{d.id}</span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{d.type}</h3>
                <p className="text-sm text-slate-600 mt-1">Client: {d.client}</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-lg font-bold text-slate-800 mb-1">{d.amount}</p>
                <p className="text-xs text-slate-500">{d.date}</p>
                <button className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 md:justify-end group">
                  Review & Approve <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Settings className="h-6 w-6 text-slate-500" /> WhatsApp Configuration
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Bell className="h-5 w-5 text-amber-500" /> Auto-Reminder System</h3>
          <p className="text-sm text-slate-500 mb-6">Automatically chase clients for documents via WhatsApp if they forget.</p>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">"Please send petrol bill for the week" (Weekly)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">"Send salary details for payroll" (Monthly - 25th)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">"Send sales invoices for GST filing" (Monthly - 5th)</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><ShieldCheck className="h-5 w-5 text-emerald-500" /> Fraud Prevention Alerts</h3>
          <p className="text-sm text-slate-500 mb-6">AI will immediately alert the admin via WhatsApp if suspicious activity is found in the receipts.</p>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> <span className="text-sm font-medium">Duplicate cash withdrawals</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> <span className="text-sm font-medium">Unusual vendor pattern</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-rose-500" /> <span className="text-sm font-medium">Large unexplained payments</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><FileText className="h-5 w-5 text-indigo-500" /> WhatsApp-Based Monthly Reports</h3>
          <p className="text-sm text-slate-500 mb-6">Select which reports to auto-generate and send every month.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Profit & Loss</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Cashflow</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Expense breakdown</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">GST summary</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Pending invoices</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">ITC claim report</span>
            </label>
          </div>
          <p className="mt-4 text-xs text-slate-400">Reports are sent as Image infographic, PDF, or WhatsApp message summary.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><CheckCircle className="h-5 w-5 text-emerald-500" /> Approval & Control (Zero Risk)</h3>
          <p className="text-sm text-slate-500 mb-6">Nothing goes out without consent. Configure approval flows.</p>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked disabled className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-50" />
              <span className="text-sm font-medium text-slate-700">Owner approval via WhatsApp</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked disabled className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-50" />
              <span className="text-sm font-medium text-slate-700">"Approve / Reject" buttons</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked disabled className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-50" />
              <span className="text-sm font-medium text-slate-700">Editable preview</span>
            </label>
            <div className="bg-emerald-50 p-3 rounded border border-emerald-100 flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">GST-compliant invoice format</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:col-span-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Settings className="h-5 w-5 text-indigo-500" /> Auto-Trigger Scenarios</h3>
          <p className="text-sm text-slate-500 mb-6">No Manual Request Needed. AI detects events and takes action.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Scenario</p>
              <p className="font-bold text-slate-700 mb-2">Sales return detected</p>
              <p className="text-xs font-bold text-indigo-500 uppercase">Action</p>
              <p className="text-sm font-medium text-slate-600">Credit note created</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Scenario</p>
              <p className="font-bold text-slate-700 mb-2">Price mismatch</p>
              <p className="text-xs font-bold text-indigo-500 uppercase">Action</p>
              <p className="text-sm font-medium text-slate-600">Debit note suggested</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Scenario</p>
              <p className="font-bold text-slate-700 mb-2">Advance received</p>
              <p className="text-xs font-bold text-indigo-500 uppercase">Action</p>
              <p className="text-sm font-medium text-slate-600">Receipt voucher</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Scenario</p>
              <p className="font-bold text-slate-700 mb-2">Partial payment</p>
              <p className="text-xs font-bold text-indigo-500 uppercase">Action</p>
              <p className="text-sm font-medium text-slate-600">Balance reminder</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Scenario</p>
              <p className="font-bold text-slate-700 mb-2">Overpayment</p>
              <p className="text-xs font-bold text-indigo-500 uppercase">Action</p>
              <p className="text-sm font-medium text-slate-600">Credit note</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Scenario</p>
              <p className="font-bold text-slate-700 mb-2">Discount approved</p>
              <p className="text-xs font-bold text-indigo-500 uppercase">Action</p>
              <p className="text-sm font-medium text-slate-600">Credit note</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SidebarShell>
      <main className="px-4 py-8 bg-slate-50 min-h-screen">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8 w-fit mx-auto bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setView("inbox")} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${view === 'inbox' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}>
            <MessageCircle className="h-4 w-4" /> AI Inbox
          </button>
          <button onClick={() => { setView("documents"); setActiveDoc(null); }} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${view === 'documents' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}>
            <FileText className="h-4 w-4" /> Vault & Approvals
          </button>
          <button onClick={() => setView("settings")} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${view === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}>
            <Settings className="h-4 w-4" /> Configuration
          </button>
        </div>

        {view === "inbox" && renderInbox()}
        {view === "documents" && renderDocuments()}
        {view === "settings" && renderSettings()}
      </main>
    </SidebarShell>
  );
}
