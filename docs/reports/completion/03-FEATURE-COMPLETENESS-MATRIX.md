# Feature Completeness Matrix

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039 · 3 June 2026

## The 15 proprietary innovations (Vertofi Intelligence Suite)

| # | Innovation | Implementing service(s) | Status |
|---|-----------|--------------------------|--------|
| 1 | Business Health Score™ | bhs-engine | ✅ Implemented |
| 2 | Predictive Tax Warning System™ | prediction | ✅ Implemented |
| 3 | Business Lifeguard™ (24×7) | lifeguard | ✅ Implemented |
| 4 | ProfitLeak Finder™ | prediction | ✅ Implemented |
| 5 | Virtual Business Director™ (VBD) | vbd + ai-gateway | ✅ Implemented |
| 6 | WhatsApp Micro Accounting™ | whatsapp + ocr + categorization | ✅ Implemented |
| 7 | Financial Wellness Program™ | prediction + reporting | ✅ Implemented |
| 8 | Invisible Accounting™ | document → ocr → categorization → reconciliation → ledger | ✅ Implemented |
| 9 | VendorTrust Score™ | vendor | ✅ Implemented |
| 10 | Accounting Warranty+™ | warranty + audit | ✅ Implemented |
| 11 | MoneyMap Live™ | reporting | ✅ Implemented |
| 12 | On-Demand Accountant™ | lifeguard / tenant + billing | ✅ Implemented |
| 13 | Financial Black Box™ | audit | ✅ Implemented |
| 14 | Industry Benchmarks™ | benchmarks | ✅ Implemented |
| 15 | Zero-Data-Entry Accounting™ | the full ingestion→posting pipeline | ✅ Implemented |

## The 7 service panels

| Panel | Application | Role(s) | Status |
|-------|-------------|---------|--------|
| Vertofi for Business | web-business | Business owner/user | ✅ |
| Vertofi for Associates | web-panels | CA/CMA/CPA/CS/ACCA/CFA | ✅ |
| Accountant Panel | web-panels | Accountant | ✅ |
| Vertofi for BHS Intelligence | web-panels | BHS analyst | ✅ |
| Vertofi for Legal Services | web-panels | Lawyer | ✅ |
| Vertofi Teams | web-admin (internal) | Team lead/member | ✅ |
| Admin | web-admin (internal) | Administrator | ✅ |

## Subscription plans

| Plan | Price (excl. GST) | Status |
|------|-------------------|--------|
| Starter | ₹1,499/mo | ✅ Catalogued + plan limits enforced |
| Growth (most popular) | ₹3,999/mo | ✅ |
| Pro | ₹8,999/mo | ✅ |

Plan limits (users, invoices, OCR scans, storage, AI calls, bank accounts) are
enforced at the gateway and the AI gateway. A 7-day free trial gates app access
until payment ("after-payment-only" rule).

## Platform capabilities

| Capability | Status |
|------------|--------|
| Multi-tenant isolation (RLS) | ✅ |
| Column-level security on financial data | ✅ |
| Field-level encryption (pgcrypto) | ✅ (helpers + key via vault) |
| Immutable audit (hash-chained) | ✅ |
| OTP / MFA / step-up financial OTP | ✅ |
| Connector framework + empty states | ✅ |
| Admin console (billing/AI/cloud/risk/CI-CD/DB browser) | ✅ |
| Observability (Prometheus/Grafana/OTel/Sentry) | ✅ (config + embed) |
| Helm + Terraform + load test + DR runbook | ✅ |
| CORS across all apps + browser→S3 uploads | ✅ |

## External integrations (connector framework — activate on credentials)

GST GSP · Account Aggregator (banking) · Razorpay (payments) · OpenAI (AI) ·
Google Vision/Textract (OCR) · WhatsApp Business · MSG91 (SMS) · AWS SES (email) ·
Tally/Zoho/QuickBooks (accounting) · payroll · credit bureau · MCA verification ·
AWS Health/Cost Explorer · GitHub Actions. Each ships as a production connector
with an honest "needs credentials" empty state — no fabricated data.
