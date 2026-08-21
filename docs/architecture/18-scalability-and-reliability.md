# 18 — Scalability & Reliability

How Vertofi meets **50,000+ concurrent users / 500k businesses / 100M txns** and behaves as "never fail" (99.99%). Nothing here requires a redesign to reach the ceiling — it's the design.

## The core principle: decouple user requests from heavy work
A user action returns in <100–300ms with `202 Accepted`; the expensive work (OCR, AI, reconciliation, sync, notifications) happens **asynchronously via Kafka**. A traffic spike lengthens a queue — it never drops requests or errors out. This single principle delivers both scale and resilience.

## Scaling each tier
| Tier | Strategy |
|------|----------|
| Frontend | CloudFront edge cache + SSR/streaming; static shells cached |
| API gateway / services | **Stateless** pods + HPA (CPU + latency + Kafka lag); scale horizontally to N replicas |
| Heavy workers (OCR/AI/recon) | Autoscale on **queue depth**; GPU node group for OCR/ML bursts |
| Postgres | Aurora writer + ≥2 read replicas; **all reads/reporting → replicas**; PgBouncer connection pooling; partitioned hot tables ([05](./05-data-model.md)) |
| Redis | Cluster mode, sharded; caches dashboards, BHS, sessions, rate-limits |
| Kafka | Partitioned topics keyed by `org_id` for ordered, parallel processing |
| Search | OpenSearch sharded + replicas |

**50k concurrent reality:** mostly dashboard reads + uploads, not 50k simultaneous OCR jobs. Reads are Redis/replica-served; uploads are accepted instantly and queued. A modest fleet handles it with headroom; workers scale independently on backlog.

## Never-fail patterns
- **Outbox pattern:** DB write + event emit in one transaction → events never lost on crash.
- **Idempotency keys** on all writes/webhooks → safe retries, no duplicate invoices/payments.
- **Dead-letter queues** → poison messages don't stall pipelines; replayable.
- **Circuit breakers + bulkheads** around every external dependency (OpenAI, GST, banks, WhatsApp).
- **Retries** with exponential backoff + jitter.
- **Graceful degradation:** dependency down → queue + retry, or rules-based fallback (e.g., categorization), or designed empty state. The user sees "processing," never a hard error.
- **Backpressure:** concurrency limiters respect downstream rate limits (esp. OpenAI TPM/RPM).
- **Multi-AZ + DR:** managed services auto-failover; cross-region replication; tested failover drills ([14](./14-infrastructure-and-deployment.md)).
- **PodDisruptionBudgets + graceful shutdown** → rolling ops don't drop in-flight work.
- **Zero-downtime deploys** (canary/blue-green) + auto-rollback ([17](./17-ci-cd.md)).

## Data consistency at scale
Financial writes are ACID within the ledger service (double-entry invariant enforced). Cross-service consistency is **eventual via events + sagas**, with compensation/reversing entries — never distributed 2PC. Reconciliation validates end-state.

## Capacity & load testing
Load tests in staging model peak concurrency + spike + soak; chaos testing kills brokers/pods/dependencies to verify graceful degradation. SLOs + error budgets gate releases ([16](./16-observability.md)).

## What "never fail" actually means here
No system is literally infallible. We engineer for: no single point of failure · zero data loss (durable + audited + PITR) · graceful degradation on any dependency outage · 99.99% availability with automated failover and rollback. Honesty over hype — see [00](./00-production-requirements.md).
