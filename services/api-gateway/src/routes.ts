/**
 * Service routing table. The gateway is the only public ingress (docs/02, 15).
 * Each entry maps a path prefix to an upstream service. `public` paths skip
 * JWT verification (login, registration, webhooks that carry their own auth).
 */
export interface RouteDef {
  prefix: string;
  target: string;
  /** Path prefixes under this route that do NOT require a JWT. */
  publicPaths?: string[];
}

const env = (k: string, d: string) => process.env[k] ?? d;

export const routes: RouteDef[] = [
  {
    prefix: "/api/v1/auth",
    target: env("AUTH_URL", "http://localhost:4001"),
    publicPaths: ["/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/otp", "/api/v1/auth/firebase", "/api/v1/auth/token/refresh"],
  },
  { prefix: "/api/v1/access", target: env("ACCESS_URL", "http://localhost:4003") },
  { prefix: "/api/v1/tenant", target: env("TENANT_URL", "http://localhost:4002") },
  { prefix: "/api/v1/audit", target: env("AUDIT_URL", "http://localhost:4004") },
  { 
    prefix: "/api/v1/onboarding", 
    target: env("ONBOARDING_URL", "http://localhost:4005"),
    publicPaths: ["/api/v1/onboarding/landing-contact"],
  },
  { prefix: "/api/v1/documents", target: env("DOCUMENT_URL", "http://localhost:4006") },
  {
    prefix: "/api/v1/billing",
    target: env("BILLING_URL", "http://localhost:4007"),
    // Razorpay webhook carries its own signature; plans listing is public.
    publicPaths: ["/api/v1/billing/webhook/razorpay", "/api/v1/billing/plans"],
  },
  { prefix: "/api/v1/ledger", target: env("LEDGER_URL", "http://localhost:4011") },
  { prefix: "/api/v1/notifications", target: env("NOTIFICATION_URL", "http://localhost:4009") },
  { prefix: "/api/v1/reconcile", target: env("RECONCILIATION_URL", "http://localhost:4013") },
  { prefix: "/api/v1/exceptions", target: env("EXCEPTION_URL", "http://localhost:4014") },
  { prefix: "/api/v1/bank", target: env("BANK_CONNECTOR_URL", "http://localhost:4015") },
  { prefix: "/api/v1/gst", target: env("GST_CONNECTOR_URL", "http://localhost:4016") },
  { prefix: "/api/v1/external-sync", target: env("ACCOUNTING_SYNC_URL", "http://localhost:4017") },
  { prefix: "/api/v1/bhs", target: env("BHS_URL", "http://localhost:4019") },
  { prefix: "/api/v1/reports", target: env("REPORTING_URL", "http://localhost:4020") },
  { prefix: "/api/v1/predict", target: env("PREDICTION_URL", "http://localhost:4021") },
  { prefix: "/api/v1/lifeguard", target: env("LIFEGUARD_URL", "http://localhost:4022") },
  { prefix: "/api/v1/vendors", target: env("VENDOR_URL", "http://localhost:4023") },
  { prefix: "/api/v1/vbd", target: env("VBD_URL", "http://localhost:4024") },
  { prefix: "/api/v1/legal", target: env("LEGAL_URL", "http://localhost:4025"), publicPaths: ["/api/v1/legal/documents"] },
  { prefix: "/api/v1/bhs-intel", target: env("BHS_INTEL_URL", "http://localhost:4026") },
  { prefix: "/api/v1/benchmarks", target: env("BENCHMARKS_URL", "http://localhost:4027") },
  { prefix: "/api/v1/warranty", target: env("WARRANTY_URL", "http://localhost:4028") },
  { prefix: "/api/v1/verification", target: env("VERIFICATION_URL", "http://localhost:4029") },
  // Internal admin console — ADMIN-only at the service; in prod reachable only
  // via the internal gateway path (docs/23, docs/24).
  { prefix: "/api/v1/admin-console", target: env("ADMIN_CONSOLE_URL", "http://localhost:4030") },
  { prefix: "/api/v1/accounting", target: env("ACCOUNTING_URL", "http://localhost:4031") },
];

export function isPublic(path: string): boolean {
  return routes.some((r) => r.publicPaths?.some((p) => path.startsWith(p)));
}

export function matchRoute(path: string): RouteDef | undefined {
  return routes.find((r) => path.startsWith(r.prefix));
}
