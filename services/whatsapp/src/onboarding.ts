/**
 * WhatsApp onboarding flow — GAP-4 fix.
 *
 * When an unregistered phone number messages Vertofi, instead of a generic
 * error, we send a friendly guided message that:
 *   1. Introduces Vertofi
 *   2. Gives the exact registration URL with their number pre-filled
 *   3. Explains how to link an existing account
 *
 * Also handles the daily briefing scheduler: fires at 9:00 AM IST for all
 * users who have opted in to daily briefings (wa_briefing_opt_in = true).
 */
import { Pool } from "pg";
import { EventProducer } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { WhatsappConnector } from "./whatsapp.connector.js";

const log = createLogger("whatsapp-onboarding");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

/** Normalize Meta's E.164 (919812345678) to 10-digit Indian mobile. */
function normalize(waNumber: string): string {
  const digits = waNumber.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Sent to any phone number that messages Vertofi but isn't linked to an account.
 * Returns the text to send — caller handles the actual send.
 */
export function buildOnboardingMessage(waNumber: string): string {
  const mobile = normalize(waNumber);
  const regUrl = `https://vertofi.com/register?ref=whatsapp&mobile=${mobile}`;
  return [
    "👋 *Welcome to Vertofi!*",
    "Your AI-powered CFO — run your whole business right here on WhatsApp.",
    "",
    "Here's what I can do for you:",
    "🧾 Create invoices & record purchases — just type or send a photo/PDF of a bill",
    "💰 Track cashflow, payments & outstanding dues",
    "📊 GST liability, due dates & compliance alerts",
    "📦 Inventory & stock updates",
    "🤖 Ask me anything: _\"What's my profit this month?\"_, _\"Can I afford to hire?\"_",
    "🔔 Daily morning briefing with your numbers",
    "",
    "*To activate, link this number to your Vertofi account — 2 ways:*",
    "",
    `*1️⃣ New here?* Create your free account (takes 2 minutes):`,
    regUrl,
    `_Use this same mobile number (${mobile}) when you sign up so we can auto-link it._`,
    "",
    "*2️⃣ Already have an account?*",
    "Reply here: *link <your registered mobile>* — e.g. _link 9812345678_.",
    "A 6-digit code appears in your dashboard notifications; reply it here and you're connected.",
    "",
    "Once linked, send *menu* to see everything you can do. 🚀",
    "",
    "_Need a hand? Email support@vertofi.com and we'll set you up._",
  ].join("\n");
}

// ─── Daily Briefing Scheduler ─────────────────────────────────────────────────

interface BriefingUser {
  org_id: string;
  mobile: string;
  balance: number;
  gst_due: string;
  top_alert: string;
}

/**
 * Called once at 9:00 AM IST. Fetches all opted-in users with their daily
 * summary and publishes a Kafka event for each — the notification consumer
 * handles the actual WhatsApp send.
 */
export async function scheduleDailyBriefings(producer: EventProducer): Promise<void> {
  log.warn({}, "running daily briefing scheduler");
  try {
    const rows = await pool.query<BriefingUser>(
      `SELECT
         u.org_id,
         u.mobile,
         COALESCE(snapshot.balance, 0)         AS balance,
         COALESCE(gst.next_due, 'None')        AS gst_due,
         COALESCE(alert.message, 'All clear ✅') AS top_alert
       FROM auth.users u
       -- Latest cash balance from accounting snapshot
       LEFT JOIN LATERAL (
         SELECT balance FROM accounting.cashflow_snapshots
         WHERE org_id = u.org_id ORDER BY created_at DESC LIMIT 1
       ) snapshot ON true
       -- Nearest upcoming GST deadline
       LEFT JOIN LATERAL (
         SELECT TO_CHAR(due_date, 'DD Mon YYYY') AS next_due
         FROM gst.compliance_calendar
         WHERE org_id = u.org_id AND due_date >= CURRENT_DATE
         ORDER BY due_date ASC LIMIT 1
       ) gst ON true
       -- Top active alert from lifeguard
       LEFT JOIN LATERAL (
         SELECT message FROM lifeguard.alerts
         WHERE org_id = u.org_id AND resolved_at IS NULL
         ORDER BY severity DESC, created_at DESC LIMIT 1
       ) alert ON true
       WHERE u.role = 'OWNER'
         AND u.status = 'ACTIVE'
         AND u.wa_briefing_opt_in = true
         AND u.mobile IS NOT NULL`,
    );

    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });

    for (const row of rows.rows) {
      await producer.publish({
        event: "whatsapp.daily.briefing",
        org_id: row.org_id,
        actor_id: "system",
        data: {
          orgId: row.org_id,
          date: today,
          balance: row.balance,
          gstDue: row.gst_due,
          topAlert: row.top_alert,
        },
      });
    }

    log.warn({ count: rows.rows.length }, "daily briefings scheduled");
  } catch (err) {
    log.error({ err: String(err) }, "daily briefing scheduler failed");
  }
}

/**
 * Start the 9 AM IST cron: runs scheduleDailyBriefings() once per day.
 * Uses a simple interval check rather than a cron library to keep dependencies minimal.
 */
export function startBriefingScheduler(producer: EventProducer): void {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30

  function msUntilNext9AM(): number {
    const nowUtc = Date.now();
    const nowIst = new Date(nowUtc + IST_OFFSET_MS);
    const next9AM = new Date(nowIst);
    next9AM.setHours(9, 0, 0, 0);
    if (next9AM <= nowIst) next9AM.setDate(next9AM.getDate() + 1);
    return next9AM.getTime() - nowIst.getTime();
  }

  function scheduleNext(): void {
    const delay = msUntilNext9AM();
    log.warn({ nextInMinutes: Math.round(delay / 60_000) }, "briefing scheduler: next run");
    setTimeout(async () => {
      await scheduleDailyBriefings(producer);
      scheduleNext(); // reschedule for next day
    }, delay);
  }

  scheduleNext();
}
