/**
 * Integration configuration status (docs/ENVIRONMENT_SETUP.md).
 *
 * A single, env-driven view of which external providers are configured for the
 * running deployment. Used by GET /health/integrations on every service so that
 * operators (and the admin console) can see, at a glance, which integrations are
 * live and which still need credentials — WITHOUT exposing any secret values.
 *
 * "configured"        = all required env vars present, non-empty, not placeholders
 * "needs_configuration" = at least one required var is missing/blank/placeholder
 *
 * This never throws and performs no network calls: missing credentials must only
 * disable a feature, never crash the platform.
 */
export type IntegrationStatus = "configured" | "needs_configuration";

/** Placeholder markers that count as "not really configured". */
const PLACEHOLDERS = [
  "needs_configuration",
  "change-me",
  "your-",
  "example",
  "xxxx",
  "todo",
  "placeholder",
  "sk-proj-your-openai-key-here",
];

function isSet(name: string): boolean {
  const raw = process.env[name];
  if (raw === undefined) return false;
  const v = raw.trim();
  if (v.length === 0) return false;
  const lower = v.toLowerCase();
  return !PLACEHOLDERS.some((p) => lower.includes(p));
}

/** Every required var present (and real) → configured. */
function group(...vars: string[]): IntegrationStatus {
  return vars.every(isSet) ? "configured" : "needs_configuration";
}

/**
 * The canonical integration → required-env map. Keep in sync with
 * .env.example / docs/ENVIRONMENT_SETUP.md.
 */
export function integrationsHealth(): Record<string, IntegrationStatus> {
  return {
    // Core infrastructure (platform cannot serve without these)
    database: group("DATABASE_URL"),
    redis: group("REDIS_URL"),
    kafka: group("KAFKA_BROKERS"),
    storage: group("S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET"),
    jwt: group("JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"),

    // Authentication delivery
    smtp: group("SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"),
    sms: group("MSG91_AUTH_KEY", "MSG91_SENDER_ID", "MSG91_TEMPLATE_ID"),

    // Communications
    whatsapp: group("WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN"),

    // Payments
    razorpay: group("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"),
    razorpay_webhook: group("RAZORPAY_WEBHOOK_SECRET"),

    // Financial connectors
    gst: group("GST_GSP_BASE_URL", "GST_GSP_CLIENT_ID", "GST_GSP_CLIENT_SECRET"),
    banking: group("AA_BASE_URL", "AA_CLIENT_ID", "AA_CLIENT_SECRET"),

    // Accounting sync targets (any one target is enough to be "configured")
    accounting_sync:
      isSet("TALLY_CONNECTOR_URL") || isSet("ZOHO_CLIENT_ID") || isSet("QBO_CLIENT_ID")
        ? "configured"
        : "needs_configuration",

    // Intelligence
    openai: group("OPENAI_API_KEY"),
    gemini: group("GEMINI_API_KEY"),

    // OCR
    ocr_vision: group("GOOGLE_VISION_KEY"),
  };
}
