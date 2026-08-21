# 21 — Disaster Recovery & Reliability Runbook

Targets: **99.99% availability**, multi-region DR, zero-downtime deploys (docs/00, docs/18). This runbook is the operational complement to the architecture.

## RTO / RPO targets

| Asset | RPO (data loss) | RTO (recovery time) | Mechanism |
|-------|-----------------|---------------------|-----------|
| Postgres (Aurora) | ≤ 1 min | ≤ 15 min | Multi-AZ failover; PITR; cross-region replica |
| Kafka (MSK) | ≤ 1 min | ≤ 30 min | Multi-AZ brokers; MirrorMaker to DR region for critical topics |
| Object storage (S3) | ≈ 0 | ≈ 0 | Cross-region replication + versioning |
| Redis (ElastiCache) | cache only | ≤ 5 min | Multi-AZ; rebuildable from source of truth |
| OpenSearch | ≤ 5 min | ≤ 30 min | Multi-AZ; reindex from Postgres if needed |

## Backups

- Aurora automated backups (14-day retention) + on-demand pre-deploy snapshots; **PITR** to any second in the window.
- S3 versioning + lifecycle to Glacier for documents/audit beyond retention.
- **Restore drills quarterly** — restore a snapshot into an isolated stack, run the smoke + isolation test suite, record RTO achieved.

## Failure scenarios & response

1. **AZ outage** — managed services auto-fail over across AZs; HPA reschedules pods on healthy AZs; no action beyond monitoring. PDBs preserve quorum.
2. **Writer DB failure** — Aurora promotes a replica (≤ 30s); connection poolers reconnect. Verify writer endpoint, check replication lag.
3. **Region outage (DR)** — promote the cross-region Aurora replica; repoint Route53 to the DR ALB; start DR-region EKS workloads from GitOps; Kafka consumers resume from mirrored topics. Announce on the status page.
4. **Kafka degradation** — producers buffer via the transactional **outbox** (no data loss); the relay drains when brokers recover. Poison messages route to DLQs for replay.
5. **Dependency outage (OpenAI / GST / bank / WhatsApp)** — circuit breakers open; services **degrade gracefully** (rules fallback / queue-and-retry / empty states). User-facing requests still return `202`.
6. **Bad deploy** — canary health checks fail → automatic rollback (docs/17); blue-green flips back for gateway/frontends.

## Zero-downtime deploys

Expand/contract DB migrations (backward-compatible) → canary 5%→25%→100% for stateful-critical services (ai, ocr, ledger, reconciliation) → blue-green for gateway/frontends → auto-rollback on SLO/error-budget breach.

## On-call

- Paging on availability/error-budget burn, Kafka lag spikes, connector token expiry, OCR/AI failure spikes, DB replica lag, DLQ growth, security events.
- Every alert links to the relevant section here. Post-incident: blameless review, action items tracked to closure.

## Game days

Run chaos experiments in staging (kill brokers, pods, a dependency; inject latency) and verify graceful degradation + recovery within RTO. See `tests/load/k6-smoke.js` for load, and the chaos checklist below.

### Chaos checklist
- [ ] Kill a Kafka broker → outbox buffers, relay drains, no lost events.
- [ ] Kill the OpenAI dependency → categorization falls back to rules; books still post.
- [ ] Kill an OCR provider → failover provider or queue; documents marked NEEDS_REVIEW, never faked.
- [ ] Drop the writer DB → replica promoted; writes resume.
- [ ] 10× traffic spike → queue lengthens, p99 holds, no dropped requests.
