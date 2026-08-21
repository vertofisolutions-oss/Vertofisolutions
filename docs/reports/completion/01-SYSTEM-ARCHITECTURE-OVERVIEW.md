# System Architecture Overview

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039 · 3 June 2026

This is the consolidated, printable architecture summary. The authoritative
design lives in [`../docs/`](../docs/README.md) (documents 00–24).

---

## 1. Architectural style

Distributed **microservices + event-driven**. User-facing requests are fast and
synchronous; all heavy work (OCR, AI, reconciliation, sync, notifications) is
asynchronous over an **Apache Kafka** event bus. This decoupling delivers both
horizontal scale (50,000+ concurrent users target) and resilience.

## 2. Topology

```
        Browsers / WhatsApp / API clients
                     │
        CloudFront + AWS WAF (TLS, DDoS, bot)
                     │
            Application Load Balancer
                     │
              API Gateway (authN/Z, CORS,
              rate-limit, plan-limit, routing)
                     │
   ┌────────────── Kubernetes (EKS) — stateless mesh ──────────────┐
   │  31 microservices (identity, ingestion, intelligence,         │
   │  accounting, connectors, workflow, engagement, panels, audit) │
   └───────────────┬───────────────────────────────┬───────────────┘
                   │ Apache Kafka (events)          │ internal gRPC/REST
   ┌───────────────┴───────────────────────────────┴───────────────┐
   │ PostgreSQL (Aurora, multi-AZ, RLS) · Redis cluster · S3 ·       │
   │ OpenSearch                                                      │
   └─────────────────────────────────────────────────────────────────┘
```

## 3. Technology stack

| Layer | Technology |
|-------|-----------|
| Public web / apps | Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Inter |
| Core backend | NestJS (TypeScript) microservices |
| AI / OCR services | Python · FastAPI |
| AI provider | OpenAI (behind a dedicated AI gateway) |
| Datastores | PostgreSQL (Aurora) · Redis · Amazon S3 · OpenSearch |
| Event bus | Apache Kafka |
| Infrastructure | Docker · Kubernetes (EKS) · Terraform · AWS Mumbai (ap-south-1) |
| Observability | Prometheus · Grafana · OpenTelemetry/Jaeger · Sentry |

## 4. The four applications

| App | Audience | Exposure |
|-----|----------|----------|
| Landing site | Public | Public internet |
| Business app | Clients / business owners | Public internet |
| Professional panels | CA/CMA/CPA/CS/ACCA/CFA, accountants, BHS firms, lawyers | Public internet |
| Internal admin portal | Vertofi staff (Admin, Teams) | **Internal network only** (VPN/IP-allowlist) |

## 5. The Zero-Data-Entry pipeline (end to end)

```
Upload / WhatsApp → document.received → OCR → document.extracted
   → categorization (OpenAI + rules fallback) → transaction.categorized
   → reconciliation (match vs bank.transaction) → reconciliation.completed
   → ledger.posted (double-entry) → accounting-sync → external.synced
   (low-confidence / unmatched → exception-workflow → human review)
   Every step audited to the Financial Black Box.
```

## 6. Cross-cutting platform capabilities

- **Multi-tenancy** — `org_id` on every row; Postgres RLS enforced; financial
  tables additionally column-secured.
- **Resilience** — transactional outbox, dead-letter queues, circuit breakers,
  retries with backoff, graceful degradation.
- **Security** — RBAC + ABAC + RLS/CLS, MFA + step-up OTP, KMS + field-level
  encryption, WAF, immutable audit.
- **Scale** — stateless services + HPA, read-replica routing, Redis caching,
  partitioned hot tables, Kafka partitioning by tenant.

## 7. Reference index (engineering blueprint)

Documents 00–24 in `../docs/` cover: production requirements, system
architecture, panels, RBAC, data model, authentication, onboarding, services
catalog, integrations, WhatsApp CFO, the 15 features, UI design system, frontend
architecture, infrastructure, security, observability, CI/CD, scalability, API
standards, roadmap, disaster recovery, SOC2/ISO controls, admin isolation, and
the admin console / data security.
