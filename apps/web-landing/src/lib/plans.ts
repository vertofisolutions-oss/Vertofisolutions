// Centralized Plan Access, Pricing, Entitlements & Usage Limits System
// Single Source of Truth matching "Vertofi Final Pricing & Plans"

export type PlanTier = "FREE" | "STARTER" | "GROWTH" | "SCALE" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled";

export interface PlanLimitConfig {
  maxUsers: number;
  maxGstins: number;
  maxBusinesses: number;
  maxTransactions: number;
  maxScannedBills: number;
  maxPayrollEmployees: number; // 0 on Starter, 10 on Growth, Infinity on Scale
  hasApiAccess: boolean;
  hasMultiBranch: boolean;
  hasMultiBusiness: boolean;
  hasDedicatedManager: boolean;
  hasErpIntegration: boolean;
}

export type PlanLimits = PlanLimitConfig;

export interface Plan {
  id: PlanTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  priceDisplay: string;
  price?: string;
  annualPriceDisplay: string;
  monthlyEquivalentDisplay: string;
  founderPrice?: number;
  founderPriceDisplay?: string;
  audience: string;
  turnoverGuidance: string;
  outcome: string;
  positioning: string;
  tagline: string;
  popular?: boolean;
  users: string;
  gstins: string;
  businesses: string;
  scannedBills: string;
  transactions: string;
  features: string[];
  limits: PlanLimitConfig;
}

export const PLANS: Plan[] = [
  {
    id: "FREE",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceDisplay: "₹0",
    annualPriceDisplay: "₹0",
    monthlyEquivalentDisplay: "₹0",
    audience: "Pre-revenue / testing",
    turnoverGuidance: "Pre-revenue / testing",
    outcome: "Understand",
    positioning: "Understand",
    tagline: "For businesses starting with financial visibility.",
    users: "1 user",
    gstins: "1 GSTIN",
    businesses: "1 business",
    scannedBills: "—",
    transactions: "100 / month",
    features: [
      "Basic Business Health Score",
      "Basic expense tracking",
      "Limited WhatsApp accounting bot",
      "Basic dashboard",
      "Limited AI insights",
      "1 user • 1 business • 100 transactions/month",
    ],
    limits: {
      maxUsers: 1,
      maxGstins: 1,
      maxBusinesses: 1,
      maxTransactions: 100,
      maxScannedBills: 0,
      maxPayrollEmployees: 0,
      hasApiAccess: false,
      hasMultiBranch: false,
      hasMultiBusiness: false,
      hasDedicatedManager: false,
      hasErpIntegration: false,
    },
  },
  {
    id: "STARTER",
    name: "Starter",
    monthlyPrice: 499,
    yearlyPrice: 4999,
    priceDisplay: "₹499",
    annualPriceDisplay: "₹4,999",
    monthlyEquivalentDisplay: "₹417",
    founderPrice: 399,
    founderPriceDisplay: "₹399",
    audience: "Up to ₹40 lakh turnover",
    turnoverGuidance: "Up to ₹40 lakh",
    outcome: "Automate",
    positioning: "Automate",
    tagline: "For businesses ready to automate routine accounting.",
    users: "2 users",
    gstins: "1 GSTIN",
    businesses: "1 business",
    scannedBills: "50 / month",
    transactions: "500 / month",
    features: [
      "Everything in Free",
      "WhatsApp Micro Accounting",
      "Photo bill capture (50 scanned bills/mo)",
      "Voice-note accounting",
      "Automatic transaction recording",
      "GST invoicing & Bank sync",
      "Basic reconciliation",
      "Full Business Financial Health Score",
      "Monthly Profit & Loss (P&L)",
      "500 transactions/month",
      "2 users • 1 business • 1 GSTIN",
      "Email support",
    ],
    limits: {
      maxUsers: 2,
      maxGstins: 1,
      maxBusinesses: 1,
      maxTransactions: 500,
      maxScannedBills: 50,
      maxPayrollEmployees: 0,
      hasApiAccess: false,
      hasMultiBranch: false,
      hasMultiBusiness: false,
      hasDedicatedManager: false,
      hasErpIntegration: false,
    },
  },
  {
    id: "GROWTH",
    name: "Growth",
    monthlyPrice: 1499,
    yearlyPrice: 14999,
    priceDisplay: "₹1,499",
    annualPriceDisplay: "₹14,999",
    monthlyEquivalentDisplay: "₹1,250",
    founderPrice: 1199,
    founderPriceDisplay: "₹1,199",
    popular: true,
    audience: "₹40 lakh – ₹2 crore turnover",
    turnoverGuidance: "₹40 lakh – ₹2 crore",
    outcome: "Predict",
    positioning: "Predict",
    tagline: "For growing businesses that need prediction, monitoring and AI decision support.",
    users: "5 users",
    gstins: "Up to 3 GSTINs",
    businesses: "Configurable",
    scannedBills: "250 / month",
    transactions: "2,000 / month",
    features: [
      "Everything in Starter",
      "Advanced Business Health Score",
      "ProfitLeak Finder",
      "Predictive Tax Warning / TaxShield AI",
      "90-day Cash Flow Predictor",
      "Financial anomaly alerts",
      "Vendor Risk / Vendor Trust intelligence",
      "Advanced business insights",
      "AI Financial Advisor / Virtual Business Director",
      "GST monitoring & Tax-risk alerts",
      "Compliance reminders & GST reconciliation alerts",
      "250 scanned bills/month • 2,000 transactions/month",
      "5 users • up to 3 GSTINs",
      "Payroll for up to 10 employees",
      "WhatsApp + priority support",
    ],
    limits: {
      maxUsers: 5,
      maxGstins: 3,
      maxBusinesses: 1,
      maxTransactions: 2000,
      maxScannedBills: 250,
      maxPayrollEmployees: 10,
      hasApiAccess: false,
      hasMultiBranch: false,
      hasMultiBusiness: false,
      hasDedicatedManager: false,
      hasErpIntegration: false,
    },
  },
  {
    id: "SCALE",
    name: "Scale",
    monthlyPrice: 3999,
    yearlyPrice: 39999,
    priceDisplay: "₹3,999",
    annualPriceDisplay: "₹39,999",
    monthlyEquivalentDisplay: "₹3,333",
    founderPrice: 2999,
    founderPriceDisplay: "₹2,999",
    audience: "₹2 crore – ₹15 crore turnover",
    turnoverGuidance: "₹2 crore – ₹15 crore",
    outcome: "Control",
    positioning: "Control",
    tagline: "For multi-branch and multi-business operations.",
    users: "15 users",
    gstins: "Up to 10 GSTINs",
    businesses: "Multi-business",
    scannedBills: "1,000 / month",
    transactions: "10,000 / month",
    features: [
      "Everything in Growth",
      "Financial Health Score per branch",
      "Combined Group Health Score",
      "Consolidated financial dashboard",
      "Multi-branch P&L & Department analysis",
      "Advanced Vendor Intelligence",
      "Scenario Planning (revenue, salary, loan, branch)",
      "Emergency assistance for tax notices/disputes",
      "Advanced compliance alerts",
      "Dedicated Account Manager & Priority onboarding",
      "1,000 scanned bills/month • 10,000 transactions/month",
      "15 users • up to 10 GSTINs",
      "Unlimited payroll",
      "API access",
    ],
    limits: {
      maxUsers: 15,
      maxGstins: 10,
      maxBusinesses: 10,
      maxTransactions: 10000,
      maxScannedBills: 1000,
      maxPayrollEmployees: 999999,
      hasApiAccess: true,
      hasMultiBranch: true,
      hasMultiBusiness: true,
      hasDedicatedManager: true,
      hasErpIntegration: false,
    },
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: -1,
    yearlyPrice: -1,
    priceDisplay: "Custom",
    annualPriceDisplay: "Custom",
    monthlyEquivalentDisplay: "Custom",
    audience: "₹15 crore+ turnover",
    turnoverGuidance: "₹15 crore+",
    outcome: "Scale / Command",
    positioning: "Scale / Command",
    tagline: "For larger organizations needing customized controls, integrations and deployment.",
    users: "Unlimited",
    gstins: "Unlimited",
    businesses: "Unlimited",
    scannedBills: "Custom / Unlimited",
    transactions: "Unlimited",
    features: [
      "Everything in Scale",
      "Unlimited users, GSTINs and branches",
      "ERP integrations (SAP / Oracle / NetSuite)",
      "Custom API integration",
      "SSO & SAML 2.0",
      "Role-based access control (RBAC)",
      "Enterprise audit logs & cryptographic verification",
      "Custom AI agents & Custom financial models",
      "White-labeling",
      "Dedicated onboarding, support & Custom SLA",
      "Custom security requirements & Private deployment options",
    ],
    limits: {
      maxUsers: 999999,
      maxGstins: 999999,
      maxBusinesses: 999999,
      maxTransactions: 999999,
      maxScannedBills: 999999,
      maxPayrollEmployees: 999999,
      hasApiAccess: true,
      hasMultiBranch: true,
      hasMultiBusiness: true,
      hasDedicatedManager: true,
      hasErpIntegration: true,
    },
  },
];

