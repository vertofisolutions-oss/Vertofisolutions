"use client";

import { useEffect, useState, useMemo } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";
import {
  AlertTriangle, ShieldCheck, Activity, Search, AlertCircle, ArrowRight, DollarSign,
  TrendingDown, RefreshCw, UploadCloud, PieChart, LineChart as LineChartIcon,
  CheckCircle2, X, Sliders, Server, Building2, Landmark, Users, FileText, Check
} from "lucide-react";

interface SimulationResult {
  actionName: string;
  amount: number;
  taxImpact: number;
  taxImpactLabel: string;
  cashFlowImpact: number;
  cashFlowDirection: "inflow" | "outflow" | "neutral";
  timingImpact: string;
  riskLevel: "Low" | "Medium" | "High";
  confidence: number;
  impactType: string;
  scenarioA: {
    label: string;
    value: number;
    subLabel: string;
  };
  scenarioB: {
    label: string;
    value: number;
    subLabel: string;
  };
  delta: number;
  percentageChange: number;
  predictedOutcome: string;
  recommendation: string;
}

function calculateSimulation(simType: string, amount: number): SimulationResult {
  const safeAmount = Math.max(0, Number(amount) || 0);

  switch (simType) {
    case "INVOICE": {
      const gstImpact = Math.round(safeAmount * 0.18);
      return {
        actionName: "Invoice Timing",
        amount: safeAmount,
        taxImpact: gstImpact,
        taxImpactLabel: "Estimated GST Impact (18%)",
        cashFlowImpact: safeAmount,
        cashFlowDirection: "inflow",
        timingImpact: "Advances GST payment recognition to current monthly GSTR-3B cycle (20th)",
        riskLevel: safeAmount > 500000 ? "Medium" : "Low",
        confidence: 96,
        impactType: "Tax & Working Capital",
        scenarioA: {
          label: "Status Quo (Standard Net-30 Invoicing)",
          value: 0,
          subLabel: "Current Period GST Liability",
        },
        scenarioB: {
          label: "Simulated Action (Immediate Invoicing)",
          value: gstImpact,
          subLabel: "Accelerated GST Liability",
        },
        delta: gstImpact,
        percentageChange: 18.0,
        predictedOutcome: `Advancing invoice issuance by 15-30 days accelerates ₹${safeAmount.toLocaleString("en-IN")} in gross customer cash inflow, while advancing ₹${gstImpact.toLocaleString("en-IN")} in GST liability recognition to the current tax period.`,
        recommendation: "Consider this timing if maintaining short-term liquidity is the priority, subject to applicable accounting and GST rules.",
      };
    }

    case "EXPENSE": {
      const taxShield = Math.round(safeAmount * 0.25);
      const itc = Math.round(safeAmount * 0.18);
      return {
        actionName: "Expense Timing",
        amount: safeAmount,
        taxImpact: taxShield,
        taxImpactLabel: "Estimated Tax Shield (25% Corporate Tax)",
        cashFlowImpact: -safeAmount,
        cashFlowDirection: "outflow",
        timingImpact: "Accelerates deductible expense into current quarter, reducing advance tax dues",
        riskLevel: safeAmount > 1000000 ? "Medium" : "Low",
        confidence: 94,
        impactType: "Tax Savings & Cash Outflow",
        scenarioA: {
          label: "Status Quo (Defer Expense to Next Qtr)",
          value: 0,
          subLabel: "Immediate Tax Deduction",
        },
        scenarioB: {
          label: "Simulated Action (Pre-Pay in Current Qtr)",
          value: taxShield + itc,
          subLabel: "Total Tax Shield + ITC",
        },
        delta: taxShield + itc,
        percentageChange: 43.0,
        predictedOutcome: `Booking ₹${safeAmount.toLocaleString("en-IN")} in deductible expenses before fiscal quarter end reduces current period taxable income by ₹${taxShield.toLocaleString("en-IN")} while drawing down near-term cash reserves.`,
        recommendation: "Pre-pay deductible business expenses before quarter close if taxable profit is high and liquid reserves exceed 60 days.",
      };
    }

    case "PURCHASE": {
      const itcClaimable = Math.round(safeAmount * 0.18);
      const deprShield = Math.round(safeAmount * 0.15 * 0.25);
      return {
        actionName: "Large Purchase / Capital Asset",
        amount: safeAmount,
        taxImpact: itcClaimable,
        taxImpactLabel: "Claimable Input Tax Credit (ITC @ 18%)",
        cashFlowImpact: -safeAmount,
        cashFlowDirection: "outflow",
        timingImpact: "Generates immediate ITC offset in GSTR-3B with ongoing Section 32 depreciation shields",
        riskLevel: safeAmount > 1000000 ? "High" : "Medium",
        confidence: 92,
        impactType: "Input Tax Credit & CAPEX",
        scenarioA: {
          label: "Status Quo (Lease / Defer Capex)",
          value: 0,
          subLabel: "Immediate ITC Benefit",
        },
        scenarioB: {
          label: "Simulated Action (Direct CAPEX Purchase)",
          value: itcClaimable,
          subLabel: "Immediate Claimable ITC",
        },
        delta: itcClaimable,
        percentageChange: 18.0,
        predictedOutcome: `Purchasing ₹${safeAmount.toLocaleString("en-IN")} in capital assets generates ₹${itcClaimable.toLocaleString("en-IN")} in claimable Input Tax Credit (ITC) to offset outward GST dues, alongside ₹${deprShield.toLocaleString("en-IN")} in Year 1 depreciation tax shields.`,
        recommendation: `Ensure supplier uploads the invoice to GSTR-1 on time to confirm eligibility for the ₹${itcClaimable.toLocaleString("en-IN")} ITC before tax remittance.`,
      };
    }

    case "PAYROLL": {
      const statutoryDues = Math.round(safeAmount * 0.15);
      return {
        actionName: "Hire Employees / Payroll Expansion",
        amount: safeAmount,
        taxImpact: statutoryDues,
        taxImpactLabel: "Monthly TDS & PF/ESI Remittance",
        cashFlowImpact: -safeAmount,
        cashFlowDirection: "outflow",
        timingImpact: "Establishes recurring monthly payroll cycle with statutory tax deposit due by the 15th",
        riskLevel: safeAmount > 500000 ? "Medium" : "Low",
        confidence: 95,
        impactType: "Monthly OpEx & Compliance",
        scenarioA: {
          label: "Status Quo (Current Team)",
          value: 0,
          subLabel: "Additional Monthly Compliance",
        },
        scenarioB: {
          label: "Simulated Action (Hire New Staff)",
          value: statutoryDues,
          subLabel: "Est. Monthly TDS/PF Deposit",
        },
        delta: statutoryDues,
        percentageChange: 15.0,
        predictedOutcome: `Adding ₹${safeAmount.toLocaleString("en-IN")} in monthly payroll increases recurring OpEx but provides Section 80JJAA tax deductions while requiring timely PF/ESI/TDS monthly deposits by the 15th.`,
        recommendation: "Structure salary components with tax-efficient allowances to optimize employee net take-home while ensuring full statutory compliance.",
      };
    }

    case "LOAN": {
      const annualInterest = Math.round(safeAmount * 0.11);
      const interestTaxShield = Math.round(annualInterest * 0.25);
      return {
        actionName: "Take a Loan / Debt Financing",
        amount: safeAmount,
        taxImpact: interestTaxShield,
        taxImpactLabel: "Annual Interest Tax Shield (25%)",
        cashFlowImpact: safeAmount,
        cashFlowDirection: "inflow",
        timingImpact: "Immediate lump-sum cash injection followed by monthly EMI debt amortisation",
        riskLevel: safeAmount > 2000000 ? "High" : safeAmount > 1000000 ? "Medium" : "Low",
        confidence: 93,
        impactType: "Liquidity & Interest Deduction",
        scenarioA: {
          label: "Status Quo (Organic Cash Flow)",
          value: 0,
          subLabel: "Annual Interest Deduction",
        },
        scenarioB: {
          label: `Simulated Action (Loan of ₹${(safeAmount / 100000).toFixed(1)}L)`,
          value: interestTaxShield,
          subLabel: "Tax Savings on Annual Interest",
        },
        delta: interestTaxShield,
        percentageChange: 2.75,
        predictedOutcome: `Securing ₹${safeAmount.toLocaleString("en-IN")} in debt financing injects immediate liquidity of ₹${safeAmount.toLocaleString("en-IN")} with ₹${interestTaxShield.toLocaleString("en-IN")} in annual tax savings on interest deductions.`,
        recommendation: "Verify that debt-service coverage ratio (DSCR) remains above 1.5x before taking on additional loan obligations.",
      };
    }

    case "PAYMENT": {
      const cashDiscount = Math.round(safeAmount * 0.02);
      return {
        actionName: "Payment Timing / Vendor Terms",
        amount: safeAmount,
        taxImpact: cashDiscount,
        taxImpactLabel: "Early Payment Cash Discount (2%)",
        cashFlowImpact: safeAmount,
        cashFlowDirection: "neutral",
        timingImpact: "Preserves liquid working capital for 30-45 days during peak GST remittance weeks",
        riskLevel: "Low",
        confidence: 97,
        impactType: "Working Capital Optimization",
        scenarioA: {
          label: "Early Settlement (Day 10 with 2% Discount)",
          value: cashDiscount,
          subLabel: "Direct Purchase Cost Savings",
        },
        scenarioB: {
          label: "Full Credit Term (Day 45)",
          value: safeAmount,
          subLabel: "Conserved 45-Day Cash Buffer",
        },
        delta: cashDiscount,
        percentageChange: 2.0,
        predictedOutcome: `Negotiating 45-day vendor payment terms preserves ₹${safeAmount.toLocaleString("en-IN")} in cash reserves during critical tax remittance weeks without incurring late fees.`,
        recommendation: "Take the 2% discount if treasury cash covers over 60 days of operations; otherwise conserve cash until the full credit term.",
      };
    }

    case "INVESTMENT": {
      const annualYield = Math.round(safeAmount * 0.072);
      const taxOnYield = Math.round(annualYield * 0.25);
      const netGain = annualYield - taxOnYield;
      return {
        actionName: "Investment Decision / Liquid Fund",
        amount: safeAmount,
        taxImpact: taxOnYield,
        taxImpactLabel: "Est. Tax on Capital Gains (25%)",
        cashFlowImpact: netGain,
        cashFlowDirection: "inflow",
        timingImpact: "Provides overnight interest accrual with T+1 instant liquidity for tax payments",
        riskLevel: "Low",
        confidence: 98,
        impactType: "Treasury Yield & Post-Tax Gain",
        scenarioA: {
          label: "Status Quo (0% Idle Current Account)",
          value: 0,
          subLabel: "Annual Treasury Return",
        },
        scenarioB: {
          label: "Simulated Action (Liquid / Overnight Fund)",
          value: netGain,
          subLabel: "Net Post-Tax Annual Yield",
        },
        delta: netGain,
        percentageChange: 5.4,
        predictedOutcome: `Allocating ₹${safeAmount.toLocaleString("en-IN")} into short-term liquid funds yields ₹${annualYield.toLocaleString("en-IN")} in gross returns (₹${netGain.toLocaleString("en-IN")} post-tax) while preserving same-day liquidity.`,
        recommendation: "Enable automated overnight sweep accounts to generate passive treasury returns on idle balances awaiting GST payments.",
      };
    }

    default:
      return calculateSimulation("INVOICE", safeAmount);
  }
}

