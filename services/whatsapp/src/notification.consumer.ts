/**
 * WhatsApp Notification Consumer — GAP-3 fix.
 *
 * Subscribes to platform Kafka topics and fires the appropriate Meta-approved
 * template message to the affected user's WhatsApp number. This is what makes
 * Vertofi a proactive "Mobile CFO" rather than just a chatbot:
 *
 *   GST filing reminder  → template: gst_reminder
 *   Invoice overdue      → template: invoice_overdue
 *   Payment received     → template: payment_received
 *   Cashflow alert       → template: cashflow_alert
 *   BHS score computed   → template: bhs_score
 *   User registered      → template: welcome
 *   Daily briefing       → template: daily_briefing (triggered by scheduler)
 *
 * Every sent message is also logged to notification.notifications with
 * channel: "WHATSAPP" so users can see their notification history in-app.
 */
import { Pool } from "pg";
import { EventConsumer, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";
import { WhatsappConnector } from "./whatsapp.connector.js";

const log = createLogger("whatsapp-notification");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const connector = new WhatsappConnector();

// ─── User lookup ────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  mobile: string | null;
  first_name: string | null; // derived from email local-part (auth.users has no name column)
  org_name: string | null;
  wa_opt_in: boolean;
}

async function getUserByOrg(orgId: string): Promise<UserRecord | null> {
  const rows = await pool.query<UserRecord>(
    `SELECT u.id, u.mobile, split_part(u.email, '@', 1) AS first_name,
            o.legal_name AS org_name,
            COALESCE(u.wa_notifications_enabled, true) AS wa_opt_in
     FROM auth.users u
     JOIN tenant.organizations o ON o.id = u.org_id
     WHERE u.org_id = $1 AND u.role = 'BUSINESS_OWNER' AND u.status = 'ACTIVE'
     LIMIT 1`,
    [orgId],
  );
  return rows.rows[0] ?? null;
}

async function getUserById(userId: string): Promise<UserRecord | null> {
  const rows = await pool.query<UserRecord>(
    `SELECT u.id, u.mobile, split_part(u.email, '@', 1) AS first_name,
            o.legal_name AS org_name,
            COALESCE(u.wa_notifications_enabled, true) AS wa_opt_in
     FROM auth.users u
     LEFT JOIN tenant.organizations o ON o.id = u.org_id
     WHERE u.id = $1 AND u.status = 'ACTIVE'
     LIMIT 1`,
    [userId],
  );
  return rows.rows[0] ?? null;
}

