export interface Plan {
  id: string;
  name: string;
  price: string;
  annualPrice: string;
  monthlyEquivalent: string;
  founderPrice?: string;
  audience: string;
  outcome: string;
  tagline: string;
  popular?: boolean;
  users: string;
  gstins: string;
  scannedBills: string;
  transactions: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "FREE",
    name: "Free",
    price: "₹0",
    annualPrice: "₹0",
    monthlyEquivalent: "₹0",
    audience: "Pre-revenue / testing",
    outcome: "Understand",
    tagline: "Know your financial health before committing.",
    users: "1 user",
    gstins: "1 GSTIN",
    scannedBills: "—",
    transactions: "100 / mo",
    features: [
      "Basic Business Health Score",
      "Basic expense tracking",
      "Limited WhatsApp bot",
      "1 user & 1 business",
      "100 transactions/month",
      "Basic dashboard",
      "Limited AI insights",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    price: "₹499",
    annualPrice: "₹4,999",
    monthlyEquivalent: "₹417",
    founderPrice: "₹399",
    audience: "Up to ₹40L turnover",
    outcome: "Automate",
    tagline: "Stop manually entering bills and transactions.",
    users: "2 users",
    gstins: "1 GSTIN",
    scannedBills: "50 / mo",
    transactions: "500 / mo",
    features: [
      "Everything in Free, plus:",
      "WhatsApp & Voice-note accounting",
      "Upload bills through photo",
      "Automatic transaction recording",
      "GST invoicing & Bank synchronization",
      "Basic reconciliation & Full BHS score",
      "Monthly Profit & Loss report",
      "50 scanned bills & 500 transactions/mo",
      "2 users & 1 GSTIN included",
      "Email support",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    price: "₹1,499",
    annualPrice: "₹14,999",
    monthlyEquivalent: "₹1,250",
    founderPrice: "₹1,199",
    audience: "₹40L – ₹2Cr turnover",
    outcome: "Predict",
    tagline: "Find leaks, forecast cash flow and get AI-powered business advice.",
    popular: true,
    users: "5 users",
    gstins: "3 GSTINs",
    scannedBills: "250 / mo",
    transactions: "2,000 / mo",
    features: [
      "Everything in Starter, plus:",
      "Financial Intelligence & Advanced BHS",
      "ProfitLeak Finder & Predictive Tax Warning",
      "90-day Cash Flow Predictor & Anomaly alerts",
      "Vendor risk scoring & Advanced insights",
      "AI Advisor / Virtual Business Director",
      "GST monitoring & Tax-risk alerts",
      "250 scanned bills & 2,000 transactions/mo",
      "5 users & 3 GSTINs included",
      "Payroll for up to 10 employees",
      "WhatsApp & Priority support",
    ],
  },
  {
    id: "SCALE",
    name: "Scale",
    price: "₹3,999",
    annualPrice: "₹39,999",
    monthlyEquivalent: "₹3,333",
    founderPrice: "₹2,999",
    audience: "₹2Cr – ₹15Cr turnover",
    outcome: "Control",
    tagline: "One financial command center across branches and companies.",
    users: "15 users",
    gstins: "10 GSTINs",
    scannedBills: "1,000 / mo",
    transactions: "10,000 / mo",
    features: [
      "Everything in Growth, plus:",
      "Multi-business intelligence & Multi-branch P&L",
      "Health Score per branch & Group Score",
      "Consolidated financial dashboard",
      "Department-level analysis",
      "Scenario Planning (revenue, loans, hiring)",
      "Emergency assistance for tax notices/disputes",
      "Dedicated account manager & Priority onboarding",
      "1,000 scanned bills & 10,000 transactions/mo",
      "15 users & 10 GSTINs included",
      "Unlimited payroll & API access",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    annualPrice: "Custom",
    monthlyEquivalent: "Custom",
    audience: "₹15Cr+ turnover",
    outcome: "Scale",
    tagline: "Build Vertofi around your organisation.",
    users: "Unlimited",
    gstins: "Unlimited",
    scannedBills: "Custom",
    transactions: "Unlimited",
    features: [
      "Everything in Scale, plus:",
      "Unlimited users, GSTINs & branches",
      "ERP, SAP & Oracle integrations",
      "Custom API integrations & SSO",
      "Role-based access & Enterprise audit logs",
      "Custom AI agents & Custom financial models",
      "White-labeling",
      "Dedicated onboarding, support & Custom SLA",
      "Custom security & Private deployment options",
    ],
  },
];

export interface PricingRow {
  plan: string;
  monthly: string;
  annual: string;
  annualEquivalent: string;
  turnover: string;
  users: string;
  gstins: string;
  outcome: string;
}

export const PRICING_TABLE: PricingRow[] = [
  { plan: "Free", monthly: "₹0", annual: "₹0", annualEquivalent: "₹0/mo", turnover: "Pre-revenue", users: "1", gstins: "1", outcome: "Understand" },
  { plan: "Starter", monthly: "₹499", annual: "₹4,999", annualEquivalent: "₹417/mo", turnover: "Up to ₹40L", users: "2", gstins: "1", outcome: "Automate" },
  { plan: "Growth ★", monthly: "₹1,499", annual: "₹14,999", annualEquivalent: "₹1,250/mo", turnover: "₹40L–₹2Cr", users: "5", gstins: "3", outcome: "Predict" },
  { plan: "Scale", monthly: "₹3,999", annual: "₹39,999", annualEquivalent: "₹3,333/mo", turnover: "₹2Cr–₹15Cr", users: "15", gstins: "10", outcome: "Control" },
  { plan: "Enterprise", monthly: "Custom", annual: "Custom", annualEquivalent: "Custom", turnover: "₹15Cr+", users: "Unlimited", gstins: "Unlimited", outcome: "Scale" },
];

export interface PlanLimits {
  id: string;
  name: string;
  price: string;
  annualPrice: string;
  outcome: string;
  tagline: string;
  maxUsers: number;
  maxGstins: number;
  scannedBills: number | string;
  transactions: number | string;
  canUseAiAdvisor: boolean;
  canUseProfitLeak: boolean;
  canUseScenarioPlanning: boolean;
  canUseMultiBranch: boolean;
  features: string[];
}

export function getPlanLimits(planId?: string | null): PlanLimits {
  const normalized = (planId || "FREE").toUpperCase();
  switch (normalized) {
    case "STARTER":
      return {
        id: "STARTER",
        name: "Starter",
        price: "₹499/mo",
        annualPrice: "₹4,999/yr",
        outcome: "Automate",
        tagline: "Automated bookkeeping for small businesses.",
        maxUsers: 2,
        maxGstins: 1,
        scannedBills: 50,
        transactions: 500,
        canUseAiAdvisor: false,
        canUseProfitLeak: false,
        canUseScenarioPlanning: false,
        canUseMultiBranch: false,
        features: [
          "WhatsApp accounting & Voice-note entry",
          "Photo bill upload & auto-recording",
          "GST invoicing & Bank synchronization",
          "Full Business Health Score",
          "Monthly Profit & Loss report",
          "Email support",
        ],
      };
    case "GROWTH":
      return {
        id: "GROWTH",
        name: "Growth",
        price: "₹1,499/mo",
        annualPrice: "₹14,999/yr",
        outcome: "Predict",
        tagline: "Catch financial problems before they cost you money.",
        maxUsers: 5,
        maxGstins: 3,
        scannedBills: 250,
        transactions: 2000,
        canUseAiAdvisor: true,
        canUseProfitLeak: true,
        canUseScenarioPlanning: false,
        canUseMultiBranch: false,
        features: [
          "Advanced Business Health Score",
          "ProfitLeak Finder & Predictive Tax Warning",
          "90-day Cash Flow Predictor",
          "Financial anomaly alerts & Vendor risk scoring",
          "AI Advisor / Virtual Business Director",
          "Payroll for up to 10 employees",
          "WhatsApp & Priority support",
        ],
      };
    case "SCALE":
    case "POWER":
      return {
        id: "SCALE",
        name: "Scale",
        price: "₹3,999/mo",
        annualPrice: "₹39,999/yr",
        outcome: "Control",
        tagline: "One financial command center for your entire business.",
        maxUsers: 15,
        maxGstins: 10,
        scannedBills: 1000,
        transactions: 10000,
        canUseAiAdvisor: true,
        canUseProfitLeak: true,
        canUseScenarioPlanning: true,
        canUseMultiBranch: true,
        features: [
          "Multi-business intelligence & Multi-branch P&L",
          "Health Score per branch & Combined Group Score",
          "Scenario Planning (revenue drop, loans, hiring)",
          "Department-level financial analysis",
          "Emergency assistance for tax notices/disputes",
          "Dedicated account manager & API access",
        ],
      };
    case "ENTERPRISE":
      return {
        id: "ENTERPRISE",
        name: "Enterprise",
        price: "Custom",
        annualPrice: "Custom",
        outcome: "Scale",
        tagline: "Vertofi built around your organisation.",
        maxUsers: 999999,
        maxGstins: 999999,
        scannedBills: "Unlimited",
        transactions: "Unlimited",
        canUseAiAdvisor: true,
        canUseProfitLeak: true,
        canUseScenarioPlanning: true,
        canUseMultiBranch: true,
        features: [
          "Unlimited users, GSTINs and branch entities",
          "ERP, SAP & Oracle custom integrations",
          "SSO, Role-based access & Enterprise audit logs",
          "Custom AI agents & Custom financial models",
          "Dedicated onboarding, SLA & Private deployments",
        ],
      };
    case "FREE":
    default:
      return {
        id: "FREE",
        name: "Free",
        price: "₹0/mo",
        annualPrice: "₹0/yr",
        outcome: "Understand",
        tagline: "See how healthy your business is.",
        maxUsers: 1,
        maxGstins: 1,
        scannedBills: 0,
        transactions: 100,
        canUseAiAdvisor: false,
        canUseProfitLeak: false,
        canUseScenarioPlanning: false,
        canUseMultiBranch: false,
        features: [
          "Basic Business Health Score (Score teaser)",
          "Basic expense tracking",
          "Limited WhatsApp bot",
          "1 User & 1 Business",
          "100 transactions/month",
          "Basic financial dashboard",
        ],
      };
  }
}

export interface TurnoverMapping {
  turnover: string;
  plan: string;
  outcome: string;
}

export const TURNOVER_MAPPING: TurnoverMapping[] = [
  { turnover: "Pre-revenue / testing", plan: "Free", outcome: "Understand" },
  { turnover: "Up to ₹40 lakh", plan: "Starter", outcome: "Automate" },
  { turnover: "₹40 lakh – ₹2 crore", plan: "Growth ★", outcome: "Predict" },
  { turnover: "₹2 crore – ₹15 crore", plan: "Scale", outcome: "Control" },
  { turnover: "₹15 crore+", plan: "Enterprise", outcome: "Scale" },
];

export interface AddOnItem {
  item: string;
  price: string;
}

export const ADD_ONS: AddOnItem[] = [
  { item: "Extra GSTIN / Business Entity", price: "₹299/month" },
  { item: "Extra User Seat", price: "₹149/month" },
  { item: "Extra 500 Scanned Bills", price: "₹299/month" },
  { item: "API Access (below Scale)", price: "₹999/month" },
  { item: "Payroll 11–25 Employees (on Growth)", price: "₹299/month" },
];

export type FeatureKey =
  | "basic_dashboard"
  | "basic_expense_tracking"
  | "basic_health_score"
  | "whatsapp_bot_limited"
  | "sales_invoicing"
  | "purchases"
  | "customers"
  | "products"
  | "inventory"
  | "photo_bill_scan"
  | "voice_accounting"
  | "bank_reconciliation"
  | "pnl_reports"
  | "einvoicing"
  | "ewaybill"
  | "full_bhs_score"
  | "team_accounts"
  | "profitleak_finder"
  | "predictive_tax_warning"
  | "cashflow_predictor_90d"
  | "ai_advisor"
  | "virtual_business_director"
  | "whatsapp_cfo"
  | "moneymap_live"
  | "financial_blackbox"
  | "vendor_trust"
  | "business_lifeguard"
  | "accounting_warranty"
  | "benchmarks"
  | "payroll"
  | "scenario_planning"
  | "multibranch_pnl"
  | "department_analysis"
  | "consolidated_dashboard"
  | "tax_notice_assistance"
  | "erp_integration";

export type PlanTier = "FREE" | "STARTER" | "GROWTH" | "SCALE" | "POWER" | "ENTERPRISE";

export const PLAN_TIER_RANK: Record<PlanTier, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  SCALE: 3,
  POWER: 3,
  ENTERPRISE: 4,
};

export interface FeatureGateConfig {
  key: FeatureKey;
  label: string;
  minPlan: "FREE" | "STARTER" | "GROWTH" | "SCALE" | "ENTERPRISE";
  headline: string;
  description: string;
  outcomeNeeded: string;
  bulletPoints: string[];
}

export const FEATURE_GATES: Record<FeatureKey, FeatureGateConfig> = {
  basic_dashboard: {
    key: "basic_dashboard",
    label: "Basic Dashboard",
    minPlan: "FREE",
    headline: "Overview Dashboard",
    description: "Included in all plans.",
    outcomeNeeded: "Understand",
    bulletPoints: ["Basic revenue & expense tracking", "Health score overview"],
  },
  basic_expense_tracking: {
    key: "basic_expense_tracking",
    label: "Basic Expense Tracking",
    minPlan: "FREE",
    headline: "Basic Expenses",
    description: "Track day-to-day business operational expenses up to 100 txns/mo.",
    outcomeNeeded: "Understand",
    bulletPoints: ["Manual expense logging", "Category expense breakdown"],
  },
  basic_health_score: {
    key: "basic_health_score",
    label: "Basic Business Health Score",
    minPlan: "FREE",
    headline: "Business Health Score Teaser",
    description: "See how healthy your business is. Shows your baseline score (e.g. 64).",
    outcomeNeeded: "Understand",
    bulletPoints: ["BHS baseline score index", "Curiosity risk indicators"],
  },
  whatsapp_bot_limited: {
    key: "whatsapp_bot_limited",
    label: "Limited WhatsApp Bot",
    minPlan: "FREE",
    headline: "WhatsApp Alerts",
    description: "Receive critical balance and filing reminders on WhatsApp.",
    outcomeNeeded: "Understand",
    bulletPoints: ["Basic balance summaries", "Filing alerts"],
  },
  sales_invoicing: {
    key: "sales_invoicing",
    label: "GST Invoicing & Sales",
    minPlan: "STARTER",
    headline: "Automated GST Invoicing",
    description: "Generate compliant GST tax invoices, manage proforma invoices, credit notes & delivery challans.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "GST-compliant invoice generation with QR & tax splits",
      "Proforma invoices, credit notes & advance receipts",
      "Automatic ledger entries for every invoice",
      "Up to 500 transactions/month included",
    ],
  },
  purchases: {
    key: "purchases",
    label: "Purchase & Vendor Orders",
    minPlan: "STARTER",
    headline: "Automated Purchase Management",
    description: "Record bills, purchase orders and debit notes with automatic vendor reconciliation.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Vendor bill entry & purchase order tracking",
      "Debit notes & automated vendor ledgers",
      "Input tax credit (ITC) matching",
    ],
  },
  customers: {
    key: "customers",
    label: "Customer Directory & CRM",
    minPlan: "STARTER",
    headline: "Customer Accounts & Ledger",
    description: "Manage customer GSTIN records, outstanding aging reports and payment reminders.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Customer master with GSTIN verification",
      "Payment terms & outstanding balance tracking",
      "Direct WhatsApp invoice sharing",
    ],
  },
  products: {
    key: "products",
    label: "Product Catalog & Pricing",
    minPlan: "STARTER",
    headline: "Product Master & HSN Mapping",
    description: "Maintain products, SAC/HSN codes, pricing tiers and tax slabs.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "HSN/SAC directory with GST rates",
      "Custom product categories & pricing",
      "Multi-unit support (pcs, kgs, boxes)",
    ],
  },
  inventory: {
    key: "inventory",
    label: "Stock & Inventory Control",
    minPlan: "STARTER",
    headline: "Real-time Stock Tracking",
    description: "Automatic stock log updates on sales and purchases with low-stock warnings.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Auto-deduct stock on invoice creation",
      "Stock-in and stock-out audit logs",
      "Inventory re-order alerts",
    ],
  },
  photo_bill_scan: {
    key: "photo_bill_scan",
    label: "Photo Bill Scanning & OCR",
    minPlan: "STARTER",
    headline: "Upload Bills Through Photo",
    description: "Snap a photo of any vendor bill or receipt. AI extracts vendor, items, GST and amount automatically.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Upload bills via photo or PDF",
      "Automatic vendor, line-item & tax extraction",
      "50 scanned bills/mo on Starter, 250/mo on Growth",
    ],
  },
  voice_accounting: {
    key: "voice_accounting",
    label: "Voice-Note Accounting",
    minPlan: "STARTER",
    headline: "Voice-Note Transaction Entry",
    description: "Speak your expense or sale in Hindi, Telugu, Tamil or English. Vertofi parses and files the ledger entry.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Speak expenses in natural regional language",
      "Instant entity and amount recognition",
      "Zero manual typing required",
    ],
  },
  bank_reconciliation: {
    key: "bank_reconciliation",
    label: "Bank Synchronization & Reconciliation",
    minPlan: "STARTER",
    headline: "Automated Bank Reconciliation",
    description: "Sync bank statements, match transactions against invoices and detect missing entries automatically.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Bank statement import & real-time sync",
      "Automated one-click transaction reconciliation",
      "Identify unreconciled deposits and payments",
    ],
  },
  pnl_reports: {
    key: "pnl_reports",
    label: "Monthly Profit & Loss Reports",
    minPlan: "STARTER",
    headline: "Official Financial Statements",
    description: "Generate CA-ready Monthly Profit & Loss statements, Balance Sheets and Cash Flow summaries.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Monthly Profit & Loss (P&L) statement",
      "Balance sheet and ledger export",
      "Download in Excel and PDF formats",
    ],
  },
  einvoicing: {
    key: "einvoicing",
    label: "E-Invoicing (IRN) Direct Sync",
    minPlan: "STARTER",
    headline: "Government E-Invoicing (IRN)",
    description: "Direct real-time generation of Invoice Reference Number (IRN) and QR code via IRP portal.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "1-click IRN generation and QR code embedding",
      "Direct compliance with GST e-invoice mandate",
      "Instant cancellation and error logs",
    ],
  },
  ewaybill: {
    key: "ewaybill",
    label: "E-Way Bills Management",
    minPlan: "STARTER",
    headline: "E-Way Bill Automation",
    description: "Generate and manage Part-A & Part-B e-Way bills with transporter integration.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Direct NIC e-Way bill portal generation",
      "Transporter master and vehicle update log",
      "Print, track and cancel e-Way bills",
    ],
  },
  full_bhs_score: {
    key: "full_bhs_score",
    label: "Full Business Health Score Breakdown",
    minPlan: "STARTER",
    headline: "Full Business Health Score Analysis",
    description: "Unlock full visibility into why your score changed with granular breakdown of liquidity, margins and compliance.",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    bulletPoints: [
      "Complete 5-pillar health score breakdown",
      "Working capital & liquidity ratios",
      "Benchmark against standard industry ratios",
    ],
  },
  team_accounts: {
    key: "team_accounts",
    label: "Multi-User Team Accounts",
    minPlan: "STARTER",
    headline: "Team Members & Role Access",
    description: "Invite your accountant, bookkeeper or sales manager. (Free: 1 user, Starter: 2 users, Growth: 5 users, Scale: 15 users).",
    outcomeNeeded: "Automate (Starter — 2 Users)",
    bulletPoints: [
      "Role-based access (Owner, Accountant, Manager, Viewer)",
      "Granular module permissions",
      "Starter includes 2 users; Growth includes 5 users",
    ],
  },
  profitleak_finder: {
    key: "profitleak_finder",
    label: "ProfitLeak Finder",
    minPlan: "GROWTH",
    headline: "Catch Profit Leaks Before They Cost You Money",
    description: "AI scans vendor price creeps, redundant subscriptions, missing input tax credits, and payment penalties.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: [
      "Find silent vendor price hikes across invoices",
      "Detect unclaimed GST ITC before 30-day expiry",
      "Flag recurring penalty and interest leakages",
      "Estimated ₹1.42L typical MSME leak recovery",
    ],
  },
  predictive_tax_warning: {
    key: "predictive_tax_warning",
    label: "Predictive Tax Warning",
    minPlan: "GROWTH",
    headline: "Proactive Tax & Compliance Defense",
    description: "Predict tax liabilities and cash needs 15-30 days before filing deadlines to avoid cash crunches.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: [
      "Advance projection of GSTR-3B tax payable",
      "Advance tax computation before quarterly deadlines",
      "Alerts for reverse charge mechanism (RCM) liabilities",
    ],
  },
  cashflow_predictor_90d: {
    key: "cashflow_predictor_90d",
    label: "90-Day Cash Flow Predictor",
    minPlan: "GROWTH",
    headline: "90-Day Predictive Cash Flow Forecast",
    description: "AI forecasts daily bank balances based on expected customer receivables, supplier dues and payroll.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: [
      "90-day trajectory of available bank cash",
      "Predict exact deficit dates before they hit",
      "Debtor default probability scoring",
    ],
  },
  ai_advisor: {
    key: "ai_advisor",
    label: "AI Advisor / Virtual Business Director",
    minPlan: "GROWTH",
    headline: "Your Virtual CFO & Strategic Director",
    description: "Ask strategic questions using your real financial data: 'Can I afford to hire another employee?', 'Can I take a ₹10L loan?'",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: [
      "Real-time CFO guidance trained on your financial data",
      "Loan affordability and debt service ratio check",
      "Hiring & payroll feasibility simulations",
      "Instant answers on WhatsApp & web",
    ],
  },
  virtual_business_director: {
    key: "virtual_business_director",
    label: "Virtual Business Director",
    minPlan: "GROWTH",
    headline: "AI Strategic Director",
    description: "Real-time decision intelligence engine for SME founders.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Continuous business monitoring", "Autonomous risk recommendations"],
  },
  whatsapp_cfo: {
    key: "whatsapp_cfo",
    label: "WhatsApp CFO",
    minPlan: "GROWTH",
    headline: "WhatsApp Executive Assistant",
    description: "Ask your financial assistant questions on WhatsApp 24/7.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Ask cash balance, outstanding & tax on WhatsApp", "Instant voice memo queries"],
  },
  moneymap_live: {
    key: "moneymap_live",
    label: "MoneyMap Live",
    minPlan: "GROWTH",
    headline: "Real-time Cash Trajectory",
    description: "Interactive visual flow of every rupee moving through your business.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Live liquidity visualization", "Working capital burn tracking"],
  },
  financial_blackbox: {
    key: "financial_blackbox",
    label: "Financial Black Box & Audit Trail",
    minPlan: "GROWTH",
    headline: "Cryptographic Tamper-Proof Audit Trail",
    description: "Immutable hash chain of every transaction, bill modification and user action.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Cryptographic verification of accounting integrity", "Audit logs ready for banks and investors"],
  },
  vendor_trust: {
    key: "vendor_trust",
    label: "Vendor Risk Scoring",
    minPlan: "GROWTH",
    headline: "Vendor Risk & Reliability Scoring",
    description: "Score suppliers based on GST compliance, delivery delay patterns and price volatility.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Supplier risk ratings", "Flag vendors with suspended GSTINs"],
  },
  business_lifeguard: {
    key: "business_lifeguard",
    label: "Business Lifeguard",
    minPlan: "GROWTH",
    headline: "Automated Early Warning Radar",
    description: "Autonomous sentinel monitoring margin degradation and insolvency risk.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["24/7 autonomous monitoring", "Emergency liquidity preservation alerts"],
  },
  accounting_warranty: {
    key: "accounting_warranty",
    label: "Accounting Warranty",
    minPlan: "GROWTH",
    headline: "Filing Accuracy Guarantee",
    description: "Continuous automated audits ensuring books are ready for statutory filing.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Automated compliance checks", "Reconciliation safety guarantee"],
  },
  benchmarks: {
    key: "benchmarks",
    label: "Industry Benchmarks",
    minPlan: "GROWTH",
    headline: "Peer Industry Benchmarks",
    description: "Compare your margins, DSO and debtor cycles against top performers in your sector.",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Sector margin benchmarks", "Collection cycle comparisons"],
  },
  payroll: {
    key: "payroll",
    label: "Payroll Management",
    minPlan: "GROWTH",
    headline: "Automated Payroll & Salary Disbursement",
    description: "Manage employee salaries, PF/ESI deductions and direct payouts (up to 10 on Growth, unlimited on Scale).",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    bulletPoints: ["Up to 10 employees on Growth, unlimited on Scale", "Automated pay slips & TDS computation"],
  },
  scenario_planning: {
    key: "scenario_planning",
    label: "Scenario Planning Simulator",
    minPlan: "SCALE",
    headline: "One Financial Command Center",
    description: "Simulate what happens if revenue falls 20%, salary costs rise 15%, a new branch opens, or a ₹50L loan is taken.",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    bulletPoints: [
      "Revenue shock modeling (-20%, -30%)",
      "Hiring expansion impact (hire 10-20 staff)",
      "New branch or warehouse capital requirements",
      "Loan debt-service & runway stress test",
    ],
  },
  multibranch_pnl: {
    key: "multibranch_pnl",
    label: "Multi-Branch & Multi-Entity P&L",
    minPlan: "SCALE",
    headline: "Multi-Location Financial Command",
    description: "Consolidated P&L and Health Score for each branch or subsidiary company.",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    bulletPoints: [
      "Individual branch P&L and balance sheets",
      "Combined Group Business Health Score",
      "Inter-branch transfer reconciliation",
    ],
  },
  department_analysis: {
    key: "department_analysis",
    label: "Department-Level Financial Analysis",
    minPlan: "SCALE",
    headline: "Cost Center & Department Intelligence",
    description: "Granular cost-center tracking across sales, ops, marketing and R&D.",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    bulletPoints: ["Department-wise budget vs actual", "Cost-center profitability mapping"],
  },
  consolidated_dashboard: {
    key: "consolidated_dashboard",
    label: "Consolidated Financial Dashboard",
    minPlan: "SCALE",
    headline: "Group Command Center",
    description: "Unified command center for owners operating multiple entities or GSTINs.",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    bulletPoints: ["Multi-entity aggregation", "Cross-GSTIN cash management"],
  },
  tax_notice_assistance: {
    key: "tax_notice_assistance",
    label: "Emergency Tax Notice Assistance",
    minPlan: "SCALE",
    headline: "Priority Notice Resolution",
    description: "Dedicated account manager and CA assistance for GST notices and audits.",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    bulletPoints: ["Direct CA assistance on notices", "Priority onboarding & dedicated account manager"],
  },
  erp_integration: {
    key: "erp_integration",
    label: "Custom ERP, SAP & Oracle Integrations",
    minPlan: "ENTERPRISE",
    headline: "Enterprise Systems Integration",
    description: "Seamless bi-directional integration with SAP, Oracle, NetSuite and legacy ERPs.",
    outcomeNeeded: "Scale (Enterprise — Custom)",
    bulletPoints: [
      "SAP, Oracle, Microsoft Dynamics connectors",
      "Single Sign-On (SSO) & SAML 2.0",
      "Role-based access & enterprise audit logs",
      "Dedicated SLA & private cloud deployment",
    ],
  },
};

