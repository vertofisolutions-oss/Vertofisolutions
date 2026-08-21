# Vertofi — Current Architecture & How It Works After Deployment

_Authoritative snapshot as of 2026-06-06. Reflects the **current** hierarchy after the unified `web-panels` app was split into isolated per-role apps, and the AWS→GCP migration. Cross-references: [`bugs.md`](./bugs.md) (live issues) and [`suggested-fix.md`](./suggested-fix.md)._

> ⚠️ Two things in this document describe the **intended** post-fix behavior and are currently broken in production (see `bugs.md`): the 4 professional panels (leftover redirect middleware → 404) and `business.vertofi.com` / `teams.vertofi.com` (DNS not created). Everything else below is live and verified.

---

## 1. Top-level topology

```
                          ┌─────────────────────── USERS ───────────────────────┐
                          │  Business owners · CA/CMA/CS · Accountants ·         │
                          │  BHS analysts · Lawyers · Internal staff · WhatsApp  │
                          └───────────────────────────┬──────────────────────────┘
                                                       │ HTTPS
        ┌──────────────────────────────────────────────┼───────────────────────────────────────────┐
        │                          VERCEL (8 Next.js 15 apps, one project each)                      │
        │  vertofi.com            business.vertofi.com      associates / accountants / bhs / legal   │
        │  (web-landing)          (web-business)            .vertofi.com  (4 isolated panel apps)     │
        │                                                   admin.vertofi.com · teams.vertofi.com     │
        │                                                   (web-admin / web-teams — INTERNAL only)   │
        └──────────────────────────────────────────────┬───────────────────────────────────────────┘
                                                        │  All API calls →  NEXT_PUBLIC_API_URL
                                                        │  = https://api.vertofi.com/api/v1
                                                        ▼
        ┌───────────────────────────────────────────────────────────────────────────────────────────┐
        │                    GKE Autopilot cluster  `vertofi-production`  (asia-south1 / Mumbai)       │
        │  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
        │  │  GKE Ingress + Google-managed TLS cert  →  api-gateway (the ONLY public ingress)       │  │
        │  └───────────────────────────────────┬─────────────────────────────────────────────────┘  │
        │                                       │  proxies /api/v1/<x> → upstream (cross-ns DNS)       │
        │     32 backend microservices across 9 namespaces (NestJS + 3 Python/FastAPI)                │
        │     all wired over Kafka events + shared Postgres (RLS) + Redis + GCS                        │
        └───────────────────────────────────────────────────────────────────────────────────────────┘
                                                        │
        ┌───────────────────────────────────────────────┼───────────────────────────────────────────┐
        │  Cloud SQL (Postgres 16 HA)   Memorystore (Redis)   Cloud Storage (GCS, S3-API)             │
        │  Confluent Cloud (Kafka/SASL_SSL)   GCP Secret Manager (via External Secrets Operator)      │
        │  Artifact Registry (images)   Workload Identity (pod → GCP SA `vertofi-runtime`)            │
        └───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Golden rule:** the browser never talks to a microservice directly. Every frontend calls **one** host — `https://api.vertofi.com/api/v1` — and the **api-gateway** is the only thing exposed to the internet. Everything else is cluster-internal.

---

## 2. Frontends (Vercel) — 8 apps

Each app is its own Vercel project (Root Directory = `apps/<app>`, `vercel.json` pins the pnpm-workspace install + turbo build). Tokens are kept in `localStorage` (per-app namespaced keys).

| App | Production domain | Audience | Login / guard |
|-----|-------------------|----------|----------------|
| `web-landing` | `vertofi.com`, `www.vertofi.com` | Public marketing site | none (public) |
| `web-business` | `business.vertofi.com` | Business owners & their users (clients) | OTP login → `/dashboard`, `/onboarding`, `/workspace`, `/subscribe` |
| `web-associates` | `associates.vertofi.com` | CA · CMA · CPA · CS · ACCA · CFA | OTP login → associate panel (root) |
| `web-accountants` | `accountants.vertofi.com` | Accounts staff under an associate | OTP login → accountant panel (root) |
| `web-bhs` | `bhs.vertofi.com` | BHS Intelligence companies | OTP login → BHS panel (root) |
| `web-legal` | `legal.vertofi.com` | Lawyers & legal teams | OTP login → legal panel (root) |
| `web-admin` | `admin.vertofi.com` | **INTERNAL** Vertofi staff (ADMIN) | separate `vertofi.admin.*` storage; INTERNAL roles only; `noindex` + `frame-ancestors none` |
| `web-teams` | `teams.vertofi.com` | **INTERNAL** Vertofi ops (TEAM_LEAD / TEAM_MEMBER) | INTERNAL-only, never linked publicly |

