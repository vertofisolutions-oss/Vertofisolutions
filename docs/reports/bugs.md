# Vertofi — Bug & Health Report

_Tested: 2026-06-06. Method: live URL probing (curl/DNS), gateway endpoint tests, and source/route inspection after the recent app-hierarchy split (unified `web-panels` → isolated per-role apps). **No code was changed** — this is a findings document only._

---

## Summary

| Area | Status |
|------|--------|
| Landing (`vertofi.com`, `www`) | ✅ Up (200) |
| Business app (`business.vertofi.com`) | ❌ **DNS does not exist (NXDOMAIN)** |
| Associates / Accountants / BHS / Legal panels | ❌ **All 404** (root redirects to a dead path) |
| Admin (`admin.vertofi.com`) | ✅ Up (200) |
| Teams (`teams.vertofi.com`) | ❌ **DNS does not exist (NXDOMAIN)** |
| API gateway (`api.vertofi.com`) | ✅ Healthy — login + CORS working |

---

## URL test results

| URL | HTTP | Notes |
|-----|------|-------|
| `https://vertofi.com` | 200 | OK |
| `https://www.vertofi.com` | 200 | OK |
| `https://business.vertofi.com` | **000** | **NXDOMAIN — domain not resolvable** |
| `https://associates.vertofi.com` | 302 → `/associates` | redirect target **404** |
| `https://accountants.vertofi.com` | 302 → `/accountants` | redirect target **404** |
| `https://bhs.vertofi.com` | 302 → `/bhs` | redirect target **404** |
| `https://legal.vertofi.com` | 302 → `/legal` | redirect target **404** |
| `https://admin.vertofi.com` | 200 | OK |
| `https://teams.vertofi.com` | **000** | **NXDOMAIN — domain not resolvable** |
| `https://app.vertofi.com` (old business) | 404 | old domain, no deployment |
| `https://panels.vertofi.com` (old panels) | 404 | old unified app, gone |
| `https://api.vertofi.com/health` | 200 | `{"status":"ok"}` |
| `POST https://api.vertofi.com/api/v1/auth/otp/send` | 202 | returns `challengeId` — **login works** |
| `https://api.vertofi.com/api/v1/*` (no token) | 401 | correctly auth-gated |

---

## CRITICAL bugs

### C1 — All 4 public professional panels return 404 (leftover redirect middleware)
**Apps:** `web-associates`, `web-accountants`, `web-bhs`, `web-legal`

Each isolated panel app still ships `src/middleware.ts` copied from the **old unified `web-panels` app**. It redirects the subdomain root to a sub-path:

```
associates.vertofi.com   → /associates
accountants.vertofi.com  → /accountants
bhs.vertofi.com          → /bhs
legal.vertofi.com        → /legal
```

But after the hierarchy split, each app serves its panel at **root** (`src/app/page.tsx`) and has **only** `page.tsx` + `login/page.tsx`. There is no `/associates`, `/accountants`, `/bhs`, or `/legal` route anymore → every redirect lands on a 404.

Worse: the middleware matcher does **not** exclude `/login`, so `…/login` is also redirected to the dead path → the login pages are unreachable too.

**Effect:** all four professional panels are completely down for users, even though the landing's Services dropdown links to them correctly.

**Likely fix (for review):** delete `src/middleware.ts` in these 4 apps (root `page.tsx` already renders the panel), or repoint the map to `/` / `/login`.

---

### C2 — `business.vertofi.com` does not resolve (NXDOMAIN)
The main customer app's domain has **no DNS record**. The live landing page (`vertofi.com`) bakes `business.vertofi.com` into its CTAs:
- **Login**, **Get Started**, **Check BHS** buttons (`apps/web-landing/src/lib/site.ts`)
- **"Vertofi for Business"** in the Services dropdown (`apps/web-landing/src/lib/panels.ts`)

All of these lead to a dead domain. **The entire customer signup/login entry point is broken.** (The recent commit `b116549` renamed the business URL `app.vertofi.com` → `business.vertofi.com`, but the new domain/DNS was never created in Vercel/DNS.)

**Fix:** create the `business.vertofi.com` DNS record + add it as a domain on the Vercel `web-business` project (infra action, not code).

---

### C3 — `teams.vertofi.com` does not resolve (NXDOMAIN)
The internal Teams portal domain has no DNS record → portal unreachable. Not linked publicly, but internal team users cannot reach it. **Fix:** create DNS + Vercel domain mapping (infra action).

---

## MEDIUM / config bugs

### M1 — Stale URLs in repo env files (inconsistent with production)
`.env.production`:
```
NEXT_PUBLIC_BUSINESS_URL=https://app.vertofi.com   # old domain → 404
NEXT_PUBLIC_PANEL_BASE=https://panels.vertofi.com  # unified panels app no longer exists → 404
```
`.env.vercel.example` has the same stale values + the old "panels.vertofi.com" architecture comments.
Production Vercel envs were updated (live landing uses `business.vertofi.com`), but the repo files are stale and misleading. **Fix:** update to `business.vertofi.com`; drop `NEXT_PUBLIC_PANEL_BASE` (replaced by per-role `NEXT_PUBLIC_ASSOCIATES_URL` / `_ACCOUNTANTS_URL` / `_BHS_URL` / `_LEGAL_URL`).

### M2 — Cosmetic old domain in landing UI
`apps/web-landing/src/components/ProductPreview.tsx:33` shows fake browser-chrome text `app.vertofi.com` (old domain). Cosmetic only; should read `business.vertofi.com`.

### M3 — `web-admin` local typecheck fails on stale `.next/types`
`pnpm typecheck` fails for `@vertofi/web-admin` with `TS2307: Cannot find module '…/src/app/admin/page.js'` / `…/teams/page.js`. These generated type files are **stale** — they reference `admin/` and `teams/` routes that were removed when admin/teams were consolidated. The tsconfig `include`s `.next/types/**/*.ts`, so the cache breaks `tsc`. Clearing `.next` and rebuilding makes typecheck pass (CI is clean since `.next` isn't committed). Low impact; local-only annoyance.

---

## Verified working ✅
- **API gateway healthy:** `/health` → 200; login `POST /api/v1/auth/otp/send` → 202 with `challengeId`.
- **CORS correct:** OPTIONS preflight from `associates.vertofi.com` returns proper `Access-Control-Allow-Origin` + credentials/methods/headers; security headers (HSTS, CSP, X-Frame-Options) present.
- **Auth gating correct:** all `/api/v1/*` non-public routes return 401 without a token; public allowlist (`/auth/otp`, `/auth/login`, `/auth/register`, `/billing/webhook/razorpay`, etc.) works.
- **OTP API signatures consistent:** panels call `api.sendOtp(mobile)`; business calls `api.sendOtp("MOBILE", mobile, "LOGIN")` — both wrap the same `{channel,destination,purpose}` payload. Consistent within each app; typecheck green.
- **Landing** (`vertofi.com`/`www`) and **admin** (`admin.vertofi.com`) serve 200.
- **51 workspaces typecheck green** (after clearing the stale `web-admin` `.next` cache).

---

## Priority order
1. **C2** — restore `business.vertofi.com` DNS/domain (product is unsellable without it).
2. **C1** — remove leftover panel middleware (4 panels down).
3. **C3** — restore `teams.vertofi.com` DNS/domain.
4. **M1/M2** — sync stale env/UI URLs.
5. **M3** — clear stale build cache (cosmetic/local).
