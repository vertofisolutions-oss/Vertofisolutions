# 22 — SOC 2 / ISO 27001 Control Mapping

Vertofi is built toward SOC 2 (Trust Services Criteria) and ISO 27001 from day one (docs/15). This maps controls to where they live in the platform so an audit can trace each to real implementation.

## Security / Access (CC6 · ISO A.9, A.5.15)

| Control | Implementation |
|---------|----------------|
| Logical access control | RBAC + ABAC + Postgres RLS; effective-scope resolution in the access service (`docs/04`). Default-deny. |
| Least privilege | Role → permission matrix; view-only roles can't write; grants are explicit + Admin-controlled. |
| MFA / step-up | OTP + TOTP for privileged roles; Financial/Document Action OTP for sensitive ops (`docs/06`). |
| Tenant isolation | Every row `org_id`-scoped; RLS forced; automated cross-tenant isolation tests in CI (`docs/17`). |
| Secrets management | AWS Secrets Manager via External Secrets Operator; no secrets in code/env/logs (`docs/15`). |
| Network security | WAF + Shield + default-deny NetworkPolicies; gateway is the only public ingress. |

## Change management (CC8 · ISO A.8.32, A.8.31)

| Control | Implementation |
|---------|----------------|
| SDLC + review | PR review, CI gates (lint, typecheck, tests, SAST, secret scan, isolation tests). |
| Separation of duties | GitOps via ArgoCD; prod deploys traceable to PR + SHA; no manual prod changes. |
| Safe releases | Expand/contract migrations, canary/blue-green, automatic rollback (`docs/17`). |

## Availability (A1 · ISO A.5.29, A.5.30)

| Control | Implementation |
|---------|----------------|
| Resilience | Multi-AZ, HPA, PDBs, outbox, DLQ, circuit breakers, graceful degradation (`docs/18`). |
| Backup & DR | Aurora PITR + snapshots, S3 CRR, MirrorMaker; tested restore drills (`docs/21`). |
| Capacity | Load + chaos testing to the scale ceiling; SLOs + error budgets (`docs/16`). |

## Confidentiality / Privacy (C1 · P · ISO A.5.34, A.8.24)

| Control | Implementation |
|---------|----------------|
| Encryption | TLS 1.2+ in transit; KMS at rest; field-level for the most sensitive PII (`docs/15`). |
| Data residency | All data in India (ap-south-1); DR in compliant regions (`docs/14`). |
| Data minimization | Collect only what's needed; redact PII before any OpenAI call (`docs/09`). |
| Data subject rights | Access / correction / erasure workflow; retention per SLA + law. |
| Anonymized analytics | Benchmarks enforce k-anonymity ≥ 5; no single business identifiable (`docs/11 #14`). |

## Monitoring / Audit (CC7 · ISO A.8.15, A.8.16)

| Control | Implementation |
|---------|----------------|
| Audit logging | Immutable, hash-chained **Financial Black Box** consuming all domain events (`docs/11 #13`). |
| Approval evidence | Sensitive financial actions stamped with the approval OTP id (legal proof). |
| Observability | Metrics, traces, logs, alerts; SLO-driven paging (`docs/16`). |
| Incident response | Runbook + blameless reviews + status page (`docs/21`). |

## Vendor / Sub-processors (CC9 · ISO A.5.19–A.5.22)

Sub-processor register for every connector (GST GSP, Account Aggregator, OpenAI, OCR, WhatsApp, payments). Each integrates via the connector framework with credential vaulting and is activated only after due diligence (`docs/09`).

## Readiness checklist
- [ ] Control owners assigned · [ ] Policies documented · [ ] Risk assessment + treatment plan
- [ ] Pen test completed · [ ] Vendor due diligence · [ ] Evidence collection automated
- [ ] BCP/DR drill recorded · [ ] Access reviews scheduled · [ ] Security training
