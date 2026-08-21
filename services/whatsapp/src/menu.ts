/**
 * WhatsApp menu system (docs/10). Turns Vertofi into a "Mobile CFO": the same
 * actions available in the dashboard, reachable by text menus, numbers, voice,
 * PDFs, images and natural language. Plan-aware (Starter < Growth < Pro).
 *
 * route() returns a reply string for menu/navigation input, or null to let the
 * AI assistant handle a natural-language message.
 */
export type Plan = "STARTER" | "GROWTH" | "PRO" | "ENTERPRISE";

const PRO_PLUS = ["PRO", "ENTERPRISE"];
const GROWTH_PLUS = ["GROWTH", ...PRO_PLUS];

export function mainMenu(plan: Plan = "STARTER"): string {
  const lines = [
    "🏦 *Vertofi — Mobile CFO*",
    "Reply with a number or keyword:",
    "",
    "📊 1. Dashboard",
    "💰 2. Sales",
    "🛒 3. Purchases",
    "📦 4. Inventory",
    "👥 5. Customers",
    "🏢 6. Vendors",
    "📈 7. Reports",
    "🧾 8. GST & Compliance",
    "🤖 9. Ask Vertofi (AI)",
    "🆘 10. Business Lifeguard",
  ];
  if (GROWTH_PLUS.includes(plan)) lines.push("💡 11. Financial Intelligence");
  if (PRO_PLUS.includes(plan)) lines.push("🧠 12. Virtual Business Director");
  lines.push("⚙️ 13. Settings");
  lines.push("", "_Tip: you can also just type, send a voice note, photo or PDF._");
  return lines.join("\n");
}

const SUB: Record<string, string> = {
  sales: [
    "💰 *Sales*",
    "1. Create Invoice",
    "2. View Invoices",
    "3. Outstanding Payments",
    "4. Credit Notes",
    "5. Send Reminder",
    "6. Sales Report",
    "",
    "To create: type *new invoice* (or *new quotation*, *new proforma*, *new credit note*, *new delivery challan*) for step-by-step questions, say it in one line (_\"Invoice ABC Traders 50 bags @ ₹420\"_), send a 🎤 voice note, or 📄 upload.",
  ].join("\n"),
  purchases: [
    "🛒 *Purchases*",
    "1. Record Purchase",
    "2. Upload Purchase Bill (📄 send the PDF)",
    "3. Vendor Bills",
    "4. Outstanding Payables",
    "5. Purchase Report",
    "",
    "Upload a bill and I'll extract vendor, GST, items, tax & amount for approval.",
  ].join("\n"),
  inventory: [
    "📦 *Inventory & Products*",
    "1. Add Stock",
    "2. Reduce Stock",
    "3. Stock Summary",
    "4. Low Stock Alerts",
    "5. Inventory Report",
    "",
    "📷 *Add products fast:* type *add products* and send a photo of your price list — I'll read the items & prices for you.",
    "Try: _\"Received 500 units of Product A\"_.",
  ].join("\n"),
  customers: [
    "👥 *Customers*",
    "1. Add Customer",
    "2. View Customer",
    "3. Outstanding Amount",
    "4. Customer Ledger",
    "5. Send Statement",
    "",
    "Try: _\"Show ABC Traders balance\"_.",
  ].join("\n"),
  vendors: [
    "🏢 *Vendors*",
    "1. Add Vendor",
    "2. Vendor Ledger",
    "3. Vendor Payments",
    "4. Vendor Trust Score",
    "5. Outstanding Payables",
  ].join("\n"),
  reports: [
    "📈 *Reports*",
    "1. Sales Report",
    "2. Purchase Report",
    "3. Profit & Loss",
    "4. Balance Sheet",
    "5. Cash Flow",
    "6. GST Reports",
    "7. Inventory Report",
    "8. Business Health Score",
    "9. MoneyMap Summary",
    "",
    "Try: _\"Generate P&L for May\"_.",
  ].join("\n"),
  gst: [
    "🧾 *GST & Compliance*",
    "1. GST Liability",
    "2. GST Summary",
    "3. GSTR Status",
    "4. Tax Warnings",
    "5. Compliance Calendar",
    "6. Notices",
    "",
    "Try: _\"How much GST is due?\"_.",
  ].join("\n"),
  ai: [
    "🤖 *Ask Vertofi*",
    "Just ask in plain words. Examples:",
    "• Show cashflow",
    "• Create invoice for ABC",
    "• Record expense ₹25,000 rent",
    "• Can I hire 2 employees?",
    "• Which vendor is risky?",
    "• What is my profit this month?",
  ].join("\n"),
  lifeguard: [
    "🆘 *Business Lifeguard*",
    "Reply with the emergency:",
    "1. GST Notice",
    "2. Tax Notice",
    "3. Fraud",
    "4. Cashflow Crisis",
    "5. Vendor Dispute",
    "",
    "An analyst is assigned instantly.",
  ].join("\n"),
  dashboard: [
    "📊 *Today*",
    "Type *briefing* for your morning summary (Health Score, cash position, GST due, top alert).",
  ].join("\n"),
  settings: "⚙️ *Settings*\n1. Plan & Billing\n2. Users\n3. Notifications\n4. Language",
};

const NUMBER_TO_SECTION: Record<string, string> = {
  "1": "dashboard", "2": "sales", "3": "purchases", "4": "inventory", "5": "customers",
  "6": "vendors", "7": "reports", "8": "gst", "9": "ai", "10": "lifeguard", "13": "settings",
};

const KEYWORDS: Record<string, string> = {
  sales: "sales", invoice: "sales", purchase: "purchases", purchases: "purchases",
  inventory: "inventory", stock: "inventory", customer: "customers", customers: "customers",
  vendor: "vendors", vendors: "vendors", report: "reports", reports: "reports",
  gst: "gst", compliance: "gst", ai: "ai", assistant: "ai", lifeguard: "lifeguard",
  sos: "lifeguard", help: "lifeguard", settings: "settings", dashboard: "dashboard",
};

/** Returns a menu/navigation reply, or null if the AI assistant should handle it. */
export function route(text: string, plan: Plan = "STARTER"): string | null {
  const t = text.trim().toLowerCase();
  if (["menu", "hi", "hello", "start", "home", "/menu"].includes(t)) return mainMenu(plan);
  if (NUMBER_TO_SECTION[t]) return SUB[NUMBER_TO_SECTION[t]!] ?? mainMenu(plan);
  // Plan-gated extras
  if (t === "11") return GROWTH_PLUS.includes(plan) ? "💡 Financial Intelligence: Business Health Score, MoneyMap, Predictive Tax, ProfitLeak." : "💡 Available on the Growth plan.";
  if (t === "12") return PRO_PLUS.includes(plan) ? SUB.ai! : "🧠 Virtual Business Director is a Pro feature.";
  const kw = KEYWORDS[t];
  if (kw) return SUB[kw] ?? mainMenu(plan);
  return null; // natural language → AI
}
