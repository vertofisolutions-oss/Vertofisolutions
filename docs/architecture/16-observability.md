# 16 — Observability

You cannot run "never fail" without seeing failures first. Three pillars + business KPIs, on every service from day one.

## Stack
- **Metrics:** Prometheus → Grafana dashboards. Every service exposes `/metrics`.
- **Tracing:** OpenTelemetry SDK in every service → Jaeger. `correlation_id` propagated through HTTP + Kafka so a WhatsApp message → OCR → categorize → ledger → notification is one trace.
- **Logs:** structured JSON → Loki (or ELK). Correlated by `correlation_id` + `org_id` (PII-redacted).
- **Errors:** Sentry (frontend + backend) with release tracking.
- **Infra:** CloudWatch for AWS resources.

## What we monitor
| Category | Signals |
|----------|---------|
| Latency | p50/p95/p99 per endpoint + per service |
| Errors | error rate, 4xx/5xx, exception types |
| Saturation | CPU/mem, pod count, DB connections, Kafka consumer lag |
| Database | query latency, replica lag, deadlocks, slow queries |
| Pipeline | OCR throughput/failures, extraction confidence distribution, reconciliation rate, exception backlog, SLA breaches |
| AI | OpenAI latency, error/timeout rate, **cost per org**, cache hit rate, circuit-breaker state |
| Cache/Search | Redis hit rate + evictions, OpenSearch query latency |
| Business KPIs | onboarding completion, BHS distribution, active users, WhatsApp interactions, time-to-clear exceptions |

## Alerting (SLO-driven)
- SLOs per service (e.g., gateway p99 < 300ms, availability 99.99%); error budgets tracked.
- Page on: availability/error-budget burn, Kafka lag spike, connector token expiry, OCR/AI failure spike, DB replica lag, security events, DLQ growth.
- Alerts route to on-call (PagerDuty/Opsgenie) with runbook links.

## Health & readiness
Every service: `/health` (liveness) + `/ready` (readiness, checks deps). Synthetic checks on critical user journeys (login, upload→extract, dashboard load). Status page for customers.