export interface AddOn {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  period: "month" | "one-time" | "custom";
  description: string;
  category: "capacity" | "features" | "services";
}

export const ADD_ONS: AddOn[] = [
  {
    id: "extra_gstin",
    name: "Extra GSTIN / Business",
    price: "₹299/month",
    priceNum: 299,
    period: "month",
    description: "Add an extra GSTIN entity or separate legal business under your account.",
    category: "capacity",
  },
  {
    id: "extra_user",
    name: "Extra User",
    price: "₹149/month",
    priceNum: 149,
    period: "month",
    description: "Invite an additional team member, accountant or manager seat.",
    category: "capacity",
  },
  {
    id: "extra_scanned_bills",
    name: "Extra 500 Scanned Bills",
    price: "₹299/month",
    priceNum: 299,
    period: "month",
    description: "Expand AI OCR extraction by 500 additional bills and receipts each month.",
    category: "capacity",
  },
  {
    id: "api_access_below_scale",
    name: "API Access below Scale",
    price: "₹999/month",
    priceNum: 999,
    period: "month",
    description: "Direct REST API and webhook integration capabilities on Starter or Growth plans.",
    category: "features",
  },
  {
    id: "growth_payroll_expanded",
    name: "Growth Payroll: 11–25 employees",
    price: "₹299/month",
    priceNum: 299,
    period: "month",
    description: "Expand Growth plan payroll capacity from 10 up to 25 employees.",
    category: "capacity",
  },
  {
    id: "extra_transactions",
    name: "Additional 2,500 transactions",
    price: "₹499/month",
    priceNum: 499,
    period: "month",
    description: "Increase monthly transaction throughput by 2,500 entries.",
    category: "capacity",
  },
  {
    id: "advanced_ai_advisor",
    name: "Advanced AI Advisor",
    price: "₹499–₹999/month",
    priceNum: 499,
    period: "month",
    description: "Deep-domain CFO agent tuning with customized prompt engineering and simulations.",
    category: "features",
  },
  {
    id: "additional_branch",
    name: "Additional Branch",
    price: "₹299–₹499/month",
    priceNum: 299,
    period: "month",
    description: "Add an operational branch location with independent P&L tracking.",
    category: "capacity",
  },
  {
    id: "industry_benchmarks_addon",
    name: "Industry Benchmarks Add-On",
    price: "₹499/month",
    priceNum: 499,
    period: "month",
    description: "Unlock sector and peer percentile comparisons, margins and working capital benchmarks.",
    category: "features",
  },
  {
    id: "premium_onboarding",
    name: "Premium Onboarding",
    price: "₹2,999 one-time",
    priceNum: 2999,
    period: "one-time",
    description: "Assisted setup, bank sync, chart of accounts mapping and 1-on-1 team training.",
    category: "services",
  },
  {
    id: "historical_migration",
    name: "Historical Data Migration",
    price: "Custom",
    priceNum: 0,
    period: "custom",
    description: "Complete migration from Tally, Zoho, QuickBooks, Busy or legacy databases.",
    category: "services",
  },
  {
    id: "finance_specialist",
    name: "Dedicated Finance Specialist",
    price: "Custom",
    priceNum: 0,
    period: "custom",
    description: "Dedicated fractional finance controller to review books, GST and monthly closes.",
    category: "services",
  },
];

export interface SpecialistProduct {
  id: string;
  name: string;
  price: string;
  included: string;
  category: "accountant" | "warranty" | "wellness";
}

