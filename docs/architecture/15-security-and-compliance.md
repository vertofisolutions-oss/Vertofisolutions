# 15 — Security & Compliance

Financial + GST + bank data for Indian businesses. Security is foundational, not bolted on. Target **SOC 2** and **ISO 27001** readiness from day one (GSP and Account Aggregator partners require it before production access).

## Authentication & authorization
JWT (short-lived) + rotating refresh · RBAC + ABAC + RLS ([04](./04-rbac-and-access-control.md)) · MFA + TOTP for privileged roles · step-up OTP for sensitive actions ([06](./06-authentication-and-otp.md)) · SSO option · session + device + IP monitoring · account lockout.

## Encryption
- **In transit:** TLS 1.2+ everywhere (external + internal mesh mTLS).
- **At rest:** Aurora + S3 + EBS encrypted with KMS; field-level encryption for the most sensitive PII (Aadhaar, account numbers) with separate keys.
- **Secrets:** AWS Secrets Manager / Vault; rotation; never in code, env files in git, or logs.

## Multi-tenant isolation
Every row `org_id`-scoped + Postgres RLS as physical backstop; S3 prefixed + scoped signed URLs; tenant-level audit + permissions. **No tenant can ever read another tenant's data** — verified by automated tests on every build.

## Network & edge
AWS WAF (OWASP rules) + Shield (DDoS) + bot protection · API rate limiting (per user/IP/org) · private subnets for data tier · security groups + NetworkPolicies (default-deny) · API gateway as the only public ingress.

## Application security
Input validation on every endpoint · output encoding · parameterized queries (no string SQL) · CSRF protection · secure headers/CSP · dependency + container scanning in CI · SAST/DAST · secret scanning · least-privilege IAM. Webhooks signature-verified + idempotent.

## Audit & traceability (Financial Black Box)
Immutable, append-only `audit_log` consuming **all** domain events: actor, action, before/after, IP, correlation id, and the **approval OTP** that authorized financial actions. Tamper-evident (hash-chained). Powers Accounting Warranty+ evidence and audit-grade reconstruction.

## Data governance & residency
- Data stored in **India (ap-south-1)**; DR within compliant regions.
- Per-client **data retention policies** for invoices/bank statements/payroll per SLA + Indian law; automated archival + deletion workflows.
- **PII minimization**: collect only what's needed; redact before sending to OpenAI.
- Consent tracking for Account Aggregator (consent artifacts stored + auditable).
- DPDP Act (India) alignment: purpose limitation, user data access/erasure requests, breach notification process.

## Compliance program
SOC 2 / ISO 27001 control mapping · vendor (sub-processor) register · pen-testing schedule · security incident response runbook · security event monitoring → `security` Kafka topic → alerts. NDA + production-audit readiness for GSP integrations.