interface ConnectorConfig {
  status: "WAITING FOR SETUP" | "CONNECTED";
  provider?: string;
  details?: string;
  connectedAt?: string;
}

export default function PredictiveTaxWarningsPage() {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("risk-feed");
  const [orgId, setOrgId] = useState("demo-business-org");

  // Simulation State
  const [simType, setSimType] = useState("INVOICE");
  const [simAmount, setSimAmount] = useState<number | string>(200000);
  const [simError, setSimError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Connectors State & Modals
  const [connectors, setConnectors] = useState<Record<string, ConnectorConfig>>({
    Accounting: { status: "WAITING FOR SETUP" },
    "Bank Feeds": { status: "WAITING FOR SETUP" },
    Payroll: { status: "WAITING FOR SETUP" },
    "GST Portal": { status: "WAITING FOR SETUP" },
  });
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  // Connector Form States
  const [accPlatform, setAccPlatform] = useState("Zoho Books");
  const [accOrgName, setAccOrgName] = useState("My Business Pvt Ltd");
  const [bankName, setBankName] = useState("HDFC Bank");
  const [bankAccNum, setBankAccNum] = useState("50200098412345");
  const [payrollProvider, setPayrollProvider] = useState("RazorpayX Payroll");
  const [payrollCycle, setPayrollCycle] = useState("Last Day of Month");
  const [gstin, setGstin] = useState("36AABCU9603R1ZM");
  const [gstUsername, setGstUsername] = useState("tax_officer_vertofi");

  useEffect(() => {
    fetchWarnings();
    // Load persisted connector configurations
    try {
      const saved = localStorage.getItem("vertofi_tax_connectors");
      if (saved) {
        setConnectors(JSON.parse(saved));
      }
    } catch {}
  }, [orgId]);

  const saveConnectors = (next: Record<string, ConnectorConfig>) => {
    setConnectors(next);
    try {
      localStorage.setItem("vertofi_tax_connectors", JSON.stringify(next));
    } catch {}
  };

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

  const runSimulation = () => {
    const val = Number(simAmount);
    if (!simAmount || isNaN(val) || val <= 0) {
      setSimError("Please enter a valid estimated amount.");
      return;
    }
    setSimError(null);
    setSimulating(true);

    setTimeout(() => {
      const result = calculateSimulation(simType, val);
      setSimResult(result);
      setSimulating(false);
    }, 250);
  };

  const handleConnectSubmit = (type: string) => {
    setModalBusy(true);
    setTimeout(() => {
      let providerName = "";
      let detailText = "";

      if (type === "Accounting") {
        providerName = accPlatform;
        detailText = accOrgName || "Primary Organization";
      } else if (type === "Bank Feeds") {
        providerName = bankName;
        detailText = bankAccNum ? `A/C •••• ${bankAccNum.slice(-4)}` : "Live Feed";
      } else if (type === "Payroll") {
        providerName = payrollProvider;
        detailText = `Cycle: ${payrollCycle}`;
      } else if (type === "GST Portal") {
        providerName = "GSTN Portal";
        detailText = gstin ? `GSTIN: ${gstin.toUpperCase()}` : "GSTR-1/3B Active";
      }

      const next = {
        ...connectors,
        [type]: {
          status: "CONNECTED" as const,
          provider: providerName,
          details: detailText,
          connectedAt: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
        },
      };

      saveConnectors(next);
      setModalBusy(false);
      setActiveModal(null);
    }, 400);
  };

  const handleDisconnect = (type: string) => {
    const next = {
      ...connectors,
      [type]: {
        status: "WAITING FOR SETUP" as const,
      },
    };
    saveConnectors(next);
  };

  const activeWarnings = useMemo(() => warnings.filter((w) => w.status !== "RESOLVED"), [warnings]);

  const criticalCount = activeWarnings.filter((w) => w.priority === "Critical").length;
  const highCount = activeWarnings.filter((w) => w.priority === "High").length;
  const penaltyRiskScore = criticalCount * 25 + highCount * 15;
  const cappedPenaltyRisk = Math.min(100, Math.max(0, penaltyRiskScore));
  const totalImpact = activeWarnings.reduce((acc, w) => acc + (w.impact || 0), 0);

  return (
    <SidebarShell>
      <LockedFeatureGate feature="predictive_tax_warning">
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
                <AlertTriangle className={`h-4 w-4 ${cappedPenaltyRisk > 50 ? "text-red-500" : "text-amber-500"}`} />
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
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                {tab === "risk-feed"
                  ? "Risk Feed"
                  : tab === "simulators"
                  ? "What-If Simulators"
                  : "Data Ingestion"}
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
                activeWarnings.map((warning) => (
                  <div key={warning.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              warning.priority === "Critical"
                                ? "bg-red-100 text-red-700"
                                : warning.priority === "High"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {warning.priority}
                          </span>
                          <span className="text-xs text-slate-400">Confidence: {warning.confidence}%</span>
                        </div>
                        <h3 className="mt-2 text-lg font-bold text-slate-800">{warning.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{warning.message}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Impact</p>
                        <p className="text-lg font-bold text-slate-800">
                          ₹{(warning.impact || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Why did this alert appear?
                      </p>
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
                        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          Snooze
                        </button>
                        <button className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                          Take Action
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "simulators" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* LEFT: SCENARIO BUILDER FORM */}
              <div className="col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800">What-If Scenario Builder</h3>
                <p className="text-xs text-slate-500">
                  Test business decisions to predict their tax and cashflow impact before executing them.
                </p>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Action Type</label>
                  <select
                    value={simType}
                    onChange={(e) => setSimType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="INVOICE">Invoice Timing</option>
                    <option value="EXPENSE">Expense Timing</option>
                    <option value="PURCHASE">Large Purchase</option>
                    <option value="PAYROLL">Hire Employees</option>
                    <option value="LOAN">Take a Loan</option>
                    <option value="PAYMENT">Payment Timing</option>
                    <option value="INVESTMENT">Investment Decision</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Estimated Amount (₹)</label>
                  <input
                    type="number"
                    value={simAmount}
                    onChange={(e) => {
                      setSimAmount(e.target.value);
                      if (simError) setSimError(null);
                    }}
                    placeholder="Enter amount (e.g. 200000)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  {simError && (
                    <p className="mt-1.5 text-xs font-medium text-rose-600">{simError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={simulating}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70 transition flex items-center justify-center gap-2"
                >
                  {simulating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Running Simulation...</span>
                    </>
                  ) : (
                    "Run Simulation"
                  )}
                </button>
              </div>

              {/* RIGHT: SIMULATION RESULTS */}
              <div className="col-span-1 lg:col-span-2">
                {simResult ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    {/* Header with Risk Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            Simulation Result
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-600">{simResult.actionName}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mt-1">
                          ₹{simResult.amount.toLocaleString("en-IN")}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border ${
                            simResult.riskLevel === "High"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : simResult.riskLevel === "Medium"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          Risk: {simResult.riskLevel}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          Confidence: {simResult.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* 3-Column Key Impact Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Estimated Tax Impact</p>
                        <p className="text-lg font-black text-indigo-900 mt-1">
                          ₹{simResult.taxImpact.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{simResult.taxImpactLabel}</p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Cash Flow Impact</p>
                        <p
                          className={`text-lg font-black mt-1 ${
                            simResult.cashFlowDirection === "inflow"
                              ? "text-emerald-600"
                              : simResult.cashFlowDirection === "outflow"
                              ? "text-rose-600"
                              : "text-slate-800"
                          }`}
                        >
                          {simResult.cashFlowDirection === "inflow" ? "+" : ""}₹{Math.abs(simResult.cashFlowImpact).toLocaleString("en-IN")}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {simResult.cashFlowDirection === "inflow" ? "Near-term cash inflow" : "Immediate cash outflow"}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Timing / Cycle</p>
                        <p className="text-xs font-semibold text-slate-800 mt-1 leading-snug">
                          {simResult.timingImpact}
                        </p>
                      </div>
                    </div>

                    {/* Scenario Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase">Scenario A (Status Quo)</p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{simResult.scenarioA.label}</p>
                        <p className="text-2xl font-black text-slate-900 mt-2">
                          ₹{simResult.scenarioA.value.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{simResult.scenarioA.subLabel}</p>
                      </div>

                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-indigo-500"></div>
                        <p className="text-xs font-bold text-indigo-500 uppercase">Scenario B (Simulated)</p>
                        <p className="text-sm font-semibold text-indigo-900 mt-1">{simResult.scenarioB.label}</p>
                        <p className="text-2xl font-black text-indigo-900 mt-2">
                          ₹{simResult.scenarioB.value.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-indigo-700/70 mt-1">{simResult.scenarioB.subLabel}</p>
                      </div>
                    </div>

                    {/* Explanatory & Recommendation Sections */}
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900 block mb-1">Predicted Outcome:</span>
                        {simResult.predictedOutcome}
                      </div>

                      <div className="rounded-lg bg-indigo-50/70 p-3.5 border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
                        <span className="font-bold text-indigo-900 block mb-1">Recommendation:</span>
                        {simResult.recommendation}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50 p-12 text-center h-full flex flex-col items-center justify-center">
                    <LineChartIcon className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 text-sm">
                      Select an action and run a simulation to see the projected tax and cashflow impact.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "data-ingestion" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg mb-2">Data Upload & Connectors</h3>
              <p className="text-sm text-slate-500 mb-8">
                The Predictive Tax Warning system requires high-quality data to improve its forecasting models. Connect your accounting and bank platforms or upload CSV files.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: "Accounting", icon: Building2 },
                  { name: "Bank Feeds", icon: Landmark },
                  { name: "Payroll", icon: Users },
                  { name: "GST Portal", icon: FileText },
                ].map(({ name, icon: IconComponent }) => {
                  const info = connectors[name] || { status: "WAITING FOR SETUP" };
                  const isConnected = info.status === "CONNECTED";

                  return (
                    <div
                      key={name}
                      className={`border rounded-xl p-5 flex flex-col items-center justify-between text-center gap-3 transition ${
                        isConnected
                          ? "border-emerald-200 bg-emerald-50/30 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`h-11 w-11 rounded-full flex items-center justify-center ${
                            isConnected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isConnected ? <Check className="h-5 w-5" /> : <IconComponent className="h-5 w-5" />}
                        </div>
                        <p className="font-bold text-sm text-slate-800">{name}</p>

                        {isConnected ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                              Connected
                            </span>
                            <p className="text-xs font-semibold text-slate-800 mt-1">{info.provider}</p>
                            {info.details && <p className="text-[11px] text-slate-500">{info.details}</p>}
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-slate-400">Waiting for setup</span>
                        )}
                      </div>

                      <div className="mt-2 w-full pt-2 border-t border-slate-100 flex items-center justify-center gap-2">
                        {isConnected ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveModal(name)}
                              className="text-xs text-indigo-600 font-semibold hover:underline"
                            >
                              Manage
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => handleDisconnect(name)}
                              className="text-xs text-rose-600 font-semibold hover:underline"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveModal(name)}
                            className="text-xs text-indigo-600 font-semibold hover:underline"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CONNECTOR SETUP MODAL */}
          {activeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl relative space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Connect {activeModal}</h3>
                    <p className="text-xs text-slate-500">Configure your direct integration parameters</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* MODAL BODY FOR ACCOUNTING */}
                {activeModal === "Accounting" && (
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Accounting Platform
                      </label>
                      <select
                        value={accPlatform}
                        onChange={(e) => setAccPlatform(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="Zoho Books">Zoho Books</option>
                        <option value="Tally Prime / ERP 9">Tally Prime / ERP 9</option>
                        <option value="QuickBooks Online">QuickBooks Online</option>
                        <option value="Xero">Xero</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Organization / Company Name
                      </label>
                      <input
                        type="text"
                        value={accOrgName}
                        onChange={(e) => setAccOrgName(e.target.value)}
                        placeholder="e.g. Acme Technologies India"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* MODAL BODY FOR BANK FEEDS */}
                {activeModal === "Bank Feeds" && (
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Select Corporate Bank
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="Other Corporate Bank">Other Corporate Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccNum}
                        onChange={(e) => setBankAccNum(e.target.value)}
                        placeholder="e.g. 50200098412345"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* MODAL BODY FOR PAYROLL */}
                {activeModal === "Payroll" && (
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Payroll Provider
                      </label>
                      <select
                        value={payrollProvider}
                        onChange={(e) => setPayrollProvider(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="RazorpayX Payroll">RazorpayX Payroll</option>
                        <option value="Keka HR">Keka HR</option>
                        <option value="Zoho Payroll">Zoho Payroll</option>
                        <option value="GreytHR">GreytHR</option>
                        <option value="Manual Salary Register">Manual Salary Register</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Monthly Salary Cycle
                      </label>
                      <select
                        value={payrollCycle}
                        onChange={(e) => setPayrollCycle(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="Last Day of Month">Last Day of Month</option>
                        <option value="1st of Month">1st of Month</option>
                        <option value="7th of Month">7th of Month</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* MODAL BODY FOR GST PORTAL */}
                {activeModal === "GST Portal" && (
                  <div className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        GSTIN (15-digit GST Identifier)
                      </label>
                      <input
                        type="text"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 36AABCU9603R1ZM"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        GST Portal Username
                      </label>
                      <input
                        type="text"
                        value={gstUsername}
                        onChange={(e) => setGstUsername(e.target.value)}
                        placeholder="e.g. tax_signatory"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConnectSubmit(activeModal)}
                    disabled={modalBusy}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-md flex items-center gap-1.5"
                  >
                    {modalBusy ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      "Authorize & Connect"
                    )}
                  </button>
                </div>
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
      </LockedFeatureGate>
    </SidebarShell>
  );
}