export const SPECIALIST_PRODUCTS: SpecialistProduct[] = [
  {
    id: "on_demand_accountant",
    name: "On-Demand Accountant",
    price: "₹199 / 10 minutes",
    included: "GST, Income Tax, TDS, accounting, payroll, compliance and document checking; extensions in ₹199/10-minute blocks.",
    category: "accountant",
  },
  {
    id: "fastlane_pass",
    name: "Fastlane Pass",
    price: "₹499/month",
    included: "3 free 10-minute On-Demand Accountant sessions/month + priority dispatch queue.",
    category: "accountant",
  },
  {
    id: "warranty_standard",
    name: "Accounting Warranty+ Standard",
    price: "₹999/month",
    included: "Warranty/protection layer subject to eligibility, terms, limits and exclusions.",
    category: "warranty",
  },
  {
    id: "warranty_pro",
    name: "Accounting Warranty+ Pro",
    price: "₹1,999/month",
    included: "Higher Warranty+ tier with expanded claim coverage, subject to applicable terms.",
    category: "warranty",
  },
  {
    id: "warranty_elite",
    name: "Accounting Warranty+ Elite",
    price: "₹3,999/month",
    included: "Highest Warranty+ tier for high-volume transactions, subject to applicable terms.",
    category: "warranty",
  },
  {
    id: "wellness_entry",
    name: "Financial Wellness — Entry",
    price: "₹999/month",
    included: "Financial discipline, tax coaching and financial fitness support.",
    category: "wellness",
  },
  {
    id: "wellness_pro",
    name: "Financial Wellness — Professional",
    price: "₹2,499/month",
    included: "Expanded financial wellness, advisory reviews and monthly coaching.",
    category: "wellness",
  },
  {
    id: "wellness_certified",
    name: "Financial Wellness — Certified",
    price: "₹6,999 / 3 months",
    included: "Structured certification-oriented program for founders and management.",
    category: "wellness",
  },
  {
    id: "wellness_elite",
    name: "Financial Wellness — Elite",
    price: "₹11,999 / 6 months",
    included: "Extended premium financial wellness program with personalized CFO mentorship.",
    category: "wellness",
  },
];

export interface CaPartnerTier {
  range: string;
  fee: string;
}

export const CA_PARTNER_TIERS: CaPartnerTier[] = [
  { range: "1–5 active clients", fee: "Free" },
  { range: "6–25 active clients", fee: "₹1,999/month" },
  { range: "26–50 active clients", fee: "₹3,999/month" },
  { range: "51–100 active clients", fee: "₹6,999/month" },
  { range: "100+ active clients", fee: "Custom" },
];

export const TURNOVER_MAPPING = [
  { stage: "Pre-revenue / testing", plan: "Free", outcome: "Understand" },
  { stage: "Up to ₹40 lakh", plan: "Starter", outcome: "Automate" },
  { stage: "₹40 lakh – ₹2 crore", plan: "Growth", outcome: "Predict" },
  { stage: "₹2 crore – ₹15 crore", plan: "Scale", outcome: "Control" },
  { stage: "₹15 crore+", plan: "Enterprise", outcome: "Scale / Command" },
];

export const FAQS = [
  {
    q: "Can I start for free?",
    a: "Yes. Free is ₹0 with 100 transactions/month and basic business health score.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. A 14-day Growth trial is available without a credit card.",
  },
  {
    q: "Will I be auto-charged after the trial?",
    a: "No. You must explicitly select a paid plan; otherwise the account seamlessly moves to Free with historical data preserved.",
  },
  {
    q: "Can I upgrade later?",
    a: "Yes, you can upgrade, downgrade or add add-ons at any time directly from your billing settings.",
  },
  {
    q: "Does Vertofi replace my CA?",
    a: "Vertofi provides automation and financial intelligence; CA/accountant collaboration is supported through dedicated partner views.",
  },
  {
    q: "Can I get human expert help?",
    a: "Yes. On-Demand Accountant is ₹199 per 10 minutes, or included via Fastlane Pass (3 free sessions/mo for ₹499/mo).",
  },
  {
    q: "Are Warranty+, Financial Wellness and On-Demand Accountant included in every plan?",
    a: "No. They are separately priced specialist services unless a specific commercial agreement includes them.",
  },
  {
    q: "Can a CA manage multiple businesses?",
    a: "Yes, through our CA Partner or Vertofi Professional (₹2,999/month) offerings.",
  },
  {
    q: "Is turnover a strict restriction?",
    a: "No. Turnover mapping is guidance only. You can choose any plan that fits your feature and volume requirements.",
  },
  {
    q: "Are taxes included?",
    a: "Displayed prices are subscription prices; applicable statutory GST (18%) is charged as required by law.",
  },
];

// Product Suite Feature Key Catalog
export type FeatureKey =
  | "basic_dashboard"
  | "basic_expense_tracking"
  | "basic_health_score"
  | "whatsapp_bot_limited"
  | "whatsapp_micro_accounting"
  | "photo_bill_capture"
  | "voice_accounting"
  | "sales_invoicing"
  | "purchases"
  | "customers"
  | "products"
  | "inventory"
  | "bank_sync"
  | "basic_reconciliation"
  | "bank_reconciliation"
  | "einvoicing"
  | "ewaybill"
  | "full_bhs_score"
  | "monthly_pnl"
  | "pnl_reports"
  | "advanced_bhs"
  | "profitleak_finder"
  | "taxshield_ai"
  | "cashflow_predictor_90d"
  | "moneymap_live"
  | "predictive_tax_warning"
  | "financial_anomaly_alerts"
  | "vendor_trust"
  | "ai_advisor"
  | "virtual_business_director"
  | "gst_monitoring"
  | "compliance_reminders"
  | "gst_reconciliation_alerts"
  | "payroll_growth"
  | "branch_health_score"
  | "group_health_score"
  | "consolidated_dashboard"
  | "multibranch_pnl"
  | "department_analysis"
  | "advanced_vendor_intel"
  | "scenario_planning"
  | "tax_notice_assistance"
  | "dedicated_account_manager"
  | "unlimited_payroll"
  | "api_access"
  | "financial_blackbox"
  | "business_lifeguard"
  | "industry_benchmarks"
  | "benchmarks"
  | "accounting_warranty"
  | "whatsapp_cfo"
  | "ca_collaboration"
  | "erp_integration"
  | "sso_rbac"
  | "white_labeling";

export interface FeatureGateConfig {
  key: FeatureKey;
  label: string;
  minPlan: PlanTier;
  outcomeNeeded: string;
  headline: string;
  description: string;
  bulletPoints: string[];
  isCommercialAddon?: boolean;
}