**Landing → app routing:** the landing's CTAs (Login / Get Started / Check BHS) point at `NEXT_PUBLIC_BUSINESS_URL`; the Services dropdown links each panel via `NEXT_PUBLIC_{ASSOCIATES,ACCOUNTANTS,BHS,LEGAL}_URL`. Admin & Teams are deliberately **never** linked from the public site.

> Each isolated panel app currently serves its panel at **root** (`src/app/page.tsx`) plus a `/login` route. (The leftover `middleware.ts` that redirects to old sub-paths is the C1 bug — once removed, root = the panel.)

---

## 3. The API gateway — the single front door

**Service:** `services/api-gateway` (Express + http-proxy), port **4000**, namespace `vertofi-gateway`, exposed via GKE Ingress + managed cert at `api.vertofi.com`.

What it does on every request:
1. **CORS** — allowlist from `CORS_ORIGINS` (must include all Vercel domains); answers OPTIONS preflight; re-asserts `Access-Control-Allow-Origin` even on upstream errors so the browser never sees a bare CORS failure.
2. **Auth gate** — verifies the JWT for every `/api/v1/*` path **except** the public allowlist below.
3. **Proxy** — `matchRoute()` maps the path prefix → upstream service, forwarding to its cross-namespace cluster DNS (`http://<svc>.<namespace>:<port>`), injected at deploy time by `deploy-gke.ps1`.

**Public (no-JWT) paths** — `services/api-gateway/src/routes.ts`:
- `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/otp`, `/api/v1/auth/token/refresh`
- `/api/v1/onboarding/landing-contact`
- `/api/v1/billing/webhook/razorpay`, `/api/v1/billing/plans`

**Routing table** (prefix → upstream env var → service):

| Path prefix | Service | Port |
|-------------|---------|------|
| `/api/v1/auth` | auth | 4001 |
| `/api/v1/access` | access | 4003 |
| `/api/v1/tenant` | tenant | 4002 |
| `/api/v1/audit` | audit | 4004 |
| `/api/v1/onboarding` | onboarding | 4005 |
| `/api/v1/documents` | document | 4006 |
| `/api/v1/billing` | billing | 4007 |
| `/api/v1/ledger` | accounting-ledger | 4011 |
| `/api/v1/notifications` | notification | 4009 |
| `/api/v1/reconcile` | reconciliation | 4013 |
| `/api/v1/exceptions` | exception-workflow | 4014 |
| `/api/v1/bank` | bank-connector | 4015 |
| `/api/v1/gst` | gst-connector | 4016 |
| `/api/v1/external-sync` | accounting-sync | 4017 |
| `/api/v1/bhs` | bhs-engine | 4019 |
| `/api/v1/reports` | reporting | 4020 |
| `/api/v1/predict` | prediction | 4021 |
| `/api/v1/lifeguard` | lifeguard | 4022 |
| `/api/v1/vendors` | vendor | 4023 |
| `/api/v1/vbd` | vbd | 4024 |
| `/api/v1/legal` | legal-cases | 4025 |
| `/api/v1/bhs-intel` | bhs-intelligence | 4026 |
| `/api/v1/benchmarks` | benchmarks | 4027 |
| `/api/v1/warranty` | warranty | 4028 |
| `/api/v1/verification` | verification-connectors | 4029 |
| `/api/v1/admin-console` | admin-console | 4030 |
| `/api/v1/accounting` | accounting | 4031 |

> `whatsapp` (4018) is **not** in the gateway table — it receives Meta's webhook on its own ingress and carries its own signature auth.

---

## 4. Backend services — 32, by namespace

Deployed by `infra/gke/deploy-gke.ps1` at 1 replica each (quota-fit profile; HA/autoscaling off until SSD quota is raised). Every pod uses Workload Identity → GCP SA `vertofi-runtime` to read Secret Manager / Cloud SQL / GCS.

| Namespace | Services (port) |
|-----------|-----------------|
| `vertofi-gateway` | api-gateway (4000) |
| `vertofi-identity` | auth (4001), tenant (4002), access (4003) |
| `vertofi-documents` | document (4006), **ocr** (4008, Python) |
| `vertofi-accounting` | accounting-ledger (4011), reconciliation (4013), accounting-sync (4017), accounting (4031) |
| `vertofi-connectors` | bank-connector (4015), gst-connector (4016), vendor (4023), verification-connectors (4029) |
| `vertofi-intelligence` | **ai-gateway** (4010, Python), **categorization** (4012, Python), bhs-engine (4019), prediction (4021), vbd (4024), bhs-intelligence (4026), benchmarks (4027) |
| `vertofi-workflow` | exception-workflow (4014), onboarding (4005), lifeguard (4022), legal-cases (4025), warranty (4028) |
| `vertofi-engagement` | notification (4009), whatsapp (4018), reporting (4020) |
| `vertofi-commerce` | billing (4007), audit (4004), admin-console (4030) |

