/**
 * Notification Event Consumer — the platform's "everything connects" last mile.
 *
 * Subscribes to the same platform topics the WhatsApp consumer handles and
 * writes an IN_APP notification row for the affected business owner, so every
 * module action surfaces in the app's notification feed. WARNING/CRITICAL
 * events are additionally emailed via the shared SMTP relay (same env contract
 * as auth's EmailConnector: SMTP_HOST/PORT/USER/PASS/FROM).
 *
 * Channels per event:
 *   IN_APP  — always (this consumer)
 *   WHATSAPP — whatsapp service's notification.consumer (already live)
 *   EMAIL   — here, for WARNING/CRITICAL severities
 */
import { Pool } from "pg";
import nodemailer, { type Transporter } from "nodemailer";
import { EventConsumer, Topics } from "@vertofi/events";
import { createLogger } from "@vertofi/observability";

const log = createLogger("notification-consumer");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

// ── email (optional — skipped when SMTP unconfigured) ───────────────────────
let transporter: Transporter | null = null;
function smtp(): Transporter | null {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: SMTP_HOST, port, secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

interface Owner { id: string; email: string | null; org_name: string | null }

async function ownerOfOrg(orgId: string): Promise<Owner | null> {
  const r = await pool.query<Owner>(
    `SELECT u.id, u.email, o.legal_name AS org_name
       FROM auth.users u JOIN tenant.organizations o ON o.id = u.org_id
      WHERE u.org_id = $1 AND u.role = 'BUSINESS_OWNER' AND u.status = 'ACTIVE' LIMIT 1`,
    [orgId],
  );
  return r.rows[0] ?? null;
}

type Severity = "INFO" | "WARNING" | "CRITICAL";

/** Write the IN_APP row; email too when severity warrants and SMTP is up. */
async function notify(opts: {
  userId: string; orgId: string | null; email?: string | null;
  template: string; title: string; body: string; severity: Severity;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `INSERT INTO notification.notifications
       (org_id, user_id, channel, template, title, body, severity, payload, status, sent_at)
     VALUES ($1,$2,'IN_APP',$3,$4,$5,$6,$7,'SENT',now())`,
    [opts.orgId, opts.userId, opts.template, opts.title, opts.body, opts.severity, JSON.stringify(opts.payload ?? {})],
  );
  if (opts.severity !== "INFO" && opts.email) {
    const t = smtp();
    if (t) {
      try {
        await t.sendMail({
          from: process.env.SMTP_FROM,
          to: opts.email,
          subject: `Vertofi — ${opts.title}`,
          text: `${opts.body}\n\nOpen Vertofi to act on this.\n— Vertofi`,
        });
        await pool.query(
          `INSERT INTO notification.notifications
             (org_id, user_id, channel, template, title, body, severity, payload, status, sent_at)
           VALUES ($1,$2,'EMAIL',$3,$4,$5,$6,'{}','SENT',now())`,
          [opts.orgId, opts.userId, opts.template, opts.title, opts.body, opts.severity],
        );
      } catch (err) {
        log.error({ err: String(err) }, "email send failed");
      }
    }
  }
}

const inr = (n: unknown) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

export async function startEventsConsumer(): Promise<void> {
  // Subscribe to the CANONICAL topics (topicForEvent maps each event's domain to
  // a "<domain>.events" topic); dispatch is by envelope.event inside the handler.
  const consumer = new EventConsumer({
    clientId: "notification-service",
    brokers,
    groupId: "notification-inapp-consumer",
    topics: [Topics.lifeguard, Topics.bhs, Topics.accounting],
    maxRetries: 3,
    partitionsConsumedConcurrently: 2,
  });

  // Risk escalation (Business Lifeguard) — the highest-value alert. CRITICAL → email too.
  consumer.on<{ case_id: string; category: string }>("lifeguard.case.escalated", async (env) => {
    if (!env.org_id) return;
    const o = await ownerOfOrg(env.org_id);
    if (!o) return;
    const cat = env.data.category.replaceAll("_", " ").toLowerCase();
    await notify({
      userId: o.id, orgId: env.org_id, email: o.email, severity: "CRITICAL",
      template: "risk_escalation", title: "Business risk alert",
      body: `A ${cat} risk was flagged for ${o.org_name ?? "your business"} and escalated for review. Open Vertofi Lifeguard to act.`,
      payload: env.data,
    });
  });

  // Health score recomputed.
  consumer.on<{ score: number; rating: string }>("bhs.computed", async (env) => {
    if (!env.org_id) return;
    const o = await ownerOfOrg(env.org_id);
    if (!o) return;
    await notify({
      userId: o.id, orgId: env.org_id, severity: "INFO",
      template: "bhs_score", title: "Business Health Score updated",
      body: `Your Business Health Score is now ${env.data.score}/100 (${env.data.rating}).`,
      payload: env.data,
    });
  });

  // Sales invoice created.
  consumer.on<{ invoice_no: string; total: number }>("accounting.sales.created", async (env) => {
    if (!env.org_id) return;
    const o = await ownerOfOrg(env.org_id);
    if (!o) return;
    await notify({
      userId: o.id, orgId: env.org_id, severity: "INFO",
      template: "invoice_created", title: "Invoice created",
      body: `Invoice ${env.data.invoice_no} for ${inr(env.data.total)} was created.`,
      payload: env.data,
    });
  });

  await consumer.start();
  log.warn({ topics: 3, events: ["lifeguard.case.escalated", "bhs.computed", "accounting.sales.created"] }, "notification IN_APP/email consumer started");
}
