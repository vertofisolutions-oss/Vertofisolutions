/**
 * Teams Panel Middleware — layered security isolation (same model as admin).
 *
 * Layer 0: Cloudflare Access identity (PRIMARY) — Cloudflare-signed JWT for an
 *          approved Google identity; rejects direct-origin bypass.
 * Layer 1: IP allowlist — OPTIONAL (PANEL_REQUIRE_IP=true), panel=TEAMS or BOTH.
 * Layer 2: Permanent panel token (panel=TEAMS).
 * Layer 3: Session cookie.
 *
 * ALL unauthorized responses → 404 (not 403).
 *
 * /activate?tok=<uuid> — sets the panel token cookie and redirects to /login.
 */
import { NextRequest, NextResponse } from "next/server";
import { cfAccessConfigured, verifyCfAccess } from "./lib/cf-access";

const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const PANEL_SECRET = process.env.PANEL_SECRET ?? "";
const PANEL_NAME = "TEAMS";
const SKIP_IP_CHECK = process.env.PANEL_SKIP_IP_CHECK === "true";
const REQUIRE_IP = process.env.PANEL_REQUIRE_IP === "true";
// Permanent panel-token gate (Layer 2) is opt-in; on plain *.vercel.app we rely
// on the unguessable domain + password login. Enable with PANEL_REQUIRE_TOKEN=true.
const REQUIRE_TOKEN = process.env.PANEL_REQUIRE_TOKEN === "true";

const STATIC_PATTERN = /^\/_next\/|^\/favicon|\.(?:svg|png|jpg|jpeg|ico|webp|css|js|woff2?)$/i;

const NOT_FOUND = () => new NextResponse(null, { status: 404 });

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

  // /activate — validate token, set cookie, redirect to /login
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
    const redirect = secure(NextResponse.redirect(new URL("/login", req.url)));
    redirect.cookies.set("vertofi-panel-token", tok, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 365 * 24 * 60 * 60,
      path: "/",
    });
    return redirect;
  }

  // Layer 1: IP allowlist (optional defense-in-depth)
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
      return NOT_FOUND();
    }
  }

  // Layer 2: Permanent panel token (opt-in via PANEL_REQUIRE_TOKEN)
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

  // Layer 3: Session cookie
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