export function normalizePlan(planId?: string | null): PlanTier {
  if (!planId) return "FREE";
  const p = planId.toUpperCase().trim();
  if (p in PLAN_TIER_RANK) return p as PlanTier;
  if (p.includes("ENTERPRISE")) return "ENTERPRISE";
  if (p.includes("SCALE") || p.includes("POWER")) return "SCALE";
  if (p.includes("GROWTH")) return "GROWTH";
  if (p.includes("STARTER")) return "STARTER";
  return "FREE";
}

export function isFeatureLocked(featureKey: FeatureKey, currentPlan?: string | null): boolean {
  const config = FEATURE_GATES[featureKey];
  if (!config) return false;
  const userTier = normalizePlan(currentPlan);
  const userRank = PLAN_TIER_RANK[userTier] ?? 0;
  const requiredRank = PLAN_TIER_RANK[config.minPlan] ?? 0;
  return userRank < requiredRank;
}

export function getFeatureGateInfo(featureKey: FeatureKey): FeatureGateConfig {
  return (
    FEATURE_GATES[featureKey] || {
      key: featureKey,
      label: "Feature",
      minPlan: "STARTER",
      headline: "Feature Requires Upgrade",
      description: "Upgrade your plan to unlock this capability.",
      outcomeNeeded: "Automate",
      bulletPoints: [],
    }
  );
}