**Roles in brief:**
- **auth** — OTP issue/verify (MSG91 SMS + nodemailer SMTP), JWT + refresh + sessions, `POST /auth/link-org` re-issues a JWT with `org_id` after onboarding.
- **tenant / access** — org/tenant records; RBAC+ABAC grant resolution. `assertGrantedScope()` (in `@vertofi/nest-common`) checks an ACTIVE `access_grant` before any org-scoped query (closes IDOR).
- **onboarding** — 3-stage wizard + real confidence-score engine; creates the org.
- **document** — presigned GCS PUT (S3-compatible), emits `document.received`.
- **ocr** (Py) — consumes `document.received`, runs Google Vision, emits `document.extracted` (or `NEEDS_REVIEW` if no creds).
- **categorization** (Py) — consumes `document.extracted`, calls ai-gateway, deterministic-rules fallback, emits `transaction.categorized` or routes <0.7 confidence to `transaction.needs_review`.
- **accounting-ledger** — double-entry, balanced-invariant enforced, reversing entries (never deletes), Financial-Action OTP on post, emits `ledger.posted`.
- **accounting** — customers/products/sales/purchases/inventory + GST totals + **AI-draft engine** (NL → reviewable invoice; powers Zero-Typing & WhatsApp). Never auto-posts.
- **reconciliation / accounting-sync** — bank-vs-books matching; sync to Tally/Zoho/QuickBooks.
- **bank / gst / vendor / verification** connectors — AA bank, GSP GST, VendorTrust, payroll/credit/MCA stubs (empty-state when no creds).
- **ai-gateway** (Py) — OpenAI behind caching/retry/circuit-breaker/model-tiering/cost-metering (Redis `ai:usage`); degrades honestly without a key.
- **bhs-engine / prediction / vbd / bhs-intelligence / benchmarks** — Business Health Score (0–100), ProfitLeak/tax/cashflow predictions, Voice-CFO sims (PRO), BHS company panel, k-anonymity≥5 benchmarks.
- **exception-workflow / lifeguard / legal-cases / warranty** — human review queue, 24×7 SOS cases (escalate to legal), lawyer case intake, Accounting Warranty+ claims.
- **notification / whatsapp / reporting** — in-app+dispatch notifications, WhatsApp webhook (AI replies + media→document events + plan-aware menus), P&L / GST / MoneyMap reports.
- **billing** — Razorpay subscriptions, 7-day trial, UPI/card autopay mandate; `access()` gates features on trial/active state.
- **audit** — hash-chained "Financial Black Box" consuming every Kafka event.
- **admin-console** — ADMIN-only ops console + column-allowlisted DB browser, everything audited.

---

## 5. Shared packages (`packages/`)
`config` (tsconfig/eslint), `observability` (logging/metrics/tracing), `events` (Kafka factory + transactional outbox + DLQ; provider-agnostic SASL), `tenancy` (Postgres RLS context + `setSystemContext` for trusted consumers), `auth-guards` & `nest-common` (JWT guards, `@Roles`, `assertGrantedScope`), `connectors` (vault + circuit-breaker), `ui` (shared React components).

---

## 6. End-to-end flows

### 6a. Login (every app)
```
Browser → POST /api/v1/auth/otp/send {channel,destination,purpose}   (public path)
        ← 202 { challengeId }                 # auth sends OTP via MSG91/SMTP
Browser → POST /api/v1/auth/otp/verify {challengeId, code}            (public path)
        ← 200 { accessToken, refreshToken }   # JWT carries role(s); org_id after link-org
Browser stores tokens (localStorage) → routes to role home (dashboard / panel)
Every later call: Authorization: Bearer <accessToken> → gateway verifies → proxies upstream
```

### 6b. Document → books (the core event pipeline, all over Kafka)
```
upload (presigned GCS PUT) ─→ document.received
        ─→ ocr (Vision)     ─→ document.extracted
        ─→ categorization (ai-gateway, rules fallback)
              ├─ confident ─→ transaction.categorized ─→ accounting-ledger (double-entry) ─→ ledger.posted
              └─ <0.7       ─→ transaction.needs_review ─→ exception-workflow (human resolve)
ledger.posted ─→ bhs-engine (recompute BHS) , reporting (P&L/GST/MoneyMap) , accounting-sync (Tally/Zoho/QB)
bank.transaction ─→ reconciliation ─→ reconciliation.completed ─→ bhs-engine
ALL events ─→ audit (hash-chained black box)
```

### 6c. WhatsApp
```
Meta webhook → whatsapp svc (own ingress, signed) → menu keywords/numbers → menu system
            → natural language → ai-gateway → reply ;  media → document.received (joins 6b)
            → actionable accounting → calls /accounting (service token)   [wa_user→org mapping is a known depth gap]
```

