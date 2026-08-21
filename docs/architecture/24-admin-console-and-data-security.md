# 24 — Admin Console, Data Security & Performance

The internal admin portal (`apps/web-admin`, docs/23) gains a full operations console backed by the **`admin-console`** service (ADMIN-only). This doc covers the console plus the row/column security, encryption, query-optimization, load-balancing and CORS requirements.

## Admin console (internal only)

Tabs in the admin portal, each backed by a real `admin-console` endpoint:

| Tab | Data | Source |
|-----|------|--------|
| Overview | orgs, active subs, trials, open exceptions/lifeguard, connector status | live aggregate |
| Billing Dues | past-due + expired-trial accounts, total due | `billing.subscriptions` |
| AI & Cloud | **real metered** OpenAI tokens + cost estimate per org; AWS cost MTD | Redis `ai:usage:*` + Cost Explorer connector |
| Risks | compliance/cashflow risk breakdown, high-risk clients, open exceptions | `onboarding_profiles` + `exception` |
| Pipelines | GitHub Actions runs | CI/CD connector (needs `GITHUB_TOKEN`) |
| AWS | service status | AWS Health connector |
| **Database** | **Excel-style browser** over whitelisted tables, inline edit via popup | generic CRUD (see below) |
| Observability | embedded **Grafana** dashboards | `NEXT_PUBLIC_GRAFANA_URL` (docs/16) |
| Governance | teams, grants, access requests | tenant + access services |
| Access Log | immutable record of every admin view/edit | `adminconsole.admin_access_log` |

No fabricated numbers — cloud/CI-CD/AWS show honest "pending credentials" states; AI token counts are real (metered by the ai-gateway); cost is a transparent calculation at a configurable rate.

## Row- AND column-level security on financial data

- **Row-level (RLS):** every tenant table enforces `org_id` isolation via Postgres RLS (docs/04). The admin console reads under a system context but the SQL still scopes per registered table.
- **Column-level (CLS):** the DB browser exposes only a **per-table column allowlist** (`services/admin-console/src/table-registry.ts`). Sensitive columns — `password_hash`, `mfa_secret`, `code_hash`, encrypted blobs — are **never selectable or returnable**. `migrations/001_security.sql` adds DB-level `GRANT SELECT (col, …)` to a restricted role as defense in depth.
- **Edit safety:** only server-declared `editable` columns can be updated; updates are parameterized and **every view/edit is written to the immutable admin audit log** (who/what/when).

## Encryption (at rest + access-controlled)

- **At rest:** Aurora + S3 + EBS encrypted with KMS (docs/14). The most sensitive identifiers (bank account numbers, Aadhaar) use **pgcrypto field-level encryption** (`adminconsole.enc/dec`) with a symmetric key supplied at runtime from the vault (`APP_FIELD_KEY`) via a session GUC — the key is never stored in the database.
- **In transit:** TLS 1.2+ (mesh mTLS internally).
- **Access-controlled ("username & password"):** DB connections require credentials from Secrets Manager; the admin portal requires staff authentication (OTP, internal-only) and the API is ADMIN-role-gated. Tech/config + secrets live in the vault, never in code.

## Query optimization

- Composite indexes lead with `org_id`; hot tables (`bank_transactions`, `audit_log`, `bhs_scores`, `whatsapp_messages`, `predictions`) are **range-partitioned by month** (docs/05).
- The DB browser is **paginated** (max 200 rows) with indexed `ORDER BY` and parameterized `ILIKE` search on indexed columns.
- Reporting/dashboard/admin reads route to **Aurora read replicas** (`DATABASE_URL_RO`) so they never contend with writers.
- **PgBouncer** connection pooling; `PgService` uses a bounded pool.

## Load balancing

CloudFront + ALB in front; stateless services autoscale via **HPA** (CPU + Kafka lag) behind a ClusterIP service; reads spread across replicas; Redis cluster for cache/sessions; Kafka partitions keyed by `org_id` for parallelism (docs/18). Helm chart provides HPA + PDB + topology spread (docs/14).

## Attack-proofing

WAF (OWASP) + Shield (DDoS) + bot protection · gateway rate-limiting per user/IP · default-deny NetworkPolicies · parameterized queries everywhere (no string SQL) · strict input validation · secure headers/CSP · signature-verified webhooks · least-privilege IAM · RLS+CLS · immutable audit · the admin portal is internal-only (docs/23). Authorization is enforced at the gateway **and** re-verified at each service (defense in depth).

## CORS — guaranteed no errors

- The **gateway** runs `cors` with an env-driven origin allowlist (`CORS_ORIGINS`, defaults to the four dev apps), handles preflight (`OPTIONS`), and **re-asserts CORS headers on proxied responses** so upstreams can't strip them.
- **Browser → S3/MinIO** presigned uploads: MinIO `MINIO_API_CORS_ALLOW_ORIGIN` is set in docker-compose; production buckets get an equivalent CORS policy via Terraform.
- Production origins (real domains) slot into `CORS_ORIGINS` with no code change.