export const FEATURE_GATES: Record<FeatureKey, FeatureGateConfig> = {
  basic_dashboard: {
    key: "basic_dashboard",
    label: "Basic Dashboard",
    minPlan: "FREE",
    outcomeNeeded: "Understand",
    headline: "Basic Financial Dashboard",
    description: "View top-level revenue, expenses and health indicators.",
    bulletPoints: ["Revenue and expense overview", "Baseline score indicator"],
  },
  basic_expense_tracking: {
    key: "basic_expense_tracking",
    label: "Basic Expense Tracking",
    minPlan: "FREE",
    outcomeNeeded: "Understand",
    headline: "Basic Expenses",
    description: "Log and categorize daily business expenses up to 100 transactions/mo.",
    bulletPoints: ["Manual expense logging", "Category expense breakdown"],
  },
  basic_health_score: {
    key: "basic_health_score",
    label: "Basic Health Score",
    minPlan: "FREE",
    outcomeNeeded: "Understand",
    headline: "Business Health Score Index",
    description: "0–100 baseline financial intelligence score teaser.",
    bulletPoints: ["Overall score overview", "Preliminary financial signal"],
  },
  whatsapp_bot_limited: {
    key: "whatsapp_bot_limited",
    label: "Limited WhatsApp Bot",
    minPlan: "FREE",
    outcomeNeeded: "Understand",
    headline: "Limited WhatsApp Accounting Bot",
    description: "Receive essential reminders and balance notifications via WhatsApp.",
    bulletPoints: ["Monthly balance summaries", "Statutory deadline alerts"],
  },
  whatsapp_micro_accounting: {
    key: "whatsapp_micro_accounting",
    label: "WhatsApp Micro Accounting",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Full WhatsApp Accounting Interaction",
    description: "Send transactions, ask balances and interact with your books directly via WhatsApp.",
    bulletPoints: ["Interactive conversational accounting", "Instant ledger query responses", "2-way automated chat logging"],
  },
  photo_bill_capture: {
    key: "photo_bill_capture",
    label: "Photo Bill Capture & OCR",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Upload Bills Via Photo",
    description: "Snap a photo of vendor bills. AI extracts vendor, items, GST and amounts automatically.",
    bulletPoints: ["50 scanned bills/mo on Starter, 250/mo on Growth", "Auto-fills line items & GST tax splits", "Zero manual typing"],
  },
  voice_accounting: {
    key: "voice_accounting",
    label: "Voice-Note Accounting",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Voice-Note Transaction Entry",
    description: "Speak your sales or expenses in Hindi, English, Telugu, Tamil. Vertofi files the entry.",
    bulletPoints: ["Multilingual voice comprehension", "Automatic ledger matching", "Instant confirmation receipts"],
  },
  sales_invoicing: {
    key: "sales_invoicing",
    label: "GST Invoicing & Sales",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Automated GST Invoicing",
    description: "Generate compliant GST tax invoices, proformas, delivery challans and credit notes.",
    bulletPoints: ["Compliant GST invoices with QR code", "Proforma and advance receipt vouchers", "Automated ledger postings"],
  },
  purchases: {
    key: "purchases",
    label: "Purchase & Vendor Orders",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Automated Purchase Management",
    description: "Record bills, POs and debit notes with automated vendor reconciliations.",
    bulletPoints: ["Vendor bills & purchase tracking", "Input Tax Credit (ITC) matching", "Debit notes and vendor ledgers"],
  },
  customers: {
    key: "customers",
    label: "Customer Directory & CRM",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Customer Accounts & Ledger",
    description: "Manage customer GSTIN records, outstanding aging reports and payment reminders.",
    bulletPoints: ["Customer master with verified GSTIN", "Outstanding aging & WhatsApp payment reminders", "Payment terms & statement logs"],
  },
  products: {
    key: "products",
    label: "Product Catalog & Pricing",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Product Master & HSN Mapping",
    description: "Maintain product catalog, SAC/HSN codes, pricing slabs and tax brackets.",
    bulletPoints: ["HSN/SAC directory with GST rates", "Custom item categories and pricing", "Multi-unit support (pcs, kgs, boxes)"],
  },
  inventory: {
    key: "inventory",
    label: "Stock & Inventory Control",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Real-Time Stock Tracking",
    description: "Automatic inventory deduction upon invoice generation with low-stock warnings.",
    bulletPoints: ["Auto-deduct stock on sales", "Stock-in & stock-out audit logs", "Inventory re-order alerts"],
  },
  bank_sync: {
    key: "bank_sync",
    label: "Bank Sync & Import",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Automated Bank Synchronization",
    description: "Connect Indian bank feeds or upload bank statements for automatic transaction extraction.",
    bulletPoints: ["Multi-bank statement support", "Automated balance syncing", "Missing transaction discovery"],
  },
  basic_reconciliation: {
    key: "basic_reconciliation",
    label: "Basic Reconciliation",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Bank & Ledger Reconciliation",
    description: "Match bank lines against sales and purchase invoices with one click.",
    bulletPoints: ["One-click match suggestions", "Unreconciled items dashboard", "Variance reporting"],
  },
  full_bhs_score: {
    key: "full_bhs_score",
    label: "Full Business Health Score",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Full Business Financial Health Score",
    description: "Complete 0–100 score with 7-pillar breakdown (Liquidity, Profitability, Solvency, Tax, Compliance, Growth, Efficiency).",
    bulletPoints: ["Full 7-pillar granular breakdown", "Pillar-specific risk flags", "Actionable improvement steps"],
  },
  monthly_pnl: {
    key: "monthly_pnl",
    label: "Monthly P&L Statements",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Monthly Profit & Loss Reports",
    description: "Generate CA-ready Monthly Profit & Loss statements, balance sheets and cash flow sheets.",
    bulletPoints: ["CA-ready monthly P&L export", "Gross and net margin calculations", "Export to Excel and PDF"],
  },
  advanced_bhs: {
    key: "advanced_bhs",
    label: "Advanced Business Health Score",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Advanced Multi-Dimensional Health Intelligence",
    description: "Predictive health score trajectory with leading indicators and stress modeling.",
    bulletPoints: ["Predictive health trajectory", "Early financial strain signals", "Cash-runway impact correlation"],
  },
  profitleak_finder: {
    key: "profitleak_finder",
    label: "ProfitLeak Finder",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Detect Overspending & Leaks Before They Cost You",
    description: "AI continuously detects vendor price creeps, duplicate invoices, unclaimed GST ITC and subscription drains.",
    bulletPoints: [
      "Vendor price creep detection across invoice history",
      "Duplicate payment and recurring penalty alerts",
      "Unclaimed GST ITC recovery before 30-day expiry",
      "Average ₹1.42L MSME leak recovery",
    ],
  },
  taxshield_ai: {
    key: "taxshield_ai",
    label: "TaxShield AI / Predictive Tax Warning",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Predictive Tax Warning & TaxShield AI",
    description: "Forecasts GSTR-3B tax liabilities and advance tax obligations 15–30 days in advance.",
    bulletPoints: [
      "Predicts GST & Advance Tax cash requirements before due dates",
      "Flags Reverse Charge Mechanism (RCM) liabilities",
      "Early warning for high-risk vendor ITC disallowance",
    ],
  },
  cashflow_predictor_90d: {
    key: "cashflow_predictor_90d",
    label: "90-Day Cash Flow Predictor",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "90-Day Predictive Cash Flow Forecast",
    description: "AI models daily cash in-flows and out-flows, predicting cash-crunch dates with confidence bounds.",
    bulletPoints: [
      "90-day trajectory of available bank cash",
      "Predicts exact liquidity deficit dates",
      "Debtor default probability scoring",
    ],
  },
  financial_anomaly_alerts: {
    key: "financial_anomaly_alerts",
    label: "Financial Anomaly Alerts",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Real-Time Anomaly & Fraud Radar",
    description: "Detects irregular expense spikes, abnormal vendor payouts and unexpected margin dips.",
    bulletPoints: ["Real-time abnormal transaction flagging", "Unusual expense spikes vs historical baselines", "Immediate WhatsApp & email alerts"],
  },
  vendor_trust: {
    key: "vendor_trust",
    label: "Vendor Risk / Trust Score",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Vendor Risk & Reliability Intelligence",
    description: "Analyzes supplier risk signals, GST filing regularity, price volatility and delivery consistency.",
    bulletPoints: [
      "Supplier GST compliance & filing consistency score",
      "Flags suspended or cancelled GSTINs before payment",
      "Vendor price volatility index",
    ],
  },
  ai_advisor: {
    key: "ai_advisor",
    label: "AI Financial Advisor / Virtual Business Director",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "AI Decision Support for Strategic Growth",
    description: "AI decision support for hiring feasibility, loan capacity, product pricing, sales decline and cost optimization.",
    bulletPoints: [
      "Hiring & salary feasibility simulation",
      "Loan affordability and debt service ratio check",
      "Expansion & branch investment simulations",
      "Instant answers on WhatsApp & Web",
    ],
  },
  virtual_business_director: {
    key: "virtual_business_director",
    label: "Virtual Business Director",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Autonomous Business Director Engine",
    description: "Continuous strategic surveillance with automated action playbooks.",
    bulletPoints: ["Continuous operational monitoring", "Strategic turnaround playbooks", "Growth capital recommendations"],
  },
  gst_monitoring: {
    key: "gst_monitoring",
    label: "GST Monitoring & Risk Alerts",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Continuous GST Compliance Monitoring",
    description: "Proactive GST compliance monitoring, tax-risk alerts and statutory deadline tracking.",
    bulletPoints: ["GSTR-1 vs GSTR-3B variance detection", "GST reconciliation alerts", "Automated compliance calendar reminders"],
  },
  compliance_reminders: {
    key: "compliance_reminders",
    label: "Compliance Reminders & Calendars",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Automated Compliance Sentinel",
    description: "Never miss a statutory tax or ROC deadline with automated WhatsApp and calendar alerts.",
    bulletPoints: ["TDS, PF, ESI, GST statutory dates", "Advance tax payment schedules", "Escalation to management on pending filings"],
  },
  gst_reconciliation_alerts: {
    key: "gst_reconciliation_alerts",
    label: "GST Reconciliation Alerts",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "GSTR-2B vs Purchase Register Reconciliation",
    description: "Automated 2B matching to prevent ITC leakage and identify defaulter vendors.",
    bulletPoints: ["Real-time GSTR-2B match logs", "Defaulter supplier identification", "ITC recovery ledger"],
  },
  payroll_growth: {
    key: "payroll_growth",
    label: "Payroll (Up to 10 Employees)",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Integrated Payroll & Salary Processing",
    description: "Process monthly payroll, compute PF/ESI/PT deductions and generate payslips for up to 10 employees.",
    bulletPoints: ["Up to 10 employees included", "Automated payslips and statutory deductions", "Expandable via add-on up to 25 employees"],
  },
  branch_health_score: {
    key: "branch_health_score",
    label: "Health Score Per Branch",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Branch-Level Financial Health Diagnostics",
    description: "Independent 0–100 Business Financial Health Score calculated for every branch location.",
    bulletPoints: ["Individual branch health score", "Cross-branch ranking and performance heatmaps", "Local leak detection per branch"],
  },
  group_health_score: {
    key: "group_health_score",
    label: "Combined Group Health Score",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Consolidated Group Financial Health Score",
    description: "Consolidated financial score across all legal entities, subsidiaries and GSTINs.",
    bulletPoints: ["Holistic enterprise health index", "Group-level solvency and liquidity checks", "Inter-company risk normalization"],
  },
  consolidated_dashboard: {
    key: "consolidated_dashboard",
    label: "Consolidated Dashboard",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Multi-Entity Group Command Center",
    description: "Unified command center for owners operating multiple entities, branches or GSTINs.",
    bulletPoints: ["Unified cash flow across all entities", "Cross-GSTIN tax liability overview", "Consolidated executive P&L"],
  },
  multibranch_pnl: {
    key: "multibranch_pnl",
    label: "Multi-Branch P&L",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Branch-Wise Profit & Loss Reporting",
    description: "Separate P&L, balance sheets and margin tracking for each physical store, warehouse or factory.",
    bulletPoints: ["Individual location profitability", "Inter-branch transfer reconciliation", "Location-specific cost management"],
  },
  department_analysis: {
    key: "department_analysis",
    label: "Department Analysis & Cost Centers",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Cost Center & Department Intelligence",
    description: "Granular cost-center tracking across Sales, Operations, Marketing, Logistics and R&D.",
    bulletPoints: ["Department-wise budget vs actual", "Cost-center ROI calculation", "Departmental spend anomaly detection"],
  },
  advanced_vendor_intel: {
    key: "advanced_vendor_intel",
    label: "Advanced Vendor Intelligence",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Enterprise Vendor Trust & Supply Intelligence",
    description: "Deep supplier risk scoring, cross-vendor price benchmarking and contract compliance.",
    bulletPoints: ["Cross-market rate benchmarking", "Vendor dispute tracking", "Contract terms SLA monitoring"],
  },
  scenario_planning: {
    key: "scenario_planning",
    label: "Decision Intelligence / Scenario Planning",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Multi-Variable Scenario Planning Simulator",
    description: "Model complex business outcomes: revenue drop (-20%), salary raises, taking a ₹50L loan, opening a new branch.",
    bulletPoints: [
      "Revenue shock modeling (-20%, -30%)",
      "Hiring expansion impact (simulate 10–50 new staff)",
      "New branch / warehouse capital requirements",
      "Loan debt-service & runway stress testing",
    ],
  },
  tax_notice_assistance: {
    key: "tax_notice_assistance",
    label: "Emergency Tax Notice Assistance",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Emergency Assistance for Tax Notices / Disputes",
    description: "Rapid response workflows and specialist CA coordination for GST and Income Tax scrutiny notices.",
    bulletPoints: ["Notice categorization and risk triage", "Draft reply generator based on verified ledger data", "Priority specialist CA escalation"],
  },
  dedicated_account_manager: {
    key: "dedicated_account_manager",
    label: "Dedicated Account Manager & Priority Onboarding",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Dedicated Success Manager",
    description: "Direct relationship manager with priority onboarding assistance.",
    bulletPoints: ["Named Account Manager", "Expedited onboarding and data setup", "Quarterly financial workflow reviews"],
  },
  unlimited_payroll: {
    key: "unlimited_payroll",
    label: "Unlimited Payroll",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Unlimited Employee Payroll Management",
    description: "Process payroll, generate salary slips and manage statutory deductions for unlimited team members.",
    bulletPoints: ["Unlimited employees", "Automated bulk payouts", "Multi-branch payroll batches"],
  },
  api_access: {
    key: "api_access",
    label: "API Access",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale — ₹3,999/mo)",
    headline: "Developer API & Webhook Access",
    description: "Programmatic access to invoices, ledger entries, health scores and bank sync via REST APIs.",
    bulletPoints: ["RESTful endpoints with API key authentication", "Real-time webhook notifications", "Custom CRM / E-Commerce integrations"],
  },
  financial_blackbox: {
    key: "financial_blackbox",
    label: "Financial Black Box Recorder",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale / Enterprise)",
    headline: "Cryptographic Tamper-Proof Audit Trail",
    description: "Immutable hash-chained audit logging of every financial modification and transaction event.",
    bulletPoints: ["Cryptographic verification of accounting integrity", "Audit logs ready for banks, investors and regulators", "Incident reconstruction workflows"],
  },
  business_lifeguard: {
    key: "business_lifeguard",
    label: "Business Lifeguard",
    minPlan: "SCALE",
    outcomeNeeded: "Control (Scale+)",
    headline: "Emergency Workflow for Notices, Disputes & Fraud",
    description: "Autonomous crisis protocol for sudden cash-flow crunches, fraudulent vendor invoices and disputes.",
    bulletPoints: ["Emergency liquidity preservation playbooks", "Immediate vendor payment freeze triggers", "Notice escalation protocols"],
  },
  industry_benchmarks: {
    key: "industry_benchmarks",
    label: "Industry Benchmarks",
    minPlan: "GROWTH",
    outcomeNeeded: "Commercial Feature / Add-On",
    isCommercialAddon: true,
    headline: "Peer & Sector Industry Benchmarks",
    description: "Compare your margins, payroll ratios, GST percentiles and collection cycles against industry peers.",
    bulletPoints: ["Margin percentiles in your industry sector", "Working capital & debtor collection benchmarks", "Nearby location localized analysis"],
  },
  ca_collaboration: {
    key: "ca_collaboration",
    label: "Accountant / CA Collaboration",
    minPlan: "STARTER",
    outcomeNeeded: "CA Partner / Professional",
    headline: "Seamless Chartered Accountant Workspace",
    description: "Controlled collaboration portal with review permissions for external CAs and bookkeepers.",
    bulletPoints: ["Audit-only or editor CA access", "Direct client ledger review", "Notice and tax filing approvals"],
  },
  erp_integration: {
    key: "erp_integration",
    label: "ERP Integrations (SAP / Oracle)",
    minPlan: "ENTERPRISE",
    outcomeNeeded: "Scale / Command (Enterprise — Custom)",
    headline: "Custom ERP, SAP & Oracle Connectors",
    description: "Two-way enterprise synchronization with SAP, Oracle, Microsoft Dynamics and custom ERPs.",
    bulletPoints: ["Direct bi-directional database connectors", "Real-time ledger and invoice mirroring", "Custom data pipeline engineering"],
  },
  sso_rbac: {
    key: "sso_rbac",
    label: "SSO & Role-Based Access Control",
    minPlan: "ENTERPRISE",
    outcomeNeeded: "Scale / Command (Enterprise — Custom)",
    headline: "Enterprise Authentication & Governance",
    description: "SAML 2.0 / Okta SSO, granular department roles, audit logs and custom security SLAs.",
    bulletPoints: ["SAML / OAuth2 Single Sign-On", "Granular role-based permissions (RBAC)", "Custom SLA & SOC2 compliant deployment"],
  },
  white_labeling: {
    key: "white_labeling",
    label: "White-Labeling & Custom AI Models",
    minPlan: "ENTERPRISE",
    outcomeNeeded: "Scale / Command (Enterprise — Custom)",
    headline: "White-Labeling & Bespoke AI Models",
    description: "Custom branding, domain routing and specialized AI financial models tailored to your industry.",
    bulletPoints: ["Custom corporate branding & portals", "Fine-tuned proprietary LLM models", "Private cloud deployment options"],
  },
  einvoicing: {
    key: "einvoicing",
    label: "E-Invoicing",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Automated E-Invoicing & IRP Portal Integration",
    description: "Generate compliant IRN and signed QR codes directly from invoices.",
    bulletPoints: ["Instant IRN generation", "IRP gateway integration", "QR code verification"],
  },
  ewaybill: {
    key: "ewaybill",
    label: "E-Way Bills",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Automated E-Way Bill Generation",
    description: "Generate and manage Part-A/Part-B E-Way bills directly from invoices and delivery challans.",
    bulletPoints: ["One-click E-Way bill generation", "Transporter master integration", "Real-time validity alerts"],
  },
  bank_reconciliation: {
    key: "bank_reconciliation",
    label: "Bank Reconciliation",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Bank & Ledger Reconciliation",
    description: "Match bank feeds with ledgers automatically.",
    bulletPoints: ["Automated bank matching", "One-click reconciliation", "Discrepancy alerts"],
  },
  pnl_reports: {
    key: "pnl_reports",
    label: "P&L Reports",
    minPlan: "STARTER",
    outcomeNeeded: "Automate (Starter — ₹499/mo)",
    headline: "Profit & Loss Reports",
    description: "Generate detailed monthly Profit & Loss and financial statements.",
    bulletPoints: ["Monthly P&L breakdown", "Gross & Net margins", "Export to PDF/Excel"],
  },
  moneymap_live: {
    key: "moneymap_live",
    label: "MoneyMap Live",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "MoneyMap Live Cash Flow Visualizer",
    description: "Live interactive map of cash inflows, vendor outflows and upcoming liquidity crunches.",
    bulletPoints: ["Real-time cash stream visualization", "Upcoming liability heatmaps", "Working capital projections"],
  },
  predictive_tax_warning: {
    key: "predictive_tax_warning",
    label: "Predictive Tax Warnings",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "Predictive Tax & Audit Risk Warnings",
    description: "Proactive AI tax notice prevention and statutory discrepancy alerts.",
    bulletPoints: ["ITC reversal risk alerts", "GSTR variance indicators", "Statutory tax buffer warnings"],
  },
  benchmarks: {
    key: "benchmarks",
    label: "Industry Benchmarks",
    minPlan: "GROWTH",
    outcomeNeeded: "Commercial Feature / Add-On",
    isCommercialAddon: true,
    headline: "Peer & Sector Industry Benchmarks",
    description: "Compare financial health and margins with peer businesses.",
    bulletPoints: ["Nearby location peer comparison", "Operating margin percentiles", "Cash runway benchmarks"],
  },
  accounting_warranty: {
    key: "accounting_warranty",
    label: "Accounting Warranty+",
    minPlan: "GROWTH",
    outcomeNeeded: "Specialist Product",
    isCommercialAddon: true,
    headline: "Vertofi Accounting Warranty Protection",
    description: "Protection and indemnity against statutory computation notices and accounting errors.",
    bulletPoints: ["Notice assistance coverage", "CA audit review guarantee", "Protection policy claims"],
  },
  whatsapp_cfo: {
    key: "whatsapp_cfo",
    label: "WhatsApp CFO",
    minPlan: "GROWTH",
    outcomeNeeded: "Predict (Growth — ₹1,499/mo)",
    headline: "WhatsApp AI CFO & Advisor",
    description: "Ask financial questions, test scenarios and receive executive daily briefings on WhatsApp.",
    bulletPoints: ["Instant WhatsApp financial answers", "Daily cash position briefing", "Scenario simulation on mobile"],
  },
};