### 6d. Billing / trial gate
```
onboarding result → /subscribe → Razorpay Checkout (subscription + UPI/card mandate, start_at = now+7d)
webhook subscription.* → billing state: authenticated=trial → charged=ACTIVE → halted/pending=PAST_DUE (data retained, features gated) → cancelled
access() enforces the gate on every feature.
```

### 6e. RLS + authorization (defense in depth)
1. Gateway verifies JWT.  2. Service `@Roles` checks the principal's role.  3. `assertGrantedScope()` confirms an ACTIVE `access_grant` for the requested org.  4. Postgres **Row-Level Security** scopes the query to that org. Trusted event consumers use `setSystemContext()` (RLS `*`) inside a transaction.

---

## 7. Managed services & secrets
- **Cloud SQL** Postgres 16 HA → `DATABASE_URL` (+ `DB_SSL=true`). Shared DB, schema-per-domain, RLS for tenant isolation.
- **Memorystore** Redis → `REDIS_URL` (sessions, AI usage metering, caches).
- **Cloud Storage** documents bucket via S3-compatible API → `S3_ENDPOINT=https://storage.googleapis.com`, HMAC keys, `S3_FORCE_PATH_STYLE=true`.
- **Confluent Cloud** Kafka → `KAFKA_SSL=true`, `KAFKA_SASL_MECHANISM=plain`, USERNAME/PASSWORD = cluster API key/secret.
- **GCP Secret Manager** → secrets pushed as `vertofi-shared-<KEY>` by `infra/gke/sync-secrets.ps1`; **External Secrets Operator** + `ClusterSecretStore gcp-secret-manager` syncs them into pods.
- **Artifact Registry** → images at `asia-south1-docker.pkg.dev/<project>/vertofi/<name>`, built/pushed by `.github/workflows/deploy.yml` on push to `main`.

---

## 8. Deployment order (go-live)
1. `gcloud auth login` + set/link project + billing + ADC.
2. Create GCS state bucket → `terraform init && apply` (VPC, GKE Autopilot, Cloud SQL HA, Memorystore, GCS, Artifact Registry, `vertofi-runtime` SA + Workload Identity).
3. Create GCS HMAC keys + Confluent cluster/API key + MSG91/SMTP/OpenAI/Vision creds.
4. Push to `main` → GitHub Actions builds & pushes all images (Node + the 3 Python services).
5. Fill `.env.production` → `infra/gke/sync-secrets.ps1` pushes every key to Secret Manager.
6. `infra/gke/deploy-gke.ps1 -ProjectId <p> -Region asia-south1 -ApiDomain api.vertofi.com` → installs ESO, deploys all 32 services, exposes api-gateway (Ingress + managed cert + static IP `vertofi-api-ip`). Create the DNS A record for `api.vertofi.com` → that IP.
7. Vercel: 8 projects, set `NEXT_PUBLIC_API_URL=https://api.vertofi.com/api/v1` (+ business/panel URLs), attach custom domains. **Add every Vercel domain to the gateway's `CORS_ORIGINS`**, re-run `sync-secrets`, then `kubectl rollout restart deployment api-gateway -n vertofi-gateway`.
8. Run `pnpm migrate` per service against Cloud SQL (Auth Proxy or a Job) before opening signups.

---

## 9. What "working" looks like after deployment (acceptance)
- `vertofi.com` loads; its Login/Get-Started/Services links resolve to live apps (needs C2 + C1 fixed).
- A business owner: OTP login → onboarding (3 stages) → subscribe (7-day trial) → uploads a doc → it flows through OCR→categorization→ledger → BHS + reports populate on the dashboard.
- An associate/accountant/BHS/legal user: OTP login at their subdomain → sees only orgs they hold an ACTIVE grant for.
- WhatsApp: a message gets an AI reply; a photo of an invoice creates a draft.
- Internal staff: reach `admin.vertofi.com` / `teams.vertofi.com` (internal-only) — never linked publicly.
- `api.vertofi.com/health` = 200; all `/api/v1/*` require a token except the public allowlist; CORS passes for every Vercel domain.

---

## 10. Known gaps / non-blockers (post-MVP hardening)
- WhatsApp `wa_user → org` mapping + conversation memory (limits actionable WhatsApp accounting).
- bank/gst connectors are stateless (no consents/returns tables yet).
- reconciliation has no manual accept/override endpoint.
- Tokens in `localStorage` (not httpOnly cookies).
- NetworkPolicy default-deny disabled for first launch (re-enable with per-service rules).
- Python services + Kafka consumers not yet runtime-tested end-to-end (no docker in dev shell).
- **Live breakages to fix first — see `bugs.md`:** 4 panels (C1), `business.vertofi.com` (C2), `teams.vertofi.com` (C3).
```
