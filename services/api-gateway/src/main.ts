import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Redis } from "ioredis";
import { createProxyMiddleware } from "http-proxy-middleware";
import { JwtService, claimsToPrincipal } from "@vertofi/auth-guards";
import { createLogger } from "@vertofi/observability";
import { isPublic, matchRoute, routes } from "./routes.js";

const log = createLogger("api-gateway");
const PORT = Number(process.env.GATEWAY_PORT ?? 4000);

/**
 * CORS allowlist (docs/19). Browser apps (landing 3000, business 3001,
 * panels 3002, internal admin 3003) call the gateway from a different origin;
 * without this every request fails CORS preflight. Origins are env-driven so
 * production domains slot in without code changes. Credentials enabled for
 * cookie-based hardening later; Authorization header is always allowed.
 */
const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,https://business.vertofi.com,https://associates.vertofi.com,https://accountants.vertofi.com,https://legal.vertofi.com,https://bhs.vertofi.com,https://admin.vertofi.com,https://teams.vertofi.com,https://vertofi.com"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Vercel mints a new origin per deployment (preview + production aliases), so an
// exact list goes stale on every deploy. Allow any deployment under our Vercel
// team in addition to the explicit allowlist. The team slug is env-driven
// (CORS_VERCEL_TEAM) so no project-specific URL is baked into the source.
const VERCEL_TEAM = (process.env.CORS_VERCEL_TEAM ?? "").trim();
const VERCEL_ORIGIN = VERCEL_TEAM
  ? new RegExp(`^https://[a-z0-9-]+-${VERCEL_TEAM.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.vercel\\.app$`)
  : null;
function isAllowedOrigin(origin: string): boolean {
  return allowedOrigins.includes(origin) || (VERCEL_ORIGIN ? VERCEL_ORIGIN.test(origin) : false);
}

const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow same-origin / server-to-server (no Origin header) and allowlisted browsers.
    if (!origin || isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error("origin_not_allowed"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Approval-Otp-Id", "X-Vertofi-Csrf"],
  exposedHeaders: ["X-RateLimit-Remaining", "Retry-After"],
  maxAge: 86400,
});

const jwt = new JwtService({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
});

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS first so even errors/preflights carry the right headers (no CORS errors).
app.use(corsMiddleware);
app.options("*", corsMiddleware);

// Health (for ALB / k8s probes) — must not be rate-limited or authed.
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/ready", (_req, res) => res.json({ status: "ok" }));

// Integration configuration visibility (no secrets, no network calls).
// Mirrors @vertofi/nest-common integrationsHealth for the Express gateway.
const isSet = (name: string): boolean => {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  if (!v) return false;
  return !["needs_configuration", "change-me", "your-", "example", "xxxx", "placeholder", "sk-proj-your-openai-key-here"].some(
    (p) => v.includes(p),
  );
};
const grp = (...vars: string[]) => (vars.every(isSet) ? "configured" : "needs_configuration");
app.get("/health/integrations", (_req, res) =>
  res.json({
    database: grp("DATABASE_URL"),
    redis: grp("REDIS_URL"),
    kafka: grp("KAFKA_BROKERS"),
    storage: grp("S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET"),
    jwt: grp("JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"),
    smtp: grp("SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"),
    sms: grp("MSG91_AUTH_KEY", "MSG91_SENDER_ID", "MSG91_TEMPLATE_ID"),
    whatsapp: grp("WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN"),
    razorpay: grp("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"),
    gst: grp("GST_GSP_BASE_URL", "GST_GSP_CLIENT_ID", "GST_GSP_CLIENT_SECRET"),
    banking: grp("AA_BASE_URL", "AA_CLIENT_ID", "AA_CLIENT_SECRET"),
    openai: grp("OPENAI_API_KEY"),
    gemini: grp("GEMINI_API_KEY"),
    ocr_vision: grp("GOOGLE_VISION_KEY"),
  }),
);

