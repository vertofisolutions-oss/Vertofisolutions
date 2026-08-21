# 09 — Integrations & Connectors

Vertofi depends on many regulated Indian financial APIs. Most require company registration + partnership approval + credentials that take weeks–months. Per [00](./00-production-requirements.md), we build **real connector frameworks + credential vault + empty/onboarding states** now, and flip them live the moment keys arrive. **Never fake the data.**

## Connector framework

Every external integration implements a common interface so the rest of the platform is provider-agnostic and testable against contracts (not mocks of business data):

```
interface Connector<TConfig, TResult> {
  readonly id: string;                  // e.g. "gst.mastersindia"
  status(): ConnectorStatus;            // ACTIVE | NEEDS_CREDENTIALS | DEGRADED | DISABLED
  healthCheck(): Promise<Health>;
  // domain methods per connector type...
}
```
- **Status drives the UI.** `NEEDS_CREDENTIALS` → the panel renders an **empty state + activation CTA**, not fabricated numbers.
- **Credential vault:** all keys/tokens/secrets live in AWS Secrets Manager / HashiCorp Vault, fetched at runtime, rotated, never in code or env files committed to git. A `connector_credentials` registry tracks which orgs/connectors are activated.
- **Resilience:** every connector call wrapped with timeout + retry (exp backoff + jitter) + circuit breaker + bulkhead; failures route to DLQ and degrade gracefully.
- **Sandbox vs production:** connectors carry an `environment` flag; we integrate against providers' sandboxes until production approval, with zero code change to promote.

## Integration categories (build all as connectors)

| Category | Providers (primary / failover) | Purpose | Default status until keys |
|----------|-------------------------------|---------|---------------------------|
| **Banking (Account Aggregator)** | Setu / Perfios / Finvu / OneMoney | Bank txns, balances, multi-bank sync | NEEDS_CREDENTIALS |
| **GST & Tax (GSP)** | Masters India / ClearTax / Vayana | GSTR-1/3B, return status, e-invoice, vendor GST pull | NEEDS_CREDENTIALS |
| **Accounting** | Tally (XML connector), Zoho Books, QuickBooks, Xero | Sync ledgers/invoices/P&L | NEEDS_CREDENTIALS |
| **Payroll** | RazorpayX Payroll, Keka, GreytHR, Zoho Payroll | Payroll, PF/ESI, salary analytics | NEEDS_CREDENTIALS |
| **Credit & Loans** | CIBIL/CRIF/Experian/Equifax via aggregators (Perfios/Decentro) | Credit score, debt risk | NEEDS_CREDENTIALS |
| **MCA & Verification** | Signzy / Karza / Surepass / Digio | CIN/PAN/GST/director KYC | NEEDS_CREDENTIALS |
| **Payments** | Razorpay (primary), Cashfree/PayU | Subscription billing, collections, webhooks | activate first (own onboarding) |
| **SMS** | MSG91 (primary), Twilio | OTP, alerts | activate early |
| **WhatsApp** | Meta WhatsApp Business API (via Interakt/Gupshup/AiSensy) | WhatsApp CFO | NEEDS_CREDENTIALS |
| **Email** | AWS SES | OTP, reports, notifications | activate early |
| **AI** | **OpenAI** (behind ai-gateway) | All AI features | activate early |
| **OCR** | Google Vision / AWS Textract (primary) + fallback | Invoice/receipt/statement extraction | activate early |
| **Auth (optional)** | Clerk / Auth0 / Cognito | Managed identity option | optional |

## OpenAI integration (the AI Gateway)

All OpenAI traffic flows through the **ai-gateway** service — no other service calls OpenAI directly. It provides:
- **Model tiering:** `gpt-4o-mini` for high-volume extraction/categorization; `gpt-4o` for premium reasoning (VBD simulations, deep insights) gated by plan.
- **Caching:** exact + semantic cache in Redis (identical/similar prompts — e.g., same vendor categorization — don't re-hit the API).
- **Resilience:** retries w/ backoff + jitter, circuit breaker, concurrency limiter respecting OpenAI TPM/RPM tier; on outage → queue + retry, or rules-based fallback so books still post.
- **Structured outputs:** JSON mode / function calling, schema-validated before use.
- **Cost control:** per-org usage metering against plan limits; OpenAI Batch API for non-urgent monthly reports.
- **PII minimization:** redact unnecessary bank/PII fields before prompts.

## Webhooks (inbound)
`/webhook/whatsapp`, `/webhook/razorpay`, bank/GSP callbacks — all **signature-verified**, idempotent (dedupe on provider event id), and audited.
