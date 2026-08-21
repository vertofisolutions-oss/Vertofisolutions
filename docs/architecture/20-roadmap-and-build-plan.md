# 20 — Roadmap & Build Plan

"Production-grade, no mocks" does **not** mean "build all 26 services in one commit." It means each module we ship is fully real (real DB, real logic, real auth, real connector framework + empty states). We build in dependency order so every layer stands on a solid one.

## Phase 0 — Platform foundation
**Goal:** the skeleton everything plugs into, bulletproof.
- Monorepo (Turborepo/Nx): `apps/ services/ packages/ infra/ deploy/`.
- Shared packages: `events` (Kafka + outbox + DLQ), `auth-guards`, `tenancy` (RLS), `observability`, `connectors` (base + vault client), `ui` (design tokens).
- `docker-compose` full local stack (Postgres, Redis, Redpanda, MinIO, OpenSearch).
- **auth** + **tenant** + **access** services: OTP/MFA, JWT, orgs/users/teams, RBAC/ABAC + grants, RLS.
- **api-gateway**: authN/Z, rate-limit, plan-limit, idempotency, routing, audit.
- **audit** service (Financial Black Box) consuming all events from day one.
- Terraform skeleton + Helm chart template + CI/CD pipeline + observability baseline.
- `web-landing` shell with Services dropdown + design system in `packages/ui`.

## Phase 1 — Identity, panels & onboarding (real, end-to-end)
- All **7 panel frontends** wired to real auth with correct role/scope gating ([03](./03-panels-and-hierarchy.md)).
- **onboarding** service + 3-stage flow ([07](./07-onboarding-flow.md)) → confidence score.
- **document** + **ocr** services: real upload → S3 → virus scan → OCR extraction (Google Vision/Textract connector).
- **billing**: Razorpay subscriptions + plan enforcement; **"after payment only"** gating to enter the app.
- **notification** service (in-app + email via SES; SMS via MSG91).

## Phase 2 — Zero-Data-Entry core
- **ai-gateway** (OpenAI: caching/retry/circuit-breaker/tiering).
- **categorization** + **accounting-ledger** (double-entry) + **reconciliation** + **exception-workflow**.
- **bank-connector** (Account Aggregator) + **gst-connector** (GSP) as connectors w/ vault + empty states.
- **accounting-sync** (Tally/Zoho/QuickBooks).
- **whatsapp** CFO MVP: capture → OCR → categorize → approve ([10](./10-whatsapp-cfo.md)).

## Phase 3 — Intelligence features
- **bhs-engine** (Business Health Score) + **prediction** (Predictive Tax, ProfitLeak, cashflow) + **MoneyMap** (reporting + WebSocket) + **reporting** (P&L, GST, summaries).
- **lifeguard** (24×7 SOS) + WhatsApp Lifeguard + daily intelligence push.

## Phase 4 — Professional ecosystem & premium
- **vendor** (VendorTrust) + **vbd** (Virtual Business Director / Voice CFO).
- **bhs-intelligence** panel + **legal-cases** panel + Accountant Panel flows.
- **benchmarks** (anonymized) + **Accounting Warranty+** workflow + public Pro API.
- **payroll-connector**, **credit/mca connectors**.

## Phase 5 — Scale & DR hardening
- Multi-region DR, chaos + load testing to the scale ceiling, SOC2/ISO control completion, pen-test, cost optimization.

## Cross-cutting (every phase)
Tests (unit/integration/e2e/isolation) · observability · audit · docs updated · IaC · graceful degradation. A feature isn't "done" until it meets the [00](./00-production-requirements.md) definition of done.

## Immediate next step
Scaffold **Phase 0**: monorepo + docker-compose + shared packages + auth/tenant/access/gateway/audit skeletons + landing shell with the design system. This is what I'll build first on your go-ahead.
