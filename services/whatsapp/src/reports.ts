/**
 * WhatsApp live reports (docs/10): specific report phrases answer with REAL
 * numbers from the reporting/bhs services, scoped to the sender's own org via
 * a short-lived token (RLS + role checks apply downstream). Anything that
 * doesn't match falls through to menus/AI. No data → honest empty answer.
 */
import { JwtService } from "@vertofi/auth-guards";
import type { WaUser } from "./actions.js";

const REPORTING_URL = process.env.REPORTING_URL ?? "http://localhost:4020";
const BHS_URL = process.env.BHS_URL ?? "http://localhost:4019";

const jwt = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

async function get<T>(base: string, u: WaUser, path: string): Promise<T | null> {
  try {
    const token = jwt.signAccess({ sub: u.userId, role: u.role, orgId: u.orgId, plan: u.plan, sid: "whatsapp" });
    const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

type Pnl = { income: number; expense: number; netProfit: number; margin: number | null };
type Gst = { outputTax: number; inputTaxCredit: number; netGstPayable: number };
type Money = { inflow: number; outflow: number; net: number; hasData: boolean };
type Bhs = { score: number | null; rating: string };

async function pnl(u: WaUser): Promise<string> {
  const r = await get<Pnl>(REPORTING_URL, u, `/reports/${u.orgId}/pnl`);
  if (!r) return "Couldn't fetch your P&L right now — try again in a minute.";
  if (r.income === 0 && r.expense === 0) {
    return "📈 *P&L*: no posted entries yet. Create invoices and record expenses — your live P&L builds itself.";
  }
  return [
    "📈 *Profit & Loss (live)*",
    `Income: ${inr(r.income)}`,
    `Expenses: ${inr(r.expense)}`,
    `*Net ${r.netProfit >= 0 ? "profit" : "loss"}: ${inr(Math.abs(r.netProfit))}*`,
    r.margin !== null ? `Margin: ${(r.margin * 100).toFixed(1)}%` : "",
  ].filter(Boolean).join("\n");
}

async function gst(u: WaUser): Promise<string> {
  const r = await get<Gst>(REPORTING_URL, u, `/reports/${u.orgId}/gst-summary`);
  if (!r) return "Couldn't fetch your GST summary right now — try again in a minute.";
  return [
    "🧾 *GST (live)*",
    `Output tax: ${inr(r.outputTax)}`,
    `Input credit: ${inr(r.inputTaxCredit)}`,
    `*Net payable: ${inr(r.netGstPayable)}*`,
  ].join("\n");
}

async function cash(u: WaUser): Promise<string> {
  const r = await get<Money>(REPORTING_URL, u, `/reports/${u.orgId}/moneymap`);
  if (!r) return "Couldn't fetch your cash position right now — try again in a minute.";
  if (!r.hasData) return "💰 *Cash*: no bank data connected yet. Connect your bank in the app → Bank Reconciliation.";
  return [
    "💰 *Cash position (live)*",
    `In: ${inr(r.inflow)}`,
    `Out: ${inr(r.outflow)}`,
    `*Net: ${inr(r.net)}*`,
  ].join("\n");
}

async function health(u: WaUser): Promise<string> {
  const r = await get<Bhs>(BHS_URL, u, `/bhs/${u.orgId}`);
  if (!r) return "Couldn't fetch your Health Score right now — try again in a minute.";
  if (r.score === null) return "❤️ *Health Score*: not computed yet — it generates once your business data starts flowing.";
  return `❤️ *Business Health Score: ${r.score}/100* (${r.rating})`;
}

async function briefing(u: WaUser): Promise<string> {
  const [h, c, g] = await Promise.all([health(u), cash(u), gst(u)]);
  return ["☀️ *Your briefing*", "", h, "", c, "", g].join("\n");
}

const COMMANDS: [RegExp, (u: WaUser) => Promise<string>][] = [
  [/^(briefing|daily briefing|morning briefing)$/i, briefing],
  [/^(pnl|p&l|p and l|profit ?(and|&)? ?loss|profit)$/i, pnl],
  [/^(cash|cashflow|cash flow|moneymap|money map|cash position)$/i, cash],
  [/^(gst due|gst liability|gst summary|tax due|gst payable)$/i, gst],
  [/^(health|health score|score|bhs)$/i, health],
];

/** Live-report reply for an exact report phrase, or null to fall through. */
export async function handleReport(text: string, u: WaUser): Promise<string | null> {
  const t = text.trim();
  for (const [re, fn] of COMMANDS) {
    if (re.test(t)) return fn(u);
  }
  return null;
}
