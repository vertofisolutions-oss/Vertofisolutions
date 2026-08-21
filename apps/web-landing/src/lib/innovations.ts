import {
  Activity,
  AlarmClock,
  LifeBuoy,
  SearchCheck,
  BrainCircuit,
  MessageSquare,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
  BadgeCheck,
  Radar,
  Headphones,
  Boxes,
  BarChart3,
  ScanLine,
  type LucideIcon,
} from "lucide-react";

export interface Innovation {
  slug: string;
  name: string;
  tagline: string;
  features: [string, string, string];
  icon: LucideIcon;
}

/** The 15 Vertofi innovations. Copy mirrors the product features page — no
 *  metrics, only capability. */
export const INNOVATIONS: Innovation[] = [
  {
    slug: "business-health-score",
    name: "Business Health Score",
    tagline: "A continuous 0–100 score across 7 dimensions of financial health.",
    features: ["Expense discipline", "Cashflow stability", "Debt risk"],
    icon: Activity,
  },
  {
    slug: "predictive-tax-warning",
    name: "Predictive Tax Warning",
    tagline: "Forecast tax and GST exposure weeks ahead of deadlines.",
    features: ["Penalty forecast", "Tax due calendar", "GST risk"],
    icon: AlarmClock,
  },
  {
    slug: "business-lifeguard",
    name: "Business Lifeguard",
    tagline: "Emergency response for notices, disputes and fraud events.",
    features: ["GST/IT notices", "Vendor disputes", "Fraud alerts"],
    icon: LifeBuoy,
  },
  {
    slug: "profitleak-finder",
    name: "ProfitLeak Finder",
    tagline: "Catch duplicate payments and silent overspend automatically.",
    features: ["Duplicate detection", "Unused subscriptions", "Vendor overcharges"],
    icon: SearchCheck,
  },
  {
    slug: "virtual-business-director",
    name: "Virtual Business Director",
    tagline: "Simulate hiring, expansion and capital decisions before you commit.",
    features: ["Hire simulator", "Loan simulator", "Expansion modeling"],
    icon: BrainCircuit,
  },
  {
    slug: "whatsapp-micro-accounting",
    name: "WhatsApp Micro Accounting",
    tagline: "Capture invoices, voice notes and bills directly from WhatsApp.",
    features: ["Voice → ledger", "OCR receipts", "Daily summaries"],
    icon: MessageSquare,
  },
  {
    slug: "financial-wellness-program",
    name: "Financial Wellness Program",
    tagline: "Guided monthly plans to lift your Business Health Score.",
    features: ["Personalized plans", "Coach-on-call", "Score tracking"],
    icon: HeartHandshake,
  },
  {
    slug: "invisible-accounting",
    name: "Invisible Accounting",
    tagline: "Bank, GST, POS and payroll auto-reconciled in the background.",
    features: ["10+ integrations", "Auto categorization", "Live ledger"],
    icon: RefreshCw,
  },
  {
    slug: "vendortrust-score",
    name: "VendorTrust Score",
    tagline: "Rate every vendor by risk, history and on-time behavior.",
    features: ["Vendor risk", "History view", "Comparison"],
    icon: ShieldCheck,
  },
  {
    slug: "accounting-warranty-plus",
    name: "Accounting Warranty+",
    tagline: "Guaranteed accuracy on filings, reports and reconciliations.",
    features: ["Audit-ready", "Filing guarantee", "Insurance cover"],
    icon: BadgeCheck,
  },
  {
    slug: "moneymap-live",
    name: "MoneyMap Live",
    tagline: "Real-time inflow, outflow and profit/leak zones.",
    features: ["Cash radar", "Profit zones", "Seasonality"],
    icon: Radar,
  },
  {
    slug: "on-demand-accountant",
    name: "On-Demand Accountant",
    tagline: "10-minute expert sessions on tap, whenever you need them.",
    features: ["Live booking", "Session notes", "Ticket history"],
    icon: Headphones,
  },
  {
    slug: "financial-black-box",
    name: "Financial Black Box",
    tagline: "Full audit trail of every financial change in your business.",
    features: ["Who/what/when", "Timeline view", "Forensics"],
    icon: Boxes,
  },
  {
    slug: "industry-benchmarks",
    name: "Industry Benchmarks",
    tagline: "See how you compare to peers in your industry, in real time.",
    features: ["Peer cohorts", "Margin benchmarks", "Cash ratios"],
    icon: BarChart3,
  },
  {
    slug: "zero-data-entry",
    name: "Zero Data Entry Accounting",
    tagline: "OCR plus integrations remove almost all manual entry.",
    features: ["Bulk OCR", "Auto-match", "Daily close"],
    icon: ScanLine,
  },
];