export const PLAN_TIER_RANK: Record<PlanTier, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  SCALE: 3,
  ENTERPRISE: 4,
};

export interface SubscriptionUsage {
  transactions: number;
  scannedBills: number;
  users: number;
  gstins: number;
  payrollEmployees: number;
  branches: number;
}

export interface SubscriptionState {
  plan: PlanTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  trialStartDate: string | null;
  trialEndDate: string | null;
  renewalDate: string | null;
  founderPricing: boolean;
  addons: string[];
  commercialFeatures: string[];
  usage: SubscriptionUsage;
}

const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  plan: "FREE",
  billingCycle: "MONTHLY",
  status: "active",
  trialStartDate: null,
  trialEndDate: null,
  renewalDate: null,
  founderPricing: false,
  addons: [],
  commercialFeatures: [],
  usage: {
    transactions: 24,
    scannedBills: 0,
    users: 1,
    gstins: 1,
    payrollEmployees: 0,
    branches: 1,
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

// Subscription Service & Storage
export const subscriptionService = {
  getSubscription(): SubscriptionState {
    if (typeof window === "undefined") return { ...DEFAULT_SUBSCRIPTION };
    try {
      const email = (localStorage.getItem("vertofi_user_email") || "").toLowerCase();
      const currentUserId = localStorage.getItem("vertofi_current_user_id");
      const isGoutham = email.includes("gouthambadiga") || currentUserId === "usr_goutham_01";

      // 1. Try unified subscription object
      const raw = localStorage.getItem("vertofi_subscription_state");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isGoutham && parsed.plan !== "ENTERPRISE") {
          parsed.plan = "ENTERPRISE";
          localStorage.setItem("vertofi_subscription_state", JSON.stringify(parsed));
          localStorage.setItem("vertofi.plan", "ENTERPRISE");
          localStorage.setItem("vertofi_user_plan", "ENTERPRISE");
        }
        // Check for 14-day trial expiry
        if (parsed.status === "trial" && parsed.trialEndDate) {
          const end = new Date(parsed.trialEndDate).getTime();
          if (Date.now() > end) {
            // Trial has ended. Move to Free automatically without charging.
            parsed.plan = "FREE";
            parsed.status = "expired";
            localStorage.setItem("vertofi_subscription_state", JSON.stringify(parsed));
            localStorage.setItem("vertofi.plan", "FREE");
            localStorage.setItem("vertofi_user_plan", "FREE");
          }
        }
        return parsed;
      }

      // 2. Legacy fallback keys
      const planKey = isGoutham ? "ENTERPRISE" : (localStorage.getItem("vertofi.plan") || localStorage.getItem("vertofi_user_plan") || "FREE");
      const plan = normalizePlan(planKey);
      const sub: SubscriptionState = {
        ...DEFAULT_SUBSCRIPTION,
        plan,
        status: plan === "FREE" ? "active" : "active",
      };
      localStorage.setItem("vertofi_subscription_state", JSON.stringify(sub));
      return sub;
    } catch {
      return { ...DEFAULT_SUBSCRIPTION };
    }
  },

  saveSubscription(sub: SubscriptionState): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("vertofi_subscription_state", JSON.stringify(sub));
      localStorage.setItem("vertofi.plan", sub.plan);
      localStorage.setItem("vertofi_user_plan", sub.plan);
      window.dispatchEvent(new CustomEvent("vertofi:subscription-changed", { detail: sub }));
      window.dispatchEvent(new CustomEvent("vertofi:plan-changed", { detail: { plan: sub.plan } }));
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.error("Failed to save subscription state:", err);
    }
  },

  updateSubscription(partial: Partial<SubscriptionState>): SubscriptionState {
    const current = this.getSubscription();
    const updated: SubscriptionState = {
      ...current,
      ...partial,
      usage: {
        ...current.usage,
        ...(partial.usage || {}),
      },
    };
    this.saveSubscription(updated);
    return updated;
  },

  setPlan(plan: PlanTier, cycle: BillingCycle = "MONTHLY", founder: boolean = false): SubscriptionState {
    const nextRenewal = new Date();
    if (cycle === "YEARLY") {
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
    } else {
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    }

    return this.updateSubscription({
      plan: normalizePlan(plan),
      billingCycle: cycle,
      status: "active",
      trialStartDate: null,
      trialEndDate: null,
      renewalDate: nextRenewal.toISOString(),
      founderPricing: founder,
    });
  },

  startGrowthTrial(): SubscriptionState {
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    return this.updateSubscription({
      plan: "GROWTH",
      billingCycle: "MONTHLY",
      status: "trial",
      trialStartDate: now.toISOString(),
      trialEndDate: end.toISOString(),
      renewalDate: null,
    });
  },

  toggleAddOn(addonId: string, enabled: boolean): SubscriptionState {
    const sub = this.getSubscription();
    const addons = new Set(sub.addons || []);
    if (enabled) {
      addons.add(addonId);
    } else {
      addons.delete(addonId);
    }
    return this.updateSubscription({ addons: Array.from(addons) });
  },

  toggleCommercialFeature(featureId: string, enabled: boolean): SubscriptionState {
    const sub = this.getSubscription();
    const commercial = new Set(sub.commercialFeatures || []);
    if (enabled) {
      commercial.add(featureId);
    } else {
      commercial.delete(featureId);
    }
    return this.updateSubscription({ commercialFeatures: Array.from(commercial) });
  },

  recordUsage(metric: keyof SubscriptionUsage, amount: number = 1): { allowed: boolean; newTotal: number; limit: number } {
    const sub = this.getSubscription();
    const currentVal = sub.usage[metric] ?? 0;
    const limit = getPlanLimit(metric, sub);

    const newTotal = currentVal + amount;
    if (limit !== Infinity && limit > 0 && newTotal > limit) {
      return { allowed: false, newTotal: currentVal, limit };
    }

    sub.usage[metric] = newTotal;
    this.saveSubscription(sub);
    return { allowed: true, newTotal, limit };
  },
};

