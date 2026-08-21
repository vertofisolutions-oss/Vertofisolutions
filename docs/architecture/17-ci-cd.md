# 17 — CI/CD

No manual deployments. Everything through pipelines + Infrastructure as Code.

## Repo strategy
**Monorepo** (Nx/Turborepo) with clear service boundaries: `apps/` (frontends), `services/` (backends), `packages/` (shared libs), `infra/` (Terraform), `deploy/` (Helm charts). Affected-graph builds only what changed.

## CI (GitHub Actions, on every PR)
1. Lint + typecheck (ESLint, tsc, ruff/mypy for Python).
2. Unit tests + coverage gate.
3. Integration tests (spin up Postgres/Redis/Kafka/MinIO via testcontainers).
4. Build + scan Docker images (Trivy), SAST (CodeQL/Semgrep), secret scan, dependency audit, SBOM.
5. DB migration dry-run/validation.
6. OpenAPI contract check (no breaking changes without version bump).
7. Cross-tenant isolation tests (must pass — see [15](./15-security-and-compliance.md)).

## CD (ArgoCD, GitOps)
- Merge to `main` → build versioned images → update Helm values in the env repo → ArgoCD syncs.
- **Staging:** auto-deploy + smoke + load tests.
- **Production:** **canary** (5% → 25% → 100%) for critical services (ai, ocr, ledger, reconciliation); **blue-green** for the gateway/frontends; **automatic rollback** on SLO/error-budget breach.
- DB migrations: expand/contract pattern (backward-compatible), applied as a pre-deploy job; never destructive in one step.

## Quality gates (block release)
Coverage threshold · zero critical vulns · all isolation/security tests green · migrations validated · OpenAPI compatible · canary health OK.

## Feature flags
ML model rollouts, new features, and connector activations behind flags (e.g., LaunchDarkly/Unleash) for gradual rollout + instant kill switch.

## Release artifacts
Immutable, versioned, signed container images in ECR; Helm chart versions pinned; every prod deploy traceable to a git SHA + PR + the docs decision it implements.
