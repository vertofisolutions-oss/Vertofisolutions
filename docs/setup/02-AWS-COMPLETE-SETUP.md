# 02 — AWS Complete Setup

Region: **Asia Pacific (Mumbai) `ap-south-1`** for Indian data residency.
Do everything in this region unless noted. Prefer **IAM roles (IRSA on EKS)** over
static keys in production; static keys below are for getting started / local use.

> Tip: most of this is codified in `infra/terraform/`. You can click-ops to learn,
> then move to Terraform for repeatability.

---

## STEP 1 — Create the AWS account
1. Go to **aws.amazon.com → Create an AWS Account**.
2. Provide email, billing card, and verify your phone.
3. Choose the **Basic (free)** support plan to start.
4. Sign in to the **AWS Management Console**. Set region (top-right) to
   **Asia Pacific (Mumbai) ap-south-1**.

## STEP 2 — Secure the root + create an admin IAM user
1. Console → **IAM** → enable **MFA on the root user** (Security credentials).
2. IAM → **Users → Create user** → name `vertofi-admin`.
3. Attach policy **AdministratorAccess** (for setup; tighten later).
4. Enable **console access**; create a password.
5. **Create access key** (Use case: CLI) → copy **Access key ID** + **Secret
   access key**. Put these in `~/.aws/credentials` for the AWS CLI. *Do not* use
   admin keys in the app.
6. Install AWS CLI and run `aws configure` (region `ap-south-1`).