// Feature Entitlement Checks
export function hasFeature(featureKey: FeatureKey, customSub?: SubscriptionState): boolean {
  const sub = customSub || subscriptionService.getSubscription();
  const config = FEATURE_GATES[featureKey];
  if (!config) return true; // Default allowed if unknown

  // Check Commercial feature / add-on configuration
  if (config.isCommercialAddon) {
    if (sub.commercialFeatures?.includes(featureKey)) return true;
    if (sub.addons?.includes(featureKey) || sub.addons?.includes(`${featureKey}_addon`)) return true;
  }

  // Active trial grants Growth level features
  const effectivePlan: PlanTier = sub.status === "trial" ? "GROWTH" : sub.plan;
  const userRank = PLAN_TIER_RANK[normalizePlan(effectivePlan)] ?? 0;
  const requiredRank = PLAN_TIER_RANK[config.minPlan] ?? 0;

  // Add-on overrides (e.g. api_access on lower plans with addon)
  if (featureKey === "api_access" && sub.addons?.includes("api_access_below_scale")) {
    return true;
  }
  if (featureKey === "ai_advisor" && sub.addons?.includes("advanced_ai_advisor")) {
    return true;
  }

  return userRank >= requiredRank;
}

export function canUseFeature(featureKey: FeatureKey, customSub?: SubscriptionState): boolean {
  return hasFeature(featureKey, customSub);
}