// ── Normalized inbound webhook callback URLs (docs/PROVIDER_ONBOARDING.md) ──
// Public (placed before the auth middleware); each provider authenticates its
// own callback via signature/verify-token. These stable URLs let providers be
// configured now and validated later, proxying to the existing handlers.
const WHATSAPP_URL = process.env.WHATSAPP_URL ?? "http://localhost:4018";
const BILLING_URL = process.env.BILLING_URL ?? "http://localhost:4007";
const GST_URL = process.env.GST_CONNECTOR_URL ?? "http://localhost:4016";
const BANK_URL = process.env.BANK_CONNECTOR_URL ?? "http://localhost:4015";
const webhookProxies: Array<[string, string, (p: string) => string]> = [
  ["/api/webhooks/whatsapp", WHATSAPP_URL, (p) => "/webhook/whatsapp" + (p.startsWith("/") ? p.slice(1) : p)],
  ["/api/webhooks/razorpay", BILLING_URL, (p) => "/billing/webhook/razorpay" + (p.startsWith("/") ? p.slice(1) : p)],
  ["/api/webhooks/gst", GST_URL, (p) => "/gst/webhook" + (p.startsWith("/") ? p.slice(1) : p)],
  ["/api/webhooks/banking", BANK_URL, (p) => "/bank/webhook" + (p.startsWith("/") ? p.slice(1) : p)],
];
for (const [path, target, rewrite] of webhookProxies) {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: (p: string) => rewrite(p),
    }),
  );
}

// Global rate limit (docs/19). Redis-backed so all gateway replicas share the
// same counter — with in-memory store the effective limit was limit × replicas,
// making it useless. Falls back to memory-store when REDIS_URL is absent (dev).
const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
    })
  : null;

if (redisClient) {
  redisClient.on('error', (err: Error) =>
    log.warn({ err: err.message }, "rate-limit redis connect failed — using memory fallback"),
  );
}

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: Number(process.env.RATE_LIMIT_PER_MIN ?? 600),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      const auth = req.headers.authorization;
      return auth ? `t:${auth.slice(-24)}` : `ip:${req.ip}`;
    },
    // Use Redis store when available; graceful fallback to memory in dev.
    ...(redisClient
      ? {
          store: new RedisStore({
            sendCommand: (...args: string[]) => (redisClient as any).call(...args),
            prefix: "rl:",
          }),
        }
      : {}),
  }),
);

/**
 * Extract the access token from the Authorization header (Bearer) or, additively,
 * an httpOnly `vertofi.at` cookie. Cookie auth is the migration target (keeps the
 * token out of JS-readable storage); the header path is unchanged so existing
 * clients are unaffected. Cookie auth is CSRF-gated in the middleware below.
 */
function extractToken(req: Request): { token: string; via: "header" | "cookie" } | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return { token: header.slice(7), via: "header" };
  const cookie = req.headers.cookie;
  if (cookie) {
    const m = /(?:^|;\s*)vertofi\.at=([^;]+)/.exec(cookie);
    if (m) return { token: decodeURIComponent(m[1]!), via: "cookie" };
  }
  return null;
}

// AuthN: verify JWT for non-public routes, inject principal headers downstream.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/health" || req.path === "/ready" || isPublic(req.path)) return next();
  const got = extractToken(req);
  if (!got) return res.status(401).json({ errors: [{ code: "unauthorized" }] });
  // CSRF: cookies are auto-sent by the browser, so a cookie-authenticated request
  // must also carry a custom header. Browsers force a CORS preflight for custom
  // headers, and the origin allowlist (above) rejects non-allowlisted sites — so a
  // cross-site page cannot complete an authenticated cookie call. Bearer-header
  // auth is immune to CSRF (never auto-sent) and is exempt.
  if (got.via === "cookie" && !req.headers["x-vertofi-csrf"]) {
    return res.status(403).json({ errors: [{ code: "csrf_required" }] });
  }
  try {
    const claims = jwt.verifyAccess(got.token);
    const principal = claimsToPrincipal(claims);
    // Forward identity to upstreams (they re-verify the JWT too — defense in depth).
    req.headers["x-principal-id"] = principal.userId;
    req.headers["x-principal-role"] = principal.role;
    if (principal.orgId) req.headers["x-principal-org"] = principal.orgId;
    // When the client authenticated via cookie, synthesize the Authorization
    // header for upstreams — every service re-verifies the JWT from the Bearer
    // header, so cookie auth must be normalized to a header before proxying.
    if (got.via === "cookie") req.headers["authorization"] = `Bearer ${got.token}`;
    return next();
  } catch {
    return res.status(401).json({ errors: [{ code: "invalid_token" }] });
  }
});

