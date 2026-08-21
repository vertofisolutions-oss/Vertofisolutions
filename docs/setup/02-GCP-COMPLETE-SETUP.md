# 02 — Google Cloud: Complete Setup & Go-Live

This replaces the old AWS setup. Vertofi now runs on **GCP** (GKE Autopilot,
Cloud SQL, Memorystore, Cloud Storage, Confluent Cloud for Kafka, GCP Secret
Manager) with the **four frontends on Vercel**.

```
 Browser ──► Vercel (Next.js apps)
                │  NEXT_PUBLIC_API_URL
                ▼
        api.<domain> (GKE Ingress, managed TLS)
                │
        api-gateway ──► 30+ NestJS services (GKE Autopilot)
                          │        │        │
                   Cloud SQL   Memorystore  Confluent Cloud
                   (Postgres)   (Redis)     (Kafka)
                          │
                   Cloud Storage (documents, S3-compatible)
        secrets ◄── GCP Secret Manager (via External Secrets Operator)
```

## 0. One-time prerequisites
Install: `gcloud`, `kubectl`, `helm`, `terraform`, `pnpm`. Then:

```powershell
gcloud auth login
gcloud projects create vertofi-prod-xxxx --name "Vertofi"   # or use an existing project
gcloud config set project vertofi-prod-xxxx
gcloud billing projects link vertofi-prod-xxxx --billing-account=XXXXXX-XXXXXX-XXXXXX
gcloud auth application-default login                         # for terraform
```

## 1. Provision infrastructure (Terraform)
```powershell
# Create the state bucket once, then point the backend at it:
gsutil mb -l asia-south1 gs://vertofi-tfstate-vertofi-prod-xxxx
gsutil versioning set on gs://vertofi-tfstate-vertofi-prod-xxxx
# Edit infra/terraform/versions.tf → backend "gcs" bucket = that name.

cd infra/terraform
terraform init
terraform apply -var="project_id=vertofi-prod-xxxx"
```
This creates the VPC, GKE Autopilot cluster, Cloud SQL (Postgres 16, HA),
Memorystore (Redis), the documents GCS bucket, Artifact Registry, and the
`vertofi-runtime` service account with Workload Identity.

Grab the outputs you'll need:
```powershell
terraform output database_url        # (sensitive) Cloud SQL DSN
terraform output redis_host
terraform output documents_bucket
terraform output artifact_registry
```

## 2. Create the runtime credentials the app needs
- **GCS HMAC keys** (so the S3-compatible connector can presign):
  ```powershell
  gcloud storage hmac create vertofi-runtime@vertofi-prod-xxxx.iam.gserviceaccount.com
  # → note the Access ID and Secret
  ```
- **Confluent Cloud**: create a cluster on GCP/asia-south1, then an API key.
  You get a bootstrap server (`pkc-xxxxx...:9092`), an API key and secret.
- **MSG91** (SMS OTP), **SMTP** relay (email OTP), **OpenAI**, **Razorpay**,
  **Google Vision** (OCR) — as needed.

## 3. Build & push images
Push via GitHub Actions (recommended) — set repo secrets `GCP_PROJECT_ID`,
`GCP_REGION`, `GCP_SA_KEY` (a CI SA JSON with `roles/artifactregistry.writer`),
then push to `main`. The `deploy.yml` workflow builds all services + apps to
Artifact Registry. Or build locally:
```powershell
gcloud auth configure-docker asia-south1-docker.pkg.dev
docker build -f infra/docker/Dockerfile.node --build-arg SERVICE=auth `
  -t asia-south1-docker.pkg.dev/vertofi-prod-xxxx/vertofi/auth:latest . ; docker push ...
