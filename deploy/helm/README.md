# Vertofi Helm Charts

`vertofi-service` is a generic chart used to deploy every Vertofi microservice
(docs/14, docs/18). Each service ships a small `values.<service>.yaml` overriding
`name`, `image`, `port`, and any per-service autoscaling/secret settings.

## What it provisions
- **Deployment** — rolling update (maxUnavailable 0), AZ topology spread, hardened
  securityContext (non-root, read-only FS, dropped caps), liveness/readiness probes.
- **HorizontalPodAutoscaler** — CPU + optional custom metric (Kafka consumer lag).
- **PodDisruptionBudget** — preserves capacity during voluntary disruption.
- **NetworkPolicy** — default-deny ingress; only the gateway + observability namespaces.
- **ServiceMonitor** — Prometheus scraping of `/metrics`.
- **ExternalSecret** — pulls secrets from AWS Secrets Manager (no secrets in manifests).

## Deploy
```bash
helm upgrade --install auth ./vertofi-service \
  -n vertofi-identity --create-namespace \
  -f values.auth.yaml
```
GitOps: ArgoCD syncs these from the env repo; production uses canary/blue-green
with automatic rollback (docs/17).
