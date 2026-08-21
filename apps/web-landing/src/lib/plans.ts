export interface Plan {
  name: string;
  price: string;
  audience: string;
  popular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "₹699",
    audience: "For solo founders, freelancers, and early-stage small businesses.",
    features: [
      "GST tracking dashboard & reminders",
      "Income & expense bookkeeping",
      "Basic AI financial insights",
      "WhatsApp invoice uploads",
      "100 OCR scans / month",
      "2 users included",
    ],
  },
  {
    name: "Growth",
    price: "₹1,999",
    audience: "For growing companies and SMEs needing real financial intelligence.",
    popular: true,
    features: [
      "Everything in Starter",
      "Real-time Business Health Score",
      "Predictive Tax Warning System",
      "ProfitLeak Finder duplicate finder",
      "WhatsApp voice-note workflows",
      "10 users included & priority support",
    ],
  },
  {
    name: "Pro",
    price: "₹4,999",
    audience: "For high-volume operations, enterprises, and large CA firms.",
    features: [
      "Everything in Growth",
      "Unlimited invoices & OCR scans",
      "Multi-entity consolidation",
      "Custom ERP & CRM integrations",
      "Bespoke WhatsApp workflows",
      "24/7 dedicated account manager",
    ],
  },
];

export interface PricingRow {
  plan: string;
  monthly: string;
  q: string;
  h: string;
  y: string;
}

export const PRICING_TABLE: PricingRow[] = [
  { plan: "Starter", monthly: "₹699", q: "₹629/mo", h: "₹594/mo", y: "₹524/mo" },
  { plan: "Growth", monthly: "₹1,999", q: "₹1,799/mo", h: "₹1,699/mo", y: "₹1,499/mo" },
  { plan: "Pro", monthly: "₹4,999", q: "₹4,499/mo", h: "₹4,249/mo", y: "₹3,749/mo" },
];