```

## 4. Put secrets in Secret Manager
Create `.env.production` from `.env.example` and fill the production values:
```
DATABASE_URL=<terraform output database_url>
DB_SSL=true
REDIS_URL=redis://<redis_host>:6379
KAFKA_BROKERS=pkc-xxxxx.asia-south1.gcp.confluent.cloud:9092
KAFKA_SSL=true
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=<confluent API key>
KAFKA_SASL_PASSWORD=<confluent API secret>
S3_ENDPOINT=https://storage.googleapis.com
S3_BUCKET=<documents_bucket>
S3_ACCESS_KEY=<GCS HMAC access id>
S3_SECRET_KEY=<GCS HMAC secret>
S3_FORCE_PATH_STYLE=true
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<openssl rand -base64 48>
CORS_ORIGINS=https://vertofi.com,https://app.vertofi.com,https://panels.vertofi.com
OPENAI_API_KEY=...
MSG91_AUTH_KEY=...   MSG91_SENDER_ID=...   MSG91_TEMPLATE_ID=...
SMTP_HOST=...  SMTP_USER=...  SMTP_PASS=...  SMTP_FROM=no-reply@vertofi.com
GOOGLE_VISION_KEY=...
```
Push them all:
```powershell
cd infra/gke
.\sync-secrets.ps1 -EnvFile ..\..\.env.production -ProjectId vertofi-prod-xxxx
```

## 5. Deploy the backend to GKE
```powershell
cd infra/gke
.\deploy-gke.ps1 -ProjectId vertofi-prod-xxxx -Region asia-south1 -ApiDomain api.vertofi.com
```
This installs the External Secrets Operator (wired to Secret Manager via
Workload Identity), deploys all 32 services, and exposes `api-gateway` over
managed HTTPS. Get the Ingress IP and create a DNS A record:
```powershell
kubectl get ingress vertofi-api-ingress -n vertofi-gateway
```
(No `-ApiDomain`? The script falls back to a LoadBalancer IP for `api-gateway`.)

## 6. Deploy the frontends to Vercel
For **each** of `web-landing`, `web-business`, `web-panels`, `web-admin`:
1. New Vercel Project → import this repo.
2. **Root Directory** = `apps/web-business` (etc.). Framework auto-detects
   Next.js; `vercel.json` already pins the pnpm-workspace install/build.
3. Add env vars from `.env.vercel.example` (set `NEXT_PUBLIC_API_URL` to
   `https://api.vertofi.com/api/v1`).
4. Add the custom domain (e.g. `app.vertofi.com`).

**Important:** the Vercel domains must be in the gateway's `CORS_ORIGINS`
secret (step 4). Re-run `sync-secrets.ps1` and `kubectl rollout restart
deployment api-gateway -n vertofi-gateway` if you change them.

## 7. Run DB migrations
Each service ships `pnpm migrate`. Run them once against Cloud SQL (via the
Cloud SQL Auth Proxy or a one-off Job) before opening signups.

## What changed from AWS (code is otherwise unchanged)
| Concern        | AWS (before)             | GCP (now)                                  |
|----------------|--------------------------|--------------------------------------------|
| Compute        | EKS + node groups        | **GKE Autopilot** (Helm charts reused)     |
| Postgres       | Aurora                   | **Cloud SQL** (env only)                   |
| Redis          | ElastiCache              | **Memorystore** (env only)                 |
| Object storage | S3                       | **Cloud Storage** (S3-compatible, env only)|
| Kafka          | MSK (IAM)                | **Confluent Cloud** (SASL, env only)       |
| Secrets        | Secrets Manager + IRSA   | **Secret Manager + Workload Identity**     |
| Images         | ECR                      | **Artifact Registry**                      |
| SMS OTP        | AWS SNS                  | **MSG91**                                  |
| Email OTP      | SES                      | **SMTP** (any relay)                       |
| OCR            | Textract                 | **Google Vision**                          |
| Frontends      | EKS + ALB                | **Vercel**                                 |

Blank connector keys remain safe: that connector reports `NEEDS_CREDENTIALS`
and the UI shows an empty state — never fake data.

> Cleanup: the old AWS artifacts (`infra/eks-cluster*.yaml`, `infra/deploy-eks.ps1`,
> `infra/deploy-services.ps1`, `infra/terraform/modules/aurora|network`, and the
> stray `msk-*.json` / `dns-batch.json` / `audit-job.yaml`) are no longer used and
> can be deleted once the GCP stack is verified live.
```
