/**
 * Admin Panel Middleware — layered security isolation.
 *
 * Layer 0: Cloudflare Access identity (PRIMARY) — verifies the Cloudflare-signed
 *          JWT for an approved Google identity. Works from anywhere after auth;
 *          a direct origin hit that bypasses Cloudflare is rejected. Enforced
 *          whenever CF Access env is configured (CF_ACCESS_TEAM_DOMAIN + AUD).
 * Layer 1: IP allowlist — OPTIONAL defense-in-depth, only when PANEL_REQUIRE_IP=true
 *          (identity is the real gate; static-IP allowlists break remote/mobile work).
 * Layer 2: Permanent panel token — DB-stored UUID cookie (10-year, revocable).
 * Layer 3: Session cookie — JWT session presence check.
 *
 * ALL unauthorized responses return 404, NOT 403 — the panel never confirms it
 * exists to non-authorised visitors.
 *
 * /activate?tok=<uuid> — sets the panel token cookie and redirects to /login.
 */
import { NextRequest, NextResponse } from "next/server";
import { cfAccessConfigured, verifyCfAccess } from "./lib/cf-access";

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const PANEL_SECRET = process.env.PANEL_SECRET ?? "";
const PANEL_NAME = "ADMIN";
// Set PANEL_SKIP_IP_CHECK=true in local dev only — NEVER in production
const SKIP_IP_CHECK = process.env.PANEL_SKIP_IP_CHECK === "true";
// IP allowlist is opt-in defense-in-depth; identity (Layer 0) is the primary gate.
const REQUIRE_IP = process.env.PANEL_REQUIRE_IP === "true";
// The permanent panel-token gate (Layer 2, the /activate?tok= cookie) is also
// opt-in. On a plain *.vercel.app URL we rely on the unguessable domain +
// password + OTP-every-login instead. Enable with PANEL_REQUIRE_TOKEN=true.
const REQUIRE_TOKEN = process.env.PANEL_REQUIRE_TOKEN === "true";

const STATIC_PATTERN = /^\/_next\/|^\/favicon|\.(?:svg|png|jpg|jpeg|ico|webp|css|js|woff2?)$/i;

const NOT_FOUND = () => new NextResponse(null, { status: 404 });

/** Attach baseline hardening headers to any response we let through. */
function secure(res: NextResponse): NextResponse {
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next.js internals and static assets
  if (STATIC_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  // ── Layer 0: Cloudflare Access identity (primary gate) ─────────────────────
  if (cfAccessConfigured()) {
    const assertion =
      req.headers.get("cf-access-jwt-assertion") ?? req.cookies.get("CF_Authorization")?.value;
    const identity = await verifyCfAccess(assertion ?? undefined);
    if (!identity) return NOT_FOUND();
  }

  // ── /activate?tok=<uuid> — set panel cookie and redirect to /login ──────
  if (pathname === "/activate") {
    const tok = req.nextUrl.searchParams.get("tok") ?? "";
    if (!tok) return NOT_FOUND();

    try {
      const res = await fetch(`${API_URL}/admin-console/panel-tokens/validate`, {
        headers: { "X-Token": tok, "X-Panel": PANEL_NAME, "X-Panel-Secret": PANEL_SECRET },
      });
      if (!res.ok) return NOT_FOUND();
      const { valid } = (await res.json()) as { valid: boolean };
      if (!valid) return NOT_FOUND();
    } catch {
      return NOT_FOUND();
    }

    // Token valid — set permanent cookie (10 years), redirect to login
    const redirect = secure(NextResponse.redirect(new URL("/login", req.url)));
    redirect.cookies.set("vertofi-panel-token", tok, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 365 * 24 * 60 * 60, // 10 years — individually revocable via DB
      path: "/",
    });
    return redirect;
  }

  // ── Layer 1: IP Allowlist (optional defense-in-depth) ─────────────────────
  if (REQUIRE_IP && !SKIP_IP_CHECK) {
    const ip =
      req.headers.get("x-real-ip") ??
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    try {
      const ipRes = await fetch(`${API_URL}/admin-console/ip-allowlist/check`, {
        headers: { "X-Check-IP": ip, "X-Panel": PANEL_NAME, "X-Panel-Secret": PANEL_SECRET },
        next: { revalidate: 30 },
      });
      if (!ipRes.ok) return NOT_FOUND();
      const { allowed } = (await ipRes.json()) as { allowed: boolean };
      if (!allowed) return NOT_FOUND();
    } catch {
      // Fail closed when the allowlist API is unreachable.
      return NOT_FOUND();
    }
  }

  // ── Layer 2: Permanent panel token (opt-in via PANEL_REQUIRE_TOKEN) ────────
  if (REQUIRE_TOKEN) {
    const panelToken = req.cookies.get("vertofi-panel-token")?.value ?? "";
    if (!panelToken) return NOT_FOUND();

    try {
      const tokenRes = await fetch(`${API_URL}/admin-console/panel-tokens/validate`, {
        headers: { "X-Token": panelToken, "X-Panel": PANEL_NAME, "X-Panel-Secret": PANEL_SECRET },
        next: { revalidate: 60 },
      });
      if (!tokenRes.ok) return NOT_FOUND();
      const { valid } = (await tokenRes.json()) as { valid: boolean };
      if (!valid) return NOT_FOUND();
    } catch {
      return NOT_FOUND();
    }
  }

  // ── Layer 3: Session cookie ────────────────────────────────────────────────
  if (!pathname.startsWith("/login")) {
    if (!req.cookies.has("vertofi.session")) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      return secure(NextResponse.redirect(loginUrl));
    }
  }

  return secure(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
