# Deployment & Operations Runbook

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039 · 3 June 2026

## 1. Prerequisites
- Node.js ≥ 22, pnpm ≥ 10
- Python ≥ 3.11 (AI/OCR services)
- Docker Desktop (local stack)

## 2. Local environment (development)

```bash
pnpm install                      # install workspace dependencies
cp .env.example .env              # fill what you have; blanks → empty states
pnpm infra:up                     # Postgres, Redis, Redpanda, MinIO, OpenSearch

# Apply database migrations (per service)
pnpm --filter @vertofi/auth migrate
pnpm --filter @vertofi/tenant migrate
pnpm --filter @vertofi/access migrate
pnpm --filter @vertofi/audit migrate
pnpm --filter @vertofi/onboarding migrate
pnpm --filter @vertofi/document migrate
pnpm --filter @vertofi/billing migrate
pnpm --filter @vertofi/accounting-ledger migrate
pnpm --filter @vertofi/reconciliation migrate
pnpm --filter @vertofi/exception-workflow migrate
pnpm --filter @vertofi/notification migrate
pnpm --filter @vertofi/bhs-engine migrate
pnpm --filter @vertofi/prediction migrate
pnpm --filter @vertofi/lifeguard migrate
pnpm --filter @vertofi/vendor migrate
pnpm --filter @vertofi/legal-cases migrate
pnpm --filter @vertofi/warranty migrate
pnpm --filter @vertofi/admin-console migrate
# Python services: apply services/ocr|categorization migrations via psql/CI

pnpm dev                          # run everything
```

**Endpoints:** landing 3000 · business 3001 · panels 3002 · admin (internal) 3003 ·
gateway 4000 · services 4001–4030.

## 3. Build & verify
```bash
pnpm build        # all TypeScript workspaces (38 tasks)
pnpm typecheck    # types only
pnpm test         # unit/integration
```

## 4. Production deployment (AWS, ap-south-1)

1. **Infrastructure** — `cd infra/terraform && terraform init && terraform apply`
   provisions network + Aurora (extend with EKS, ElastiCache, MSK, OpenSearch,
   S3, CloudFront/WAF, Secrets modules).
2. **Images** — build per service/app:
   `docker build -f infra/docker/Dockerfile.node --build-arg SERVICE=auth ...`
   and `Dockerfile.next --build-arg APP=web-landing ...`. The internal admin app
   builds with `--build-arg APP=web-admin`.
3. **Deploy** — Helm: `helm upgrade --install <svc> deploy/helm/vertofi-service
   -f values.<svc>.yaml`. GitOps via ArgoCD; canary/blue-green with automatic
   rollback.
4. **Secrets** — provision connector credentials in AWS Secrets Manager; External
   Secrets Operator injects them. Set `CORS_ORIGINS` to production domains.
5. **Internal admin** — deploy `web-admin` to an internal namespace behind an
   internal-only ALB + private DNS + VPN/IP-allowlist (see `../docs/23`).

## 5. Observability
Prometheus + Grafana dashboards; OpenTelemetry traces (Jaeger); structured logs;
Sentry for errors. The admin console embeds Grafana via `NEXT_PUBLIC_GRAFANA_URL`.

## 6. On-call & DR
Paging on availability/error-budget burn, Kafka lag, connector token expiry, DB
replica lag, DLQ growth, security events. Disaster-recovery procedures
(RTO/RPO, failover, chaos checklist) in `../docs/21`.

## 7. Load testing
`k6 run -e BASE=<gateway> tests/load/k6-smoke.js` — ramps virtual users; scale up
against staging to validate the 50k-concurrent target.

## 8. CORS / uploads
The gateway applies a CORS allowlist (`CORS_ORIGINS`) and re-asserts headers on
proxied responses. Browser→S3 presigned uploads require bucket CORS (MinIO
configured locally; Terraform sets the production bucket policy).