export function isFeatureLocked(featureKey: FeatureKey, currentPlanOrSub?: string | SubscriptionState | null): boolean {
  if (typeof currentPlanOrSub === "object" && currentPlanOrSub !== null && "plan" in currentPlanOrSub) {
    return !hasFeature(featureKey, currentPlanOrSub);
  }
  const sub = subscriptionService.getSubscription();
  if (typeof currentPlanOrSub === "string") {
    sub.plan = normalizePlan(currentPlanOrSub);
  }
  return !hasFeature(featureKey, sub);
}

export function getFeatureGateInfo(featureKey: FeatureKey): FeatureGateConfig {
  return (
    FEATURE_GATES[featureKey] || {
      key: featureKey,
      label: "Feature",
      minPlan: "STARTER",
      outcomeNeeded: "Automate",
      headline: "Feature Requires Upgrade",
      description: "Upgrade your plan to unlock this capability.",
      bulletPoints: [],
    }
  );
}

// Usage Limits Calculation
export function getPlanLimit(metric: keyof SubscriptionUsage, customSub?: SubscriptionState): number {
  const sub = customSub || subscriptionService.getSubscription();
  const planInfo = PLANS.find((p) => p.id === sub.plan) || PLANS[0];
  let baseLimit = planInfo.limits.maxTransactions;

  switch (metric) {
    case "transactions":
      baseLimit = planInfo.limits.maxTransactions;
      if (sub.addons?.includes("extra_transactions")) baseLimit += 2500;
      return baseLimit;
    case "scannedBills":
      baseLimit = planInfo.limits.maxScannedBills;
      if (sub.addons?.includes("extra_scanned_bills")) baseLimit += 500;
      return baseLimit;
    case "users":
      baseLimit = planInfo.limits.maxUsers;
      if (sub.addons?.includes("extra_user")) baseLimit += 1;
      return baseLimit;
    case "gstins":
      baseLimit = planInfo.limits.maxGstins;
      if (sub.addons?.includes("extra_gstin")) baseLimit += 1;
      return baseLimit;
    case "payrollEmployees":
      baseLimit = planInfo.limits.maxPayrollEmployees;
      if (sub.addons?.includes("growth_payroll_expanded") && sub.plan === "GROWTH") baseLimit = 25;
      return baseLimit;
    case "branches":
      baseLimit = planInfo.limits.hasMultiBranch ? 10 : 1;
      if (sub.addons?.includes("additional_branch")) baseLimit += 1;
      return baseLimit;
    default:
      return 100;
  }
}

