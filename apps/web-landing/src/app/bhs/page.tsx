"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, ArrowRight, AlertTriangle, CheckCircle, Sparkles,
  Settings, Database, Copy, Check, ExternalLink, Lock,
  Activity as ActivityIcon,
} from "lucide-react";
import { Container } from "../../components/primitives";

// ─── Apps Script code for Google Sheets integration ─────────────────────────
const APPS_SCRIPT_CODE = `function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }
function handleRequest(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter || {};
  if (e.postData && e.postData.contents) {
    try { var body = JSON.parse(e.postData.contents); for (var key in body) params[key] = body[key]; } catch(err) {}
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp","Full Name","Company Name","Work Email","Phone Number","BHS Score","Lagging Reasons & Diagnostics"]);
  }
  sheet.appendRow([new Date(), params.fullName||"", params.companyName||"", params.email||"", params.phone||"", params.bhsScore||"", params.laggingReasons||""]);
  return ContentService.createTextOutput(JSON.stringify({status:"success"})).setMimeType(ContentService.MimeType.JSON);
}`;

// ─── Types ───────────────────────────────────────────────────────────────────
interface FormState {
  fullName: string; email: string; phone: string; companyName: string;
  actualExpenses: number | ""; budgetedExpenses: number | "";
  gstDelayDays: number | ""; tdsDelayDays: number | ""; penaltiesPaid: number | ""; noticesReceived: number | "";
  cashReserve: number | ""; monthlyExpense: number | ""; industryReceivableDays: number | ""; actualReceivableDays: number | "";
  correctInvoices: number | ""; totalInvoices: number | "";
  salaryDelayDays: number | ""; payrollErrors: number | "";
  netOperatingIncome: number | ""; monthlyEMI: number | "";
  leakageAmount: number | ""; monthlyRevenue: number | "";
}

const INITIAL: FormState = {
  fullName: "", email: "", phone: "", companyName: "",
  actualExpenses: "", budgetedExpenses: "",
  gstDelayDays: "", tdsDelayDays: "", penaltiesPaid: "", noticesReceived: "",
  cashReserve: "", monthlyExpense: "", industryReceivableDays: "", actualReceivableDays: "",
  correctInvoices: "", totalInvoices: "",
  salaryDelayDays: "", payrollErrors: "",
  netOperatingIncome: "", monthlyEMI: "",
  leakageAmount: "", monthlyRevenue: "",
};

const DEFAULT_SCRIPT = "https://script.google.com/macros/s/AKfycbzWwWuRXvTc6XzjNW1km3nnKV8Z_pn0GjdSoQenCDZkNeje4-_rZ1kGjSYeLrZclFchwA/exec";

