# 08 — First Launch Checklist

A ticked, ordered path from nothing to a running platform. Local first, then
production. Cross-references in brackets.

## Phase A — Local development (1–2 hours)
- [ ] Install Node 22, pnpm 10, Python 3.11, Docker Desktop, Git [00]
- [ ] `pnpm install`
- [ ] `cp .env.example .env` (leave connectors blank for now) [01]
- [ ] `pnpm infra:up` and wait for healthy containers [00]
- [ ] Run all migrations (loop in [00])
- [ ] `pnpm build` → confirm green
- [ ] `pnpm dev` (and start the 3 Python services) [00]
- [ ] Open landing 3000, business 3001, panels 3002, admin 3003
- [ ] Register a business at 3001 (read the OTP from the `auth` service logs)
- [ ] Walk the onboarding wizard → land on the dashboard (empty states)

## Phase B — Connect real services (as keys arrive) [03]
- [ ] **MSG91** → real SMS OTP (`MSG91_AUTH_KEY`, `MSG91_SENDER_ID`)
- [ ] **OpenAI** → AI features (`OPENAI_API_KEY`)
- [ ] **Razorpay (test)** → payments + after-payment gate [04]
- [ ] **Google Vision / Textract** → document extraction
- [ ] **AWS SES** → email OTP/notifications [02 §5]
- [ ] Restart affected services; confirm connector status flips to ACTIVE in the
      admin **Overview** tab

## Phase C — AWS foundation [02]
- [ ] Create AWS account; root MFA; region ap-south-1
- [ ] `vertofi-admin` (setup) + `vertofi-app` (least-privilege) IAM users
- [ ] Put `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in Secrets Manager
- [ ] S3 bucket `vertofi-documents` (encrypted, CORS, block public)
- [ ] SES domain verified + out of sandbox
- [ ] KMS key + Secrets Manager secrets created
- [ ] Aurora PostgreSQL (Multi-AZ, encrypted, backups, replicas)
- [ ] ElastiCache Redis · MSK Kafka · OpenSearch
- [ ] ECR repositories; build & push images
- [ ] EKS cluster with IRSA; install ALB controller, External Secrets, Grafana
- [ ] ACM cert + Route53 + CloudFront + WAF (public edge)
- [ ] Internal ALB + private DNS for the admin portal

## Phase D — Production configuration
- [ ] Generate strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- [ ] `DATABASE_URL` (writer) + `DATABASE_URL_RO` (reader) + `DB_SSL=true`
- [ ] `REDIS_URL`, `KAFKA_BROKERS`, `OPENSEARCH_URL` → managed endpoints
- [ ] `CORS_ORIGINS` → real domains (e.g. https://vertofi.com, https://app.vertofi.com)
- [ ] `NEXT_PUBLIC_*` → real domains; build apps with these
- [ ] `APP_FIELD_KEY` generated and stored in Secrets Manager
- [ ] All connector keys moved to Secrets Manager (not `.env` in git)

## Phase E — Payments go-live [04]
- [ ] Razorpay KYC activated; **Live** keys in Secrets Manager
- [ ] Live webhook URL + secret configured and test-fired
- [ ] GST applied on invoices; refund policy published [legal-docs/08]

## Phase F — Regulated integrations (weeks, in parallel) [03]
- [ ] GST GSP partnership (Masters India) → sandbox → production
- [ ] Account Aggregator (Setu) → sandbox → production
- [ ] WhatsApp Business (via BSP or Meta) + template approval
- [ ] Credit bureau / MCA / payroll connectors as needed

## Phase G — Hardening & launch [docs 16/21/22]
- [ ] Grafana dashboards live; `NEXT_PUBLIC_GRAFANA_URL` set in admin
- [ ] Load test (`k6 run tests/load/k6-smoke.js`) against staging
- [ ] DR drill (restore a snapshot; failover) per docs/21
- [ ] Security CI green; penetration test scheduled
- [ ] AWS Budgets alert set; admin Cloud-billing tab verified
- [ ] Legal docs finalized by counsel and published [legal-docs/]
- [ ] Internal admin reachable only via VPN/allowlist; verified not public

## Minimum viable launch (smallest real footprint)
MSG91 + OpenAI + Razorpay (test→live) + Google Vision + AWS (S3, SES, Aurora,
Redis, one small EKS) → you can onboard a paying customer end-to-end. Everything
else activates progressively without code changes.
