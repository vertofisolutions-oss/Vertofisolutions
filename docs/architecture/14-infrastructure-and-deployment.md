# 14 — Infrastructure & Deployment

**Build deploy-ready now, deploy later.** Everything runs locally via docker-compose and is described as IaC (Terraform + Helm) for AWS. Primary region **AWS Mumbai (ap-south-1)** for Indian data residency; DR region **ap-south-2 / ap-southeast-1**.

## Environments
| Env | Purpose | Infra |
|-----|---------|-------|
| `local` | Developer machines | docker-compose (Postgres, Redis, Kafka/Redpanda, MinIO=S3, OpenSearch, all services) |
| `staging` | Integration + load tests | EKS (smaller node groups), Aurora, connectors in sandbox |
| `production` | Live | EKS multi-AZ, Aurora multi-AZ, multi-region DR |

## Local development (docker-compose)
One command brings up the full stack with **real** dependencies (no mocks): Postgres, Redis (cluster), Redpanda (Kafka API), MinIO (S3 API), OpenSearch, plus every microservice. Seed = empty (real onboarding creates data). Secrets via `.env.local` (gitignored) pointing at sandbox/credential-vault.

## AWS production topology
```
Route53 → CloudFront (+ WAF, Shield) → ALB → EKS (multi-AZ node groups)
EKS: app pods + worker pods (+ GPU node group for heavy OCR/ML if needed)
Data: Aurora PostgreSQL (writer + ≥2 replicas, multi-AZ), ElastiCache Redis (cluster mode),
      MSK (Kafka), OpenSearch domain, S3 (+ lifecycle to Glacier), Secrets Manager
Edge/CDN: CloudFront for static + signed S3 doc delivery
```

## Kubernetes
- One namespace per domain; each service: Deployment + Service + HPA + PodDisruptionBudget + NetworkPolicy + ServiceMonitor.
- **HPA** on CPU + custom metrics (Kafka consumer lag, request latency, queue depth) — OCR/AI workers scale on queue depth.
- Liveness/readiness/startup probes; graceful shutdown (drain Kafka, finish in-flight).
- Secrets via External Secrets Operator → AWS Secrets Manager. No secrets in manifests.

## Terraform (IaC)
Modules: `network` (VPC, subnets, NAT), `eks`, `aurora`, `elasticache`, `msk`, `opensearch`, `s3`, `cloudfront-waf`, `secrets`, `iam`, `observability`, `dns`. Remote state in S3 + DynamoDB lock. Per-env workspaces. **No manual infra changes** — everything via Terraform PRs.

## Disaster recovery (99.99% / multi-region)
- Multi-AZ everywhere; Aurora automated backups + PITR; cross-region read replica / snapshot copy for DR.
- S3 cross-region replication; Kafka topic mirroring (MirrorMaker) for critical topics.
- RTO/RPO targets documented per service; regular restore + failover drills.
- Zero-downtime deploys (blue-green/canary, see [17](./17-ci-cd.md)).

## Cost efficiency
Spot/Graviton node groups for stateless workers; autoscale-to-baseline off-peak; S3 lifecycle to Glacier for old documents/audit; OpenAI cost metered per org ([09](./09-integrations-and-connectors.md)).