export interface UsageCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  metric: string;
  message?: string;
}

export function checkUsageLimit(metric: keyof SubscriptionUsage, delta: number = 1, customSub?: SubscriptionState): UsageCheckResult {
  const sub = customSub || subscriptionService.getSubscription();
  const limit = getPlanLimit(metric, sub);
  const current = sub.usage[metric] ?? 0;
  const remaining = Math.max(0, limit - current);

  if (limit === Infinity || limit >= 999999) {
    return { allowed: true, limit, current, remaining: 999999, metric };
  }

  if (current + delta > limit) {
    const metricLabels: Record<keyof SubscriptionUsage, string> = {
      transactions: "monthly transactions",
      scannedBills: "scanned bills",
      users: "user seats",
      gstins: "registered GSTINs",
      payrollEmployees: "payroll employees",
      branches: "branches",
    };
    const label = metricLabels[metric] || metric;
    return {
      allowed: false,
      limit,
      current,
      remaining: 0,
      metric,
      message: `You have reached your monthly limit of ${limit.toLocaleString("en-IN")} ${label} on the ${sub.plan} plan. Upgrade your plan to increase limits.`,
    };
  }

  return {
    allowed: true,
    limit,
    current,
    remaining: limit - (current + delta),
    metric,
  };
}

export function getUserActivePlan(): PlanTier {
  return subscriptionService.getSubscription().plan;
}

export function setPlanForTesting(planTier: PlanTier): void {
  subscriptionService.setPlan(planTier);
}

export function getPlanLimits(planId?: string | null): PlanLimitConfig {
  const tier = normalizePlan(planId);
  const plan = PLANS.find((p) => p.id === tier) || PLANS[0];
  return plan.limits;
}

export function getRecommendedPlanByTurnover(turnover?: string): PlanTier {
  if (!turnover) return "FREE";
  const t = turnover.toUpperCase();
  if (t.includes("15CR") || t.includes("15_CRORE") || t.includes("15 CR") || t.includes("15CR_PLUS")) return "ENTERPRISE";
  if (t.includes("2CR_15CR") || t.includes("2CR") || t.includes("2_15") || t.includes("SCALE")) return "SCALE";
  if (t.includes("40L_2CR") || t.includes("40L_1_5CR") || t.includes("40L") || t.includes("GROWTH")) return "GROWTH";
  if (t.includes("UP_TO_40L") || t.includes("UNDER_40L") || t.includes("STARTER")) return "STARTER";
  return "FREE";
}