// ─── Input helper ────────────────────────────────────────────────────────────
function Field({ label, note, ...props }: { label: string; note?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {note && <p className="text-[11px] text-slate-400">{note}</p>}
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 54; const c = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-xl">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${c * pct} ${c * (1 - pct)}`}
        strokeLinecap="round" strokeDashoffset={c * 0.25}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
      <text x="70" y="66" textAnchor="middle" fontSize="30" fontWeight="800" fill={color}>{score}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">/ 100</text>
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function Status({ s }: { s: "healthy" | "warning" | "critical" }) {
  const map = {
    healthy: { bg: "bg-green-50 text-green-700 border-green-200", label: "Healthy" },
    warning: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Warning" },
    critical: { bg: "bg-red-50 text-red-700 border-red-200", label: "Critical" },
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[s].bg}`}>
      {s === "healthy" ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {map[s].label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BHSCalculator() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [showSettings, setShowSettings] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(DEFAULT_SCRIPT);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  useEffect(() => {
    const saved = localStorage.getItem("vertofi_bhs_script_url");
    if (saved) setScriptUrl(saved);
  }, []);

  const update = (k: keyof FormState, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const num = (k: keyof FormState) => {
    const v = form[k]; return v === "" || isNaN(Number(v)) ? 0 : Number(v);
  };

  // ── Scoring formulas ─────────────────────────────────────────────────────
  const expenseScore = () => {
    const b = num("budgetedExpenses"), a = num("actualExpenses");
    if (b <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round(100 - ((a - b) / b) * 100 * 4)));
  };
  const taxScore = () => Math.max(0, Math.min(100, Math.round(
    100 - num("gstDelayDays") * 2 - num("tdsDelayDays") * 2 - num("penaltiesPaid") * 10 - num("noticesReceived") * 15
  )));
  const cashflowScore = () => {
    const aR = num("actualReceivableDays"), iR = num("industryReceivableDays"),
      mE = num("monthlyExpense"), cr = num("cashReserve");
    const recS = aR > 0 ? Math.min(100, Math.round((iR / aR) * 100)) : 100;
    const bufS = mE > 0 ? Math.min(100, Math.round((cr / mE) * 100)) : 100;
    return Math.max(0, Math.min(100, Math.round(recS * 0.6 + bufS * 0.4)));
  };
  const gstScore = () => {
    const t = num("totalInvoices"), c = num("correctInvoices");
    return t <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((c / t) * 100)));
  };
  const payrollScore = () => Math.max(0, Math.min(100, Math.round(100 - num("salaryDelayDays") * 5 - num("payrollErrors") * 2)));
  const debtScore = () => {
    const emi = num("monthlyEMI"), noi = num("netOperatingIncome");
    if (emi <= 0) return 100;
    const d = noi / emi;
    return d >= 3 ? 95 : d >= 2 ? 80 : d >= 1 ? 60 : 30;
  };
  const leakageScore = () => {
    const r = num("monthlyRevenue"), l = num("leakageAmount");
    if (r <= 0) return 100;
    const p = (l / r) * 100;
    return p < 1 ? 95 : p < 2 ? 80 : p < 4 ? 60 : 30;
  };
  const finalScore = () => Math.max(0, Math.min(100, Math.round(
    expenseScore() * 0.20 + taxScore() * 0.15 + cashflowScore() * 0.20 +
    gstScore() * 0.10 + payrollScore() * 0.10 + debtScore() * 0.15 + leakageScore() * 0.10
  )));

  // ── Diagnostics ──────────────────────────────────────────────────────────
  const getDiagnostics = () => {
    const d: { status: "healthy" | "warning" | "critical"; msg: string }[] = [];
    // Expense
    const b = num("budgetedExpenses"), a = num("actualExpenses");
    const es = expenseScore(); const vp = b > 0 ? ((a - b) / b) * 100 : 0;
    if (b <= 0) d.push({ status: "healthy", msg: `Expense Discipline (20%): No budget data — Score: ${es}/100` });
    else if (vp <= 0) d.push({ status: "healthy", msg: `Expense Discipline (20%): Spending ₹${a.toLocaleString()} below budget ₹${b.toLocaleString()} — Score: ${es}/100` });
    else if (vp <= 5) d.push({ status: "healthy", msg: `Expense Discipline (20%): Minor overrun ${vp.toFixed(1)}% — Score: ${es}/100` });
    else if (vp <= 10) d.push({ status: "warning", msg: `Expense Discipline (20%): Budget overrun ${vp.toFixed(1)}% — Score: ${es}/100` });
    else d.push({ status: "critical", msg: `Expense Discipline (20%): Critical budget bleed ${vp.toFixed(1)}%! (₹${a.toLocaleString()} vs ₹${b.toLocaleString()}) — Score: ${es}/100` });

    // Tax
    const ts = taxScore();
    const gD = num("gstDelayDays"), tD = num("tdsDelayDays"), pen = num("penaltiesPaid"), not = num("noticesReceived");
    if (gD === 0 && tD === 0 && pen === 0 && not === 0)
      d.push({ status: "healthy", msg: `Tax Compliance (15%): Perfect statutory discipline — Score: ${ts}/100` });
    else {
      const issues = [];
      if (gD > 0) issues.push(`${gD}d GST delay`);
      if (tD > 0) issues.push(`${tD}d TDS delay`);
      if (pen > 0) issues.push(`${pen} penalties`);
      if (not > 0) issues.push(`${not} notices`);
      d.push({ status: (not > 0 || pen > 0) ? "critical" : "warning", msg: `Tax Compliance (15%): Issues — ${issues.join(", ")} — Score: ${ts}/100` });
    }

    // Cashflow receivables
    const aR = num("actualReceivableDays"), iR = num("industryReceivableDays");
    const recS = aR > 0 ? Math.min(100, Math.round((iR / aR) * 100)) : 100;
    d.push(aR <= iR
      ? { status: "healthy", msg: `Cashflow Receivables (20%): ${aR}d ≤ industry ${iR}d — Score: ${recS}/100` }
      : { status: "critical", msg: `Cashflow Receivables (20%): Slow ${aR}d vs industry ${iR}d — Score: ${recS}/100` }
    );

    // Cashflow reserves
    const mE = num("monthlyExpense"), cr = num("cashReserve");
    const bufS = mE > 0 ? Math.min(100, Math.round((cr / mE) * 100)) : 100;
    const months = mE > 0 ? (cr / mE).toFixed(1) : "∞";
    d.push(bufS >= 100
      ? { status: "healthy", msg: `Cashflow Reserves (20%): ${months} months runway — Score: ${bufS}/100` }
      : { status: "warning", msg: `Cashflow Reserves (20%): Only ${months} months runway — Score: ${bufS}/100` }
    );

    // GST accuracy
    const gs = gstScore();
    const tot = num("totalInvoices"), cor = num("correctInvoices");
    const acc = tot > 0 ? (cor / tot) * 100 : 100;
    if (tot <= 0) d.push({ status: "healthy", msg: `GST Accuracy (10%): No invoice data — Score: ${gs}/100` });
    else if (acc === 100) d.push({ status: "healthy", msg: `GST Accuracy (10%): 100% invoice accuracy (${cor}/${tot}) — Score: ${gs}/100` });
    else d.push({ status: acc >= 90 ? "warning" : "critical", msg: `GST Accuracy (10%): ${acc.toFixed(1)}% accuracy (${cor}/${tot}) — Score: ${gs}/100` });

    // Payroll
    const ps = payrollScore();
    const sD = num("salaryDelayDays"), pE = num("payrollErrors");
    d.push(sD === 0 && pE === 0
      ? { status: "healthy", msg: `Payroll (10%): Flawless disbursals — Score: ${ps}/100` }
      : { status: "warning", msg: `Payroll (10%): ${sD} delay days, ${pE} errors — Score: ${ps}/100` }
    );

    // Debt
    const ds = debtScore();
    const emi = num("monthlyEMI"), noi = num("netOperatingIncome");
    if (emi <= 0) d.push({ status: "healthy", msg: `Debt-Risk (15%): Debt-free — Score: ${ds}/100` });
    else {
      const dscr = (noi / emi).toFixed(2);
      const st = Number(dscr) >= 2 ? "healthy" : Number(dscr) >= 1 ? "warning" : "critical";
      d.push({ status: st, msg: `Debt-Risk (15%): DSCR ${dscr}x (NOI ₹${noi.toLocaleString()} / EMI ₹${emi.toLocaleString()}) — Score: ${ds}/100` });
    }

    // Leakage
    const ls = leakageScore();
    const rev = num("monthlyRevenue"), lk = num("leakageAmount");
    const lp = rev > 0 ? (lk / rev) * 100 : 0;
    if (rev <= 0) d.push({ status: "healthy", msg: `Profit Leakage (10%): No data — Score: ${ls}/100` });
    else if (lp < 2) d.push({ status: "healthy", msg: `Profit Leakage (10%): ${lp.toFixed(2)}% leakage — Score: ${ls}/100` });
    else if (lp < 4) d.push({ status: "warning", msg: `Profit Leakage (10%): ${lp.toFixed(2)}% leakage (₹${lk.toLocaleString()}) — Score: ${ls}/100` });
    else d.push({ status: "critical", msg: `Profit Leakage (10%): Severe ${lp.toFixed(2)}% leakage (₹${lk.toLocaleString()}) — Score: ${ls}/100` });

    return d;
  };

  // ── Google Sheet submit ──────────────────────────────────────────────────
  const submitToSheet = async (overrideForm?: FormState, scoreOverride?: number, reasons?: string) => {
    const f = overrideForm ?? form;
    const url = scriptUrl.trim() || DEFAULT_SCRIPT;
    setSubmitStatus("submitting");
    try {
      await fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: f.fullName, companyName: f.companyName,
          email: f.email, phone: f.phone,
          bhsScore: scoreOverride ?? finalScore(),
          laggingReasons: reasons ?? "",
          timestamp: new Date().toISOString(),
        }),
      });
      setSubmitStatus("success");
    } catch { setSubmitStatus("error"); }
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const next = () => {
    if (step === 1 && (!form.fullName || !form.email || !form.phone || !form.companyName)) {
      alert("Please fill in all contact details to personalize your report.");
      return;
    }
    if (step === 8) {
      const score = finalScore();
      const reasons = getDiagnostics()
        .filter((d) => d.status !== "healthy").map((d) => d.msg).join(" | ");
      submitToSheet(form, score, reasons || "All sectors healthy.");
    }
    setStep((p) => p + 1);
  };
  const back = () => setStep((p) => p - 1);

  // ── Number input helper ──────────────────────────────────────────────────
  const numInput = (key: keyof FormState, label: string, placeholder: string, note?: string) => (
    <Field
      label={label} note={note} type="number" min={0}
      placeholder={placeholder}
      value={form[key] === "" ? "" : String(form[key])}
      onChange={(e) => update(key, e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
    />
  );

  const score = finalScore();
  const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Moderate" : score >= 40 ? "Needs Work" : "Critical";
  const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <Container className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Vertofi
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Vertofi" width={24} height={24} className="rounded-md object-contain" priority />
            <span className="text-sm font-bold text-slate-800">BHS Assessment Portal</span>
          </div>
          <div className="w-24" />
        </Container>
      </header>

      <Container className="py-10">
        {/* ── Page title ── */}
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" /> Business Health Score
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Vertofi BHS Assessment Portal
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Connect and score your financial metrics. Get a pure mathematical diagnostic scorecard in real-time.
          </p>
        </div>

        {/* ── Progress bar ── */}
        {step < 9 && (
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>Step {step} of 8</span>
              <span className="text-blue-600">{Math.round((step / 8) * 100)}% Complete</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${(step / 8) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Wizard card ── */}
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* ─────────────── STEP 1: Identity ─────────────── */}
          {step === 1 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 uppercase">Identity</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Who are we analyzing?</h2>
                <p className="text-sm text-slate-500 mt-1">Provide your details to personalize the diagnostic report.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full Name" type="text" placeholder="Your name" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
                <Field label="Company Name" type="text" placeholder="Registered business name" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
                <Field label="Work Email" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
                <Field label="Phone Number" type="tel" placeholder="Mobile number" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
            </div>
          )}

          {/* ─────────────── STEP 2: Expense Discipline ─────────────── */}
          {step === 2 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 uppercase">Expense Discipline · 20% Weight</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Operational Budget & Spending</h2>
                <p className="text-sm text-slate-500 mt-1">Measures variance between planned and actual monthly spend.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {numInput("budgetedExpenses", "Budgeted Expenses (₹/month)", "e.g. 100000")}
                {numInput("actualExpenses", "Actual Expenses (₹/month)", "e.g. 120000")}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 3: Tax Compliance ─────────────── */}
          {step === 3 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 uppercase">Tax Compliance · 15% Weight</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">GST & TDS Compliance</h2>
                <p className="text-sm text-slate-500 mt-1">Filing delay history and regulatory exposure.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {numInput("gstDelayDays", "GST Filing Delay (Days)", "e.g. 2")}
                {numInput("tdsDelayDays", "TDS Remittance Delay (Days)", "e.g. 1")}
                {numInput("penaltiesPaid", "GST Penalties / Interest Occurrences", "e.g. 0")}
                {numInput("noticesReceived", "Tax Notices / Mismatches Received", "e.g. 0")}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 4: Cashflow Stability ─────────────── */}
          {step === 4 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 uppercase">Cashflow Stability · 20% Weight</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Liquidity & Receivable Cycle</h2>
                <p className="text-sm text-slate-500 mt-1">Cash runway and receivable delays vs industry averages.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {numInput("cashReserve", "Liquid Cash Reserve (₹)", "e.g. 150000")}
                {numInput("monthlyExpense", "Monthly Operational Cost (₹)", "e.g. 100000")}
                {numInput("actualReceivableDays", "Your Actual Receivable Cycle (Days)", "e.g. 35")}
                {numInput("industryReceivableDays", "Industry Standard Receivable (Days)", "e.g. 30")}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 5: GST Accuracy ─────────────── */}
          {step === 5 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 uppercase">GST Invoicing Accuracy · 10% Weight</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">GSTR-1 Invoice Precision</h2>
                <p className="text-sm text-slate-500 mt-1">Ratio of correctly filed invoices to total invoices raised.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {numInput("correctInvoices", "Correctly Processed Invoices", "e.g. 95")}
                {numInput("totalInvoices", "Total Invoices Raised (Monthly)", "e.g. 100")}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 6: Payroll ─────────────── */}
          {step === 6 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 uppercase">Payroll Consistency · 10% Weight</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Employee Disbursals</h2>
                <p className="text-sm text-slate-500 mt-1">Integrity of salary cycles and tax deduction processing.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {numInput("salaryDelayDays", "Delayed Salary Cycles (No. of Delay Days)", "e.g. 1")}
                {numInput("payrollErrors", "Payroll / Compliance Errors Occurred", "e.g. 0")}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 7: Debt Risk ─────────────── */}
          {step === 7 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 uppercase">Debt-Risk Management · 15% Weight</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">DSCR — Debt Service Coverage</h2>
                <p className="text-sm text-slate-500 mt-1">Your EMI-paying capability from operating cash flows.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {numInput("netOperatingIncome", "Net Operating Income (₹/month)", "e.g. 250000", "Revenue minus operating expenses")}
                {numInput("monthlyEMI", "Total Monthly EMI / Loan Repayments (₹)", "e.g. 50000", "Leave 0 if no active loans")}
              </div>
            </div>
          )}

          {/* ─────────────── STEP 8: Profit Leakage ─────────────── */}
          {step === 8 && (
            <div className="p-8 space-y-6">
              <div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 uppercase">Profit Leakage Control · 10% Weight</span>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Silent Profit Leakage</h2>
                <p className="text-sm text-slate-500 mt-1">Duplicate payments, unused subscriptions, and over-billing.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {numInput("monthlyRevenue", "Monthly Gross Revenue (₹)", "e.g. 500000")}
                {numInput("leakageAmount", "Estimated Monthly Leakage (₹)", "e.g. 5000", "Duplicate payments + wasted subscriptions + errors")}
              </div>
            </div>
          )}

          {/* ─────────────── RESULT ─────────────── */}
          {step === 9 && (
            <div className="p-8 space-y-8">
              {/* Free Preview Banner */}
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" /> Free Baseline Summary · 50% of Report Shown
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Full Report available with Vertofi
                </span>
              </div>

              {/* Score hero */}
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <ScoreRing score={score} />
                </div>
                <div>
                  <p className={`text-2xl font-extrabold ${scoreColor}`}>{scoreLabel}</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
                    {score >= 80 ? "Your business demonstrates strong financial discipline across baseline dimensions."
                      : score >= 60 ? "Moderate financial health detected — several key operational areas require targeted improvement."
                      : score >= 40 ? "Elevated financial risks detected — immediate remediation recommended."
                      : "Critical health status — urgent financial risk intervention required."}
                  </p>
                </div>

                {/* Score breakdown - First Half (Public Core Dimensions) */}
                <div className="space-y-2 text-left pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Core Dimensions Summary</p>
                    <span className="text-[11px] font-medium text-slate-400">Baseline indicators</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { label: "Expense Discipline", score: expenseScore(), weight: "20%" },
                      { label: "Cashflow Stability", score: cashflowScore(), weight: "20%" },
                      { label: "Tax Compliance", score: taxScore(), weight: "15%" },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label} · {m.weight}</p>
                        <p className={`text-2xl font-bold mt-1 ${m.score >= 80 ? "text-green-600" : m.score >= 60 ? "text-amber-500" : "text-red-500"}`}>{m.score}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Locked Second Half - Full Forensic Diagnostics & Action Plan */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40 p-6">
                {/* Blurred teaser content */}
                <div className="select-none filter blur-sm pointer-events-none opacity-40 space-y-6">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "GST Accuracy", score: gstScore(), weight: "10%" },
                      { label: "Payroll Consistency", score: payrollScore(), weight: "10%" },
                      { label: "Debt & EMI Risk", score: debtScore(), weight: "15%" },
                      { label: "Profit Leakage Control", score: leakageScore(), weight: "10%" },
                    ].map((m) => (
                      <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label} · {m.weight}</p>
                        <p className="text-xl font-bold mt-0.5 text-slate-700">{m.score}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Detailed Root Cause Diagnostics</h3>
                    {getDiagnostics().map((d, i) => (
                      <div key={i} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm">
                        <span className="mt-0.5 shrink-0"><Status s={d.status} /></span>
                        <p className="text-slate-700 leading-relaxed">{d.msg}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lock Overlay Callout */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 p-6 text-center backdrop-blur-[2px]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 mb-3 shadow-sm">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Unlock Full Diagnostic Report & Action Plan
                  </h3>
                  <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-600 leading-relaxed">
                    You are viewing the free baseline summary. Sign in or create a free account to unlock all 7 forensic pillars, full root-cause diagnostics, and automated remediation workflows.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href="http://localhost:3001/register"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-all"
                    >
                      Unlock Full Report Free <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href="http://localhost:3001/login"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Sign In
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom options */}
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => { setStep(1); setForm(INITIAL); setSubmitStatus("idle"); }}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Recalculate Score
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
              </div>
            </div>
          )}

          {/* ── Navigation buttons ── */}
          {step < 9 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-8 py-4">
              <button onClick={back} disabled={step === 1}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              {/* Live score preview */}
              {step > 1 && (
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Current Score</p>
                  <p className={`text-lg font-bold ${scoreColor}`}>{score}<span className="text-xs font-normal text-slate-400">/100</span></p>
                </div>
              )}

              <button onClick={next}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm">
                {step === 8 ? "Calculate Score" : "Next"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Scores are calculated using a pure mathematical engine — no AI assumptions. All data stays in your browser.
        </p>
      </Container>
    </div>
  );
}
