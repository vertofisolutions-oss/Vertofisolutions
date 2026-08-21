# Service Inventory

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039 · 3 June 2026

31 backend microservices. All build/compile clean. Stack: NestJS (TypeScript)
unless marked **Py** (Python/FastAPI).

| # | Service | Port | Responsibility | Status |
|---|---------|------|----------------|--------|
| 1 | api-gateway | 4000 | Single ingress: authN/Z, CORS, rate-limit, plan-limit, routing | ✅ |
| 2 | auth | 4001 | Identity, OTP (7 types), MFA, JWT, sessions, org linking | ✅ |
| 3 | tenant | 4002 | Organizations, teams, team assignments | ✅ |
| 4 | access | 4003 | RBAC/ABAC resolution, grants, access requests | ✅ |
| 5 | audit | 4004 | Financial Black Box — hash-chained immutable log | ✅ |
| 6 | onboarding | 4005 | 3-stage onboarding + confidence score engine | ✅ |
| 7 | document | 4006 | Presigned S3 upload, versioning, lifecycle | ✅ |
| 8 | billing | 4007 | Razorpay, plan limits, after-payment gate, trials | ✅ |
| 9 | ocr **Py** | 4008 | OCR/extraction (provider connector + review routing) | ✅ |
| 10 | notification | 4009 | In-app + email/SMS dispatch | ✅ |
| 11 | ai-gateway **Py** | 4010 | OpenAI chokepoint: caching, retry, circuit breaker, tiering, cost metering | ✅ |
| 12 | accounting-ledger | 4011 | Double-entry ledger, balanced-entry invariant, reversals | ✅ |
| 13 | categorization **Py** | 4012 | AI ledger categorization + deterministic fallback | ✅ |
| 14 | reconciliation | 4013 | Deterministic + fuzzy bank↔invoice matching | ✅ |
| 15 | exception-workflow | 4014 | Human-in-loop review + Teams flaw-flagging | ✅ |
| 16 | bank-connector | 4015 | Account Aggregator (Setu/Perfios/Finvu) | ✅ |
| 17 | gst-connector | 4016 | GSP (Masters India); GSTIN validation | ✅ |
| 18 | accounting-sync | 4017 | Push to Tally/Zoho/QuickBooks | ✅ |
| 19 | whatsapp | 4018 | WhatsApp CFO: webhook + AI replies + media pipeline | ✅ |
| 20 | bhs-engine | 4019 | Business Health Score (0–100) computation | ✅ |
| 21 | reporting | 4020 | P&L, GST summary, MoneyMap Live | ✅ |
| 22 | prediction | 4021 | Predictive tax, ProfitLeak, cashflow forecast | ✅ |
| 23 | lifeguard | 4022 | 24×7 SOS cases, legal escalation | ✅ |
| 24 | vendor | 4023 | VendorTrust Score | ✅ |
| 25 | vbd | 4024 | Virtual Business Director / Voice CFO (Pro) | ✅ |
| 26 | legal-cases | 4025 | Legal panel: cases + AI notice analysis | ✅ |
| 27 | bhs-intelligence | 4026 | BHS-company panel (granted scores + professionals) | ✅ |
| 28 | benchmarks | 4027 | Anonymized industry benchmarks (k-anonymity ≥ 5) | ✅ |
| 29 | warranty | 4028 | Accounting Warranty+ claims (Pro) | ✅ |
| 30 | verification-connectors | 4029 | Payroll / credit bureau / MCA connectors | ✅ |
| 31 | admin-console | 4030 | Internal admin: billing/AI/cloud/risk/CI-CD + Excel DB browser | ✅ |

## Shared packages (8)
`config` (design tokens, tsconfig) · `events` (Kafka + outbox + DLQ) ·
`tenancy` (RLS + principal) · `auth-guards` (JWT + NestJS guards) ·
`connectors` (vault + circuit breaker) · `observability` (logging/health) ·
`nest-common` (PgService, bootstrap, migrations) · `ui` (design system).

## Web applications (4)
`web-landing` (3000) · `web-business` (3001) · `web-panels` (3002) ·
`web-admin` (3003, internal only).

## Local development port map
Services occupy 4000–4030; web apps 3000–3003; infrastructure: PostgreSQL 5432,
Redis 6379, Kafka/Redpanda 19092, MinIO 9000/9001, OpenSearch 9200.