// ── Subscription gate (user requirement: stop services if payment fails) ──
// Business users may use the app only while their org is TRIAL (not expired) or
// ACTIVE. When autopay fails the org goes PAST_DUE and every business API call
// gets 402 → the app routes them to /reactivate. Exempts the routes needed to
// log in, view the org, and PAY (auth/billing/access/tenant) AND the pre-payment
// signup steps (onboarding + legal consent) — these run BEFORE a subscription
// exists, so gating them would 402-deadlock signup (and the pre-payment access
// check would poison the cache below, 402-ing the dashboard right after payment).
// Result is cached briefly so this adds ~0 latency, and FAILS OPEN if billing is
// unreachable so a billing outage never locks paying customers out.
const GATE_EXEMPT = ["/api/v1/auth", "/api/v1/billing", "/api/v1/access", "/api/v1/tenant", "/api/v1/onboarding", "/api/v1/legal"];
const accessCache = new Map<string, { active: boolean; exp: number }>();
async function orgIsActive(orgId: string, authHeader: string): Promise<boolean> {
  const cached = accessCache.get(orgId);
  if (cached && cached.exp > Date.now()) return cached.active;
  const r = await fetch(`${BILLING_URL}/billing/${orgId}/access`, { headers: { authorization: authHeader } });
  if (!r.ok) throw new Error(`billing_${r.status}`); // fail-open (caught below)
  const j = (await r.json()) as { active?: boolean };
  const active = !!j.active;
  accessCache.set(orgId, { active, exp: Date.now() + 60_000 });
  return active;
}
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS" || req.path === "/health" || req.path === "/ready" || isPublic(req.path)) return next();
  const role = req.headers["x-principal-role"] as string | undefined;
  if (role !== "BUSINESS_OWNER" && role !== "BUSINESS_USER") return next(); // only business users are gated
  if (GATE_EXEMPT.some((p) => req.path.startsWith(p))) return next();
  const orgId = req.headers["x-principal-org"] as string | undefined;
  if (!orgId) return next();
  try {
    if (!(await orgIsActive(orgId, req.headers.authorization ?? ""))) {
      return res.status(402).json({
        errors: [{ code: "subscription_inactive", message: "Your subscription is inactive. Complete payment to continue using Vertofi." }],
      });
    }
  } catch (err) {
    log.warn({ err: (err as Error).message, orgId }, "billing gate check failed — allowing (fail-open)");
  }
  return next();
});

// Reverse-proxy each route prefix to its upstream service.
//
// IMPORTANT: Express `app.use(route.prefix, mw)` strips the mount (route.prefix)
// from req.url, so by the time the proxy runs req.url is already "/rest" — the
// "/api/v1/<segment>" is gone. http-proxy-middleware v3 (non-legacy) does NOT
// restore req.originalUrl before pathRewrite, so the old strip-regex never
// matched (dead code) and every segment-prefixed upstream
// (@Controller("auth"|"gst"|"accounting"|…)) received "/rest" and 404'd. We
// prepend the service segment back so the upstream keeps its NestJS controller
// base path, e.g. /api/v1/gst/einvoice -> proxied as /gst/einvoice. Root
// controllers (tenant/access/billing) were given matching @Controller("<seg>").
for (const route of routes) {
  const segment = route.prefix.replace(/^\/api\/v1/, ""); // e.g. "/gst", "/auth"
  app.use(
    route.prefix,
    createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: (path: string) => `${segment}${path}`,
      on: {
        // Re-assert CORS headers on the proxied response so upstream headers
        // can never clobber them — guarantees no CORS errors reach the browser.
        proxyRes: (proxyRes: any, req: any) => {
          const origin = (req.headers as Record<string, string>).origin;
          if (origin && isAllowedOrigin(origin)) {
            proxyRes.headers["access-control-allow-origin"] = origin;
            proxyRes.headers["access-control-allow-credentials"] = "true";
            proxyRes.headers["vary"] = "Origin";
          }
        },
        error: (err: any, req: any, res: any) => {
          log.error({ err: err.message, target: route.target }, "upstream error");
          // Set CORS headers on the error too, so an upstream failure surfaces
          // as a clean 502 in the browser instead of an opaque CORS error.
          const origin = (req?.headers as Record<string, string> | undefined)?.origin;
          if (origin && isAllowedOrigin(origin) && typeof res.setHeader === "function") {
            res.setHeader("access-control-allow-origin", origin);
            res.setHeader("access-control-allow-credentials", "true");
            res.setHeader("vary", "Origin");
          }
          (res as Response).status?.(502).json?.({ errors: [{ code: "upstream_unavailable" }] });
        },
      },
    }),
  );
}

app.use((_req, res) => res.status(404).json({ errors: [{ code: "not_found" }] }));

app.listen(PORT, () => log.info({ port: PORT }, "api-gateway listening"));
