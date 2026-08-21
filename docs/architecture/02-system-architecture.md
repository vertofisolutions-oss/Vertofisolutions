# 02 — System Architecture

## Architectural style

Distributed **microservices + event-driven**. No monolith. User-facing requests are fast and synchronous only for reads/commands; all heavy work (OCR, AI, reconciliation, sync, notifications) is **asynchronous via Kafka**. This decoupling is what delivers both 50k-concurrent scale and never-fail resilience (see [18](./18-scalability-and-reliability.md)).

## Request topology

```
                Users (web browsers, WhatsApp, external API clients)
                                   │
                          ┌────────▼────────┐
                          │  Global CDN /    │
                          │  CloudFront + WAF│  TLS, bot/DDoS protection
                          └────────┬────────┘
                          ┌────────▼────────┐
                          │ App Load Balancer│
                          └────────┬────────┘
                          ┌────────▼────────┐
                          │  API Gateway     │  authN/Z, rate-limit,
                          │  (NestJS)        │  plan-limits, idempotency,
                          └────────┬────────┘  routing, request audit
                                   │
   ┌───────────────────────────────┼───────────────────────────────────┐
   │            Kubernetes (EKS) — stateless service mesh                │
   │                                                                     │
   │  auth · tenant · onboarding · accounting-ledger · document ·        │
   │  ocr(py) · ai-gateway(py) · categorization(py) · reconciliation ·   │
   │  gst-connector · bank-connector · payroll-connector · vendor ·      │
   │  exception-workflow · notification · whatsapp · legal-cases ·       │
   │  bhs-intelligence · reporting · billing · audit(black-box)          │
   └───────────────┬───────────────────────────────┬─────────────────────┘
                   │                                │
        ┌──────────▼───────────┐         ┌──────────▼──────────┐
        │   Apache Kafka        │◀───────▶│  Service-to-service  │
        │  (event backbone)     │         │  sync calls (gRPC/   │
        └──────────┬───────────┘         │  REST, internal)     │
                   │                      └─────────────────────┘
   ┌───────────────┼───────────────────────────────────────────────┐
   │   Postgres (Aurora multi-AZ) · Redis cluster · S3 · OpenSearch  │
   └─────────────────────────────────────────────────────────────────┘
```

## Service domains (bounded contexts)

| Domain | Services | Language |
|--------|----------|----------|
| **Identity & access** | auth, tenant, access-grant | NestJS |
| **Ingestion & documents** | document, ocr, ingestion | NestJS + FastAPI (ocr) |
| **Intelligence** | ai-gateway, categorization, bhs-engine, prediction, vbd | FastAPI |
| **Accounting core** | accounting-ledger, reconciliation, accounting-sync | NestJS |
| **Connectors** | gst-connector, bank-connector(AA), payroll-connector, vendor, credit, mca | NestJS |
| **Workflow** | exception-workflow, approval, lifeguard | NestJS |
| **Engagement** | whatsapp, notification, reporting | NestJS + FastAPI (whatsapp NLU) |
| **Professional panels** | bhs-intelligence, legal-cases | NestJS |
| **Commerce & audit** | billing, audit(black-box) | NestJS |

Each service is independently deployable, owns its data (schema-per-service within shared Aurora cluster, strict logical isolation), and communicates via Kafka events for async flows + internal gRPC/REST for synchronous queries. Full per-service specs in [services/](./services/).

## Event flow (Zero-Data-Entry example)

```
WhatsApp/upload → document.received
  → ocr → document.extracted
  → gst-connector → vendor.gst.verified
  → categorization (OpenAI + rules) → transaction.categorized
  → reconciliation → reconciliation.proposed
  → (uncertain?) exception-workflow → human review
  → (approved + Financial Action OTP) → ledger.posted
  → accounting-sync → external.synced (Tally/Zoho/QuickBooks)
  → notification → user/WhatsApp update
  → audit captures every step (Financial Black Box)
```

Canonical event contracts: [19-api-standards.md](./19-api-standards.md). Every event carries `org_id`, `actor_id`, `correlation_id`, `causation_id`, and a `schema_version`.

## Why this shape hits the requirements

- **Scale:** stateless services + HPA + queue-buffered heavy work (see [18](./18-scalability-and-reliability.md)).
- **Reliability:** no synchronous dependency on flaky third parties; outbox pattern, DLQs, circuit breakers.
- **Security/tenancy:** every request passes the gateway → access-grant checks; every row carries `org_id` (see [04](./04-rbac-and-access-control.md)).
- **Auditability:** the audit service consumes *all* domain events into an immutable log.
