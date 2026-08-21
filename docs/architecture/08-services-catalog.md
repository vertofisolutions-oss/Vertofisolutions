# 08 — Services Catalog

Every microservice, its responsibility, primary API surface, and the events it produces/consumes. Detailed per-service specs live in [services/](./services/). Event contract conventions: [19](./19-api-standards.md).

| Service | Lang | Responsibility | Key endpoints | Produces → / Consumes ← |
|---------|------|----------------|---------------|--------------------------|
| **api-gateway** | NestJS | AuthN/Z, rate-limit, plan-limit, idempotency, routing, request audit | (proxies all) | — |
| **auth** | NestJS | Identity, JWT, OTP, MFA, sessions | `/auth/*`, `/otp/*` | → `user.*`, `security.*` |
| **tenant** | NestJS | Orgs, users, teams, plans | `/orgs`, `/users`, `/teams` | → `org.*`, `team.*` |
| **access** | NestJS | RBAC/ABAC resolution, grants, requests | `/grants`, `/access-requests` | → `grant.*` |
| **onboarding** | NestJS | 3-stage onboarding, confidence score | `/onboarding/*` | → `onboarding.*` |
| **document** | NestJS | Upload, S3, versioning, virus scan, lifecycle | `/documents/*` | → `document.received` |
| **ocr** | FastAPI | OCR + layout + entity extraction | `/ocr/extract` (internal) | ← `document.received` → `document.extracted` |
| **ai-gateway** | FastAPI | All OpenAI calls: caching, retry, circuit-breaker, model tiering, cost metering | `/ai/*` (internal) | ← various → `ai.completed` |
| **categorization** | FastAPI | Ledger mapping (OpenAI + rules + learned signals) | `/categorize` | ← `document.extracted` → `transaction.categorized` |
| **accounting-ledger** | NestJS | Double-entry ledger, COA, invoices | `/ledger/*`, `/invoices/*` | → `ledger.posted` |
| **reconciliation** | NestJS | Match bank txns ↔ invoices/GST (deterministic + fuzzy) | `/reconcile/*` | ← `transaction.categorized`, `bank.transaction` → `reconciliation.proposed/completed` |
| **bank-connector** | NestJS | Account Aggregator (Setu/Perfios/Finvu), PG feeds, token mgmt | `/bank/*` | → `bank.transaction` |
| **gst-connector** | NestJS | GSP (Masters India): filings, returns, vendor GST pull | `/gst/*` | → `gst.verified`, `gst.return.fetched` |
| **payroll-connector** | NestJS | RazorpayX/Keka/GreytHR/Zoho payroll | `/payroll/*` | → `payroll.synced` |
| **vendor** | NestJS | Vendor master + VendorTrust scoring | `/vendors/*` | ← `gst.verified` → `vendor.trust.computed` |
| **exception-workflow** | NestJS | Human-in-loop review, SLA, flaw flags | `/exceptions/*` | ← `reconciliation.proposed` → `exception.*` |
| **approval** | NestJS | Step-up OTP approvals for sensitive actions | `/approvals/*` | → `approval.granted` |
| **accounting-sync** | NestJS | Push to Tally/Zoho/QuickBooks | `/external-sync/*` | ← `ledger.posted` → `external.synced` |
| **bhs-engine** | FastAPI | Business Health Score computation | `/bhs/*` | ← many → `bhs.computed` |
| **prediction** | FastAPI | Predictive tax warnings, cashflow forecasts | `/predict/*` | → `prediction.created` |
| **vbd** | FastAPI | Virtual Business Director simulations | `/vbd/simulate` | → `vbd.result` |
| **reporting** | NestJS | Dynamic reports (P&L, GST, MoneyMap, benchmarks) | `/reports/*` | ← many |
| **notification** | NestJS | In-app, email, SMS, WhatsApp dispatch | `/notifications/*` | ← `*.alert` → channel sends |
| **whatsapp** | NestJS + FastAPI | WhatsApp CFO: webhook, conversation + action engine | `/webhook/whatsapp` | ↔ many (see [10](./10-whatsapp-cfo.md)) |
| **lifeguard** | NestJS | 24×7 emergency desk, SOS, case routing | `/lifeguard/*` | → `lifeguard.case.*` |
| **legal-cases** | NestJS | Lawyer panel: cases + legal AI analytics | `/legal/*` | ← `lifeguard.case.escalated` |
| **bhs-intelligence** | NestJS | BHS-company panel: scoped BHS + professional pings | `/bhs-intel/*` | ← `bhs.computed` |
| **billing** | NestJS | Subscriptions, Razorpay, plan limits, usage | `/billing/*`, `/webhook/razorpay` | → `subscription.*` |
| **audit** | NestJS | Financial Black Box: immutable log of all events | `/audit/*` (read) | ← **all** domain events |

## Shared platform libraries
- `@vertofi/auth-guards` — JWT, RBAC, ABAC guards (NestJS) / FastAPI deps.
- `@vertofi/events` — typed Kafka producer/consumer, outbox, DLQ, schema registry.
- `@vertofi/tenancy` — org-context propagation + Postgres RLS GUC setter.
- `@vertofi/observability` — OpenTelemetry tracing, metrics, structured logging.
- `@vertofi/connectors` — base connector interface + credential-vault client (see [09](./09-integrations-and-connectors.md)).

## Service template (every service ships with)
Dockerfile · Helm chart · OpenAPI spec · DB migrations · health/readiness probes · `/metrics` · unit+integration tests · outbox table · DLQ consumer · README linking back to its `services/*.md`.
