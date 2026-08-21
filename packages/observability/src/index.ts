import pino, { type Logger } from "pino";

/**
 * Structured logging (see docs/16-observability.md). JSON logs correlated by
 * correlation_id + org_id. PII must be redacted by callers before logging.
 */
const PII_REDACT = [
  "*.password",
  "*.token",
  "*.access_token",
  "*.refresh_token",
  "*.authorization",
  "*.otp",
  "*.code",
  "*.aadhaar",
  "*.account_number",
  "req.headers.authorization",
];

export function createLogger(service: string): Logger {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
    redact: { paths: PII_REDACT, censor: "[redacted]" },
    formatters: { level: (label) => ({ level: label }) },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type { Logger };

/** Standard health/readiness payloads (see docs/16). */
export interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
}

export async function runReadiness(checks: HealthCheck[]): Promise<{
  status: "ok" | "degraded";
  checks: Record<string, "ok" | "fail">;
}> {
  const results: Record<string, "ok" | "fail"> = {};
  let healthy = true;
  await Promise.all(
    checks.map(async (c) => {
      try {
        results[c.name] = (await c.check()) ? "ok" : "fail";
      } catch {
        results[c.name] = "fail";
      }
      if (results[c.name] === "fail") healthy = false;
    }),
  );
  return { status: healthy ? "ok" : "degraded", checks: results };
}