/** Convert 10-digit Indian mobile to E.164 for Meta (91XXXXXXXXXX). */
function toE164(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// ─── Notification logger ─────────────────────────────────────────────────────

async function logNotification(
  userId: string,
  orgId: string | null,
  template: string,
  title: string,
  body: string,
  sent: boolean,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO notification.notifications
         (org_id, user_id, channel, template, title, body, severity, payload, status, sent_at)
       VALUES ($1,$2,'WHATSAPP',$3,$4,$5,'INFO',$6,$7,now())`,
      [orgId, userId, template, title, body, JSON.stringify({ sent }), sent ? "SENT" : "FAILED"],
    );
  } catch (err) {
    log.error({ err: String(err) }, "failed to log WhatsApp notification");
  }
}

// ─── Template senders ────────────────────────────────────────────────────────

async function sendToUser(
  user: UserRecord,
  orgId: string | null,
  templateName: string,
  title: string,
  body: string,
  ...params: string[]
): Promise<void> {
  if (!user.mobile || !user.wa_opt_in) return;
  const to = toE164(user.mobile);
  const result = await connector.sendTemplate(
    to,
    templateName,
    "en",
    [WhatsappConnector.bodyParams(...params)],
  );
  log.warn({ to, template: templateName, sent: result.sent }, "WhatsApp template sent");
  await logNotification(user.id, orgId, templateName, title, body, result.sent);
}

// ─── Kafka consumer ──────────────────────────────────────────────────────────

export async function startNotificationConsumer(): Promise<void> {
  // Subscribe to CANONICAL topics (topicForEvent maps a domain to "<domain>.events");
  // dispatch is by envelope.event. The previous version subscribed to event-NAME
  // topics that no producer wrote to, so it received nothing — fixed here to the
  // events actually emitted across the platform.
  const consumer = new EventConsumer({
    clientId: "whatsapp-notifications",
    brokers,
    groupId: "whatsapp-notification-consumer",
    topics: [Topics.lifeguard, Topics.bhs, Topics.accounting, Topics.whatsapp],
    maxRetries: 3,
    partitionsConsumedConcurrently: 3,
  });

  // ── Risk escalation (Business Lifeguard) ──────────────────────────────────
  consumer.on<{ case_id: string; category: string }>("lifeguard.case.escalated", async (env) => {
    if (!env.org_id) return;
    const user = await getUserByOrg(env.org_id);
    if (!user) return;
    const cat = env.data.category.replaceAll("_", " ").toLowerCase();
    await sendToUser(
      user, env.org_id,
      "risk_alert", "Business risk alert",
      `A ${cat} risk was flagged and escalated for review.`,
      user.org_name ?? "Your Business", cat,
    );
  });

  // ── Business Health Score recomputed ──────────────────────────────────────
  consumer.on<{ score: number; rating: string }>("bhs.computed", async (env) => {
    if (!env.org_id) return;
    const user = await getUserByOrg(env.org_id);
    if (!user) return;
    await sendToUser(
      user, env.org_id,
      "bhs_score", "Business Health Score",
      `Your Business Health Score is now ${env.data.score}/100 (${env.data.rating}).`,
      user.org_name ?? "Your Business", String(env.data.score), env.data.rating,
    );
  });

  // ── Sales invoice created ─────────────────────────────────────────────────
  consumer.on<{ invoice_no: string; total: number }>("accounting.sales.created", async (env) => {
    if (!env.org_id) return;
    const user = await getUserByOrg(env.org_id);
    if (!user) return;
    const amount = `₹${Number(env.data.total).toLocaleString("en-IN")}`;
    await sendToUser(
      user, env.org_id,
      "invoice_created", "Invoice created",
      `Invoice ${env.data.invoice_no} for ${amount} was created.`,
      user.org_name ?? "Your Business", env.data.invoice_no, amount,
    );
  });

  // ── Daily Briefing (scheduler in main.ts emits whatsapp.daily.briefing) ────
  consumer.on<{ orgId: string; date: string; balance: number; gstDue: string; topAlert: string }>(
    "whatsapp.daily.briefing",
    async (env) => {
      const user = await getUserByOrg(env.data.orgId);
      if (!user) return;
      const balance = `₹${Number(env.data.balance).toLocaleString("en-IN")}`;
      await sendToUser(
        user, env.data.orgId,
        "daily_briefing", "Daily Business Briefing",
        `Briefing for ${env.data.date}: Balance ${balance}`,
        user.org_name ?? "Your Business", env.data.date, balance, env.data.gstDue, env.data.topAlert,
      );
    },
  );

  // ── Signup completed → WhatsApp CFO welcome ───────────────────────────────
  // The registered mobile is already auto-linked (resolveUser). Try a session
  // text first (delivers if the user has ever messaged the bot); outside the
  // 24-hour window Meta requires a pre-approved template, so fall back to
  // WHATSAPP_WELCOME_TEMPLATE. Both outcomes are logged honestly.
  consumer.on<{ mobile: string | null }>("whatsapp.customer.onboarded", async (env) => {
    const mobile = env.data.mobile;
    if (!mobile) return;
    const to = toE164(mobile);
    const welcome = [
      "🎉 *Welcome to Vertofi!*",
      "Your WhatsApp CFO is live on this number — no setup needed.",
      "",
      "Try it right now:",
      "• *menu* — everything I can do",
      "• *new invoice* — create a GST invoice step by step (PDF lands here)",
      "• *pnl* / *cash* / *gst due* / *health* — your live numbers",
      "• Or just ask: _\"What's my profit this month?\"_",
    ].join("\n");
    const text = await connector.sendText(to, welcome);
    let sent = text.sent;
    if (!sent) {
      const tpl = await connector.sendTemplate(
        to,
        process.env.WHATSAPP_WELCOME_TEMPLATE ?? "hello_world",
        process.env.WHATSAPP_WELCOME_TEMPLATE ? "en" : "en_US",
      );
      sent = tpl.sent;
    }
    log.warn({ to, sent }, "onboarding welcome WhatsApp message");
    if (env.org_id) {
      const user = await getUserByOrg(env.org_id);
      if (user) await logNotification(user.id, env.org_id, "welcome_onboard", "Welcome to Vertofi", "WhatsApp CFO welcome sent after signup.", sent);
    }
  });

  await consumer.start();
  log.warn({ topics: 4, events: ["lifeguard.case.escalated", "bhs.computed", "accounting.sales.created", "whatsapp.daily.briefing", "whatsapp.customer.onboarded"] }, "WhatsApp notification consumer started");
}
