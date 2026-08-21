# 07 — Panels & Pages Setup

Each application, every page/route, the env it needs, and how to run & deploy it.
All apps share the `@vertofi/ui` design system and call the gateway at
`NEXT_PUBLIC_API_URL`.

---

## 1. Landing site — `apps/web-landing` (port 3000, PUBLIC)
**Purpose:** marketing + entry points.
**Pages:** `/` · `/about` · `/pricing` · `/blog` · `/contact` ·
`/features` · `/legal/privacy` · `/legal/terms` · `/legal/security`.
**Services menu** links to the 5 public panels (Admin/Teams excluded).
**Env:** `NEXT_PUBLIC_BUSINESS_URL`, `NEXT_PUBLIC_PANEL_BASE`.
**Run:** `pnpm --filter @vertofi/web-landing dev`.
**Deploy:** static/SSR behind CloudFront + WAF; `Dockerfile.next --build-arg APP=web-landing`.

## 2. Business app — `apps/web-business` (port 3001, PUBLIC)
**Purpose:** the client product.
**Pages:**
- `/register` — mobile + email OTP signup
- `/login` — mobile OTP
- `/onboarding` — 3-stage wizard (Registration → Financial Setup w/ document
  upload → Intelligence Setup); creates org, links token, starts trial,
  computes confidence score
- `/dashboard` — Mission Control (Business Health Score, cash position, MoneyMap,
  predictions) — real data when connected, designed empty states otherwise
**Env:** `NEXT_PUBLIC_API_URL`. Document upload uses presigned S3 (needs S3/MinIO
CORS — preconfigured locally).
**Run:** `pnpm --filter @vertofi/web-business dev`.

## 3. Professional panels — `apps/web-panels` (port 3002, PUBLIC)
**Purpose:** the professional ecosystem. Shared OTP login; routes are role-guarded.
**Pages / panels:**
- `/login`
- `/associates` — CA/CMA/CPA/CS/ACCA/CFA: open a granted client (BHS, exceptions,
  ledger), flag flaws
- `/accountants` — an associate's accounts team (view + ping)
- `/bhs` — BHS-Intelligence: portfolio of granted clients' scores + professionals
- `/legal` — Legal: assigned cases + AI notice analysis
**Access:** each panel only admits its role; others are bounced to their home.
A user lands on the panel matching their JWT role.
**Run:** `pnpm --filter @vertofi/web-panels dev`.

## 4. Internal admin portal — `apps/web-admin` (port 3003, INTERNAL ONLY)
**Purpose:** staff administration. **Not linked from the public site.**
**Pages:**
- `/login` — rejects any non-internal role
- `/admin` — 10-tab **Admin Console**: Overview · Billing Dues · AI & Cloud ·
  Risks · Pipelines (CI/CD) · AWS · **Database** (Excel browser, inline edit,
  column-secured) · **Observability** (Grafana embed) · Governance (teams/grants) ·
  Access Log
- `/teams` — Teams panel: view assigned companies, flag flaws, request access
**Env (internal):** `NEXT_PUBLIC_API_URL` (internal gateway path),
`NEXT_PUBLIC_GRAFANA_URL` (for the Observability tab).
**Security headers:** noindex + `frame-ancestors 'none'` (set in `next.config.ts`).
**Run:** `pnpm --filter @vertofi/web-admin dev`.
**Deploy:** **separate image and Helm release** into an internal namespace, behind
an **internal-only ALB + private DNS + VPN/IP-allowlist** (see `../docs/23`). Do
**not** put it behind the public CloudFront.

## How a page talks to the backend
1. The page calls `lib/api.ts`, which adds the JWT and hits `NEXT_PUBLIC_API_URL`
   (the gateway).
2. The gateway authenticates, authorizes by role, rate-limits, and routes to the
   owning service.
3. The service resolves the principal's org scope, applies RLS, performs the
   action, and (for writes) emits an audited event.

## Creating staff & professional accounts
- A **business owner** self-registers in the business app.
- **Admin / Team / Associate / Accountant / BHS analyst / Lawyer** accounts are
  provisioned by Admin (role assigned), then grants are created so they can see
  the right clients (see `05-FEATURE-ACCESS-HIERARCHY`). Login everywhere is OTP
  to the registered mobile (full deployments add password + TOTP for admins).

## Per-app environment summary
| App | Required env | Optional env |
|-----|--------------|--------------|
| web-landing | NEXT_PUBLIC_BUSINESS_URL, NEXT_PUBLIC_PANEL_BASE | — |
| web-business | NEXT_PUBLIC_API_URL | — |
| web-panels | NEXT_PUBLIC_API_URL | — |
| web-admin | NEXT_PUBLIC_API_URL | NEXT_PUBLIC_GRAFANA_URL |

> All four already build and statically render. Production builds:
> `docker build -f infra/docker/Dockerfile.next --build-arg APP=<app> .`
