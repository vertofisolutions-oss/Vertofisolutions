# Security & Compliance Dossier

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039 · 3 June 2026

Vertofi handles financial, GST and banking data for Indian businesses. Security
is foundational. This dossier summarizes the implemented controls; full mapping
in `../docs/15`, `../docs/22`, `../docs/24`.

## 1. Identity & access

- **Authentication:** JWT access tokens (short-lived) + rotating refresh tokens
  with reuse detection; OTP across 7 contexts; TOTP for privileged roles.
- **Authorization:** RBAC (role → permissions) + ABAC (admin-controlled grants)
  + Postgres RLS as a physical backstop. Enforced at the gateway **and**
  re-verified at each service.
- **Step-up:** Financial Action OTP and Document Access OTP for sensitive
  operations, recorded as legal proof of approval.

## 2. Data protection

- **Encryption in transit:** TLS 1.2+ (mutual TLS internally).
- **Encryption at rest:** KMS for Aurora/S3/EBS; pgcrypto field-level encryption
  for the most sensitive identifiers, keyed from the secrets vault.
- **Row-level security:** every record `org_id`-scoped; no cross-tenant read
  without an explicit grant.
- **Column-level security:** sensitive columns never exposed via tooling; the
  admin browser is restricted to safe column allowlists.
- **Secrets:** AWS Secrets Manager / Vault; never in code, environment files in
  version control, or logs.

## 3. Auditability

- **Financial Black Box:** append-only, hash-chained audit log consuming every
  domain event (who/what/when + approval OTP).
- **Admin access log:** every internal admin view/edit recorded immutably.

## 4. Network & application security

- AWS WAF (OWASP rules) + Shield (DDoS) + bot protection.
- Gateway rate-limiting per user/IP; CORS allowlist; the gateway is the only
  public ingress.
- Default-deny Kubernetes NetworkPolicies; private subnets for the data tier.
- Parameterized queries (no string SQL); strict input validation; secure
  headers / CSP; signature-verified, idempotent webhooks.
- Hardened container security context (non-root, read-only filesystem, dropped
  capabilities).

## 5. Privacy & data residency (India)

- Data stored in India (ap-south-1); DR within compliant regions.
- DPDP Act 2023 alignment: purpose limitation, data-subject access/correction/
  erasure workflow, breach-notification process, consent tracking for Account
  Aggregator.
- PII minimization — only necessary data collected; redaction before any AI
  call; anonymized benchmarks enforce k-anonymity (≥ 5 organizations).

## 6. Resilience & continuity

- Multi-AZ datastores; transactional outbox; dead-letter queues; circuit
  breakers; graceful degradation.
- Backups: Aurora PITR + snapshots; S3 versioning + cross-region replication;
  tested restore drills (see `../docs/21`).
- RTO/RPO targets documented; chaos game-days defined.

## 7. Governance

- SOC 2 / ISO 27001 control mapping prepared (`../docs/22`).
- Sub-processor register for every external connector.
- Security CI: secret scanning, CodeQL, dependency audit, Trivy, Terraform
  validation (`.github/workflows/security.yml`).

## 8. Internal administration isolation

The Admin and Teams tooling is served from a separate, internally-hosted portal
(VPN/IP-allowlist, private DNS, no public link, no-index, frame-busting). Even if
reached, every action is role-gated and audited (`../docs/23`).

## Attestation

This dossier reflects implemented controls in the codebase as of the report
date. Independent penetration testing and a SOC 2 audit are recommended prior to
processing production customer data at scale.