## STEP 3 — Create a least-privilege app IAM user (the keys for `.env`)
The app needs S3, SES, and (for the admin console) Cost Explorer/Health.
1. IAM → **Users → Create user** → `vertofi-app`.
2. Attach a custom policy (Permissions → Create inline policy → JSON):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:PutObject","s3:GetObject","s3:ListBucket"], "Resource": ["arn:aws:s3:::vertofi-documents","arn:aws:s3:::vertofi-documents/*"] },
    { "Effect": "Allow", "Action": ["ses:SendEmail","ses:SendRawEmail"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["textract:AnalyzeDocument","textract:DetectDocumentText"], "Resource": "*" },
    { "Effect": "Allow", "Action": ["ce:GetCostAndUsage","health:DescribeEvents"], "Resource": "*" }
  ]
}
```
3. **Create access key** → copy the **Access key ID** and **Secret access key**.
4. Put them in `.env`:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```
> These are the AWS keys the app uses (SES email, Textract OCR, admin AWS/cost
> tabs). In production, replace with an **IAM role for the service account
> (IRSA)** so no static keys are stored.

## STEP 4 — S3 bucket (document storage)
1. Console → **S3 → Create bucket** → name `vertofi-documents`, region
   `ap-south-1`, **Block all public access = ON**, **Default encryption = SSE-KMS**.
2. **Permissions → CORS** → add (so browsers can PUT presigned uploads):
```json
[{ "AllowedHeaders": ["*"], "AllowedMethods": ["PUT","GET"],
   "AllowedOrigins": ["https://app.vertofi.com","https://panels.vertofi.com"],
   "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000 }]
```
3. `.env` (production): set `S3_ENDPOINT` empty (use AWS), `S3_FORCE_PATH_STYLE=false`,
   `S3_BUCKET=vertofi-documents`, and the app IAM keys above.

## STEP 5 — SES (email OTP & notifications)
1. Console → **Amazon SES** (region ap-south-1) → **Verified identities →
   Create identity** → verify your **domain** (`vertofi.com`) by adding the
   provided DNS records, or verify a single sender email to start.
2. New accounts are in the **SES sandbox** (can only send to verified addresses).
   **Request production access** (Account dashboard → Request production access).
3. `.env`: `AWS_SES_FROM=no-reply@vertofi.com`, `AWS_SES_REGION=ap-south-1`, plus
   the app IAM keys.

## STEP 6 — KMS (encryption keys)
1. Console → **KMS → Create key** (symmetric) → alias `vertofi/data`.
2. Use it as the default encryption key for S3, RDS, EBS.
3. For application field-level encryption, create/store the `APP_FIELD_KEY`
   secret in Secrets Manager (Step 7) — *not* the KMS CMK itself.

## STEP 7 — Secrets Manager (where prod secrets live)
1. Console → **Secrets Manager → Store a new secret → Other type of secret**.
2. Create secrets like `vertofi/auth`, `vertofi/openai`, `vertofi/razorpay`, each
   holding the relevant key/value pairs (e.g. `OPENAI_API_KEY`, `JWT_ACCESS_SECRET`).
3. On EKS, the **External Secrets Operator** syncs these into Kubernetes Secrets
   (see `deploy/helm/vertofi-service` `externalSecrets`). The app reads them as
   environment variables — never from git.

## STEP 8 — RDS Aurora PostgreSQL (primary database)
1. Console → **RDS → Create database → Amazon Aurora (PostgreSQL-compatible)**.
2. Engine 16.x; **Multi-AZ**; instance `db.r6g.large` (scale later); enable
   **encryption (KMS)**, **automated backups (14 days)**, **deletion protection**.
3. Place in **private subnets**; security group allows 5432 only from the app
   subnets.
4. Add **read replicas** (≥ 2) for reporting/admin reads.
5. `.env`/secret: `DATABASE_URL=postgresql://user:pass@<writer-endpoint>:5432/vertofi`,
   `DATABASE_URL_RO=...<reader-endpoint>...`, `DB_SSL=true`.
   *(Terraform module `infra/terraform/modules/aurora` provisions this.)*

## STEP 9 — ElastiCache (Redis)
1. Console → **ElastiCache → Redis → Create** → cluster mode enabled, Multi-AZ,
   in the same VPC/private subnets.
2. `.env`/secret: `REDIS_URL=redis://<primary-endpoint>:6379` (use `rediss://`
   with TLS if enabled).

## STEP 10 — MSK (Kafka)
1. Console → **Amazon MSK → Create cluster** (provisioned), Multi-AZ, in the VPC.
2. Get the **bootstrap broker** string → `KAFKA_BROKERS=...`.

## STEP 11 — OpenSearch
1. Console → **OpenSearch Service → Create domain**, Multi-AZ, in the VPC.
2. `OPENSEARCH_URL=https://<domain-endpoint>`.

## STEP 12 — ECR (container images)
1. Console → **ECR → Create repository** for each service/app
   (`vertofi/auth`, `vertofi/web-landing`, …).
2. Build & push: `docker build -f infra/docker/Dockerfile.node --build-arg
   SERVICE=auth -t <acct>.dkr.ecr.ap-south-1.amazonaws.com/vertofi/auth . && docker push ...`.

## STEP 13 — EKS (Kubernetes)
1. Console → **EKS → Create cluster** (or `eksctl`/Terraform), Multi-AZ node
   groups; enable **IRSA** (OIDC provider) so pods assume IAM roles.
2. Install: AWS Load Balancer Controller, External Secrets Operator,
   Prometheus/Grafana, cert-manager.
3. Deploy services via Helm (`deploy/helm/vertofi-service`).

## STEP 14 — ACM + Route53 + CloudFront + WAF
1. **ACM** → request a public certificate for `*.vertofi.com` (DNS validation).
2. **Route53** → hosted zone for `vertofi.com`; records for the public ALB.
3. **CloudFront** → distribution in front of the public ALB; attach **AWS WAF**
   (managed OWASP rules + rate-based rule).
4. **Internal admin** (`admin.internal.vertofi`): use a **private hosted zone**
   and an **internal ALB**, reachable only via VPN/IP-allowlist (no CloudFront).

## STEP 15 — Cost Explorer & Health (admin console tabs)
1. Billing console → **Cost Explorer → Enable**.
2. The `vertofi-app` IAM policy already allows `ce:GetCostAndUsage` and
   `health:DescribeEvents`, so the admin **AWS** and **Cloud billing** tabs light
   up once `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are set.

## Rough monthly cost (starting scale, indicative)
Aurora (2–3 nodes) + ElastiCache + MSK + OpenSearch + EKS (3 nodes) + S3/CloudFront
≈ **₹1.5–4L/month** at early scale; optimize later with Graviton/Spot and
autoscale-to-baseline. Use the admin **Cloud billing** tab + AWS Budgets to watch
spend.

## Production checklist
- [ ] Root MFA on · admin user separate from app user
- [ ] App keys least-privilege (or IRSA, no static keys)
- [ ] S3 encrypted + CORS + block public access
- [ ] SES out of sandbox + domain verified (SPF/DKIM)
- [ ] Aurora Multi-AZ + encryption + backups + replicas
- [ ] Secrets in Secrets Manager (not git)
- [ ] WAF + Shield on the public edge; internal ALB for admin
- [ ] AWS Budgets alert configured