export function isGowthamUser(customText?: string | null): boolean {
  if (customText) {
    const lower = String(customText).toLowerCase();
    if (
      lower.includes("gouthambadiga") ||
      lower.includes("gowthambadiga") ||
      lower.includes("goutham") ||
      lower.includes("gowtham") ||
      lower.includes("badiga")
    ) {
      return true;
    }
  }
  if (typeof window === "undefined") return false;
  try {
    const userEmail = (localStorage.getItem("vertofi_user_email") || "").toLowerCase();
    const userName = (localStorage.getItem("vertofi_user_name") || "").toLowerCase();
    const bizRaw = (localStorage.getItem("vertofi_business_profile") || "").toLowerCase();
    const orgId = (localStorage.getItem("vertofi.orgId") || "").toLowerCase();
    const all = `${userEmail} ${userName} ${bizRaw} ${orgId}`;
    return (
      all.includes("gouthambadiga") ||
      all.includes("gowthambadiga") ||
      all.includes("goutham") ||
      all.includes("gowtham") ||
      all.includes("badiga")
    );
  } catch {
    return false;
  }
}

export function getUserActivePlan(): PlanTier {
  if (typeof window === "undefined") return "FREE";
  try {
    const stored = localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan");
    if (stored) return normalizePlan(stored);
    const profileRaw = localStorage.getItem("vertofi_business_profile");
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      if (p.plan) return normalizePlan(p.plan);
    }
  } catch {}
  if (isGowthamUser()) return "ENTERPRISE";
  return "FREE";
}

export function getRecommendedPlanByTurnover(turnover?: string): PlanTier {
  if (!turnover) return "FREE";
  const t = turnover.toUpperCase();
  if (t.includes("15CR") || t.includes("15_CRORE") || t.includes("15 CR") || t.includes("5CR_PLUS") || t.includes("15CR_PLUS")) return "ENTERPRISE";
  if (t.includes("2CR_15CR") || t.includes("2CR") || t.includes("2_15") || t.includes("SCALE")) return "SCALE";
  if (t.includes("40L_2CR") || t.includes("40L_1_5CR") || t.includes("40L") || t.includes("GROWTH")) return "GROWTH";
  if (t.includes("UP_TO_40L") || t.includes("UNDER_40L") || t.includes("STARTER") || t.includes("UNDER_5L") || t.includes("5L_25L")) return "STARTER";
  return "FREE";
}

export function setPlanForTesting(planTier: PlanTier): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("vertofi.plan", planTier);
  localStorage.setItem("vertofi_user_plan", planTier);
  window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: planTier } }));
  window.dispatchEvent(new Event("storage"));
}
