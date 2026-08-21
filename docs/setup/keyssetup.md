# Vertofi — Complete API Keys, Credentials & Environment Setup Guide

> **Purpose:** every external service, API key, secret, and environment variable Vertofi needs — what it is, **how to get it** (with official links and step-by-step), **where to put it**, and **how to verify it works**.
>
> **Audience:** whoever is provisioning Vertofi for production on **GCP (GKE Autopilot) + Vercel**, or running it locally.
>
> Source of truth for the variable list: `.env.example` (local) and `.env.production.example` (prod). This guide expands every line in those files into a full procedure. Cross-references: [`current-hierarchy.md`](./current-hierarchy.md), [`bugs.md`](./bugs.md).

---

# TABLE OF CONTENTS

- **Part 0 — How configuration flows (read this first)**
  - 0.1 The three placement targets
  - 0.2 Naming convention (`vertofi-shared-<KEY>`)
  - 0.3 The "NEEDS_CREDENTIALS" philosophy
  - 0.4 Tools you must install
  - 0.5 Security rules (non-negotiable)
- **Part 1 — Core infrastructure (REQUIRED)**
  - 1.1 GCP project & billing
  - 1.2 Cloud SQL for PostgreSQL → `DATABASE_URL`
  - 1.3 Memorystore for Redis → `REDIS_URL`
  - 1.4 Cloud Storage + HMAC → `S3_*`
  - 1.5 Confluent Cloud (Kafka) → `KAFKA_*`
  - 1.6 Artifact Registry (images)
  - 1.7 GCP Secret Manager + External Secrets Operator
- **Part 2 — Secrets you generate yourself**
  - 2.1 JWT secrets
  - 2.2 `APP_FIELD_KEY` (pgcrypto)
  - 2.3 Break-glass OTP
- **Part 3 — External provider credentials (one chapter each)**
  - 3.1 OpenAI (primary LLM) — `OPENAI_API_KEY`
  - 3.2 Google Cloud Vision (OCR) — `GOOGLE_VISION_KEY`
  - 3.3 Gemini (optional secondary LLM) — `GEMINI_API_KEY`
  - 3.4 MSG91 (SMS OTP, India/TRAI-DLT) — `MSG91_*`
  - 3.5 Email/SMTP (OTP + notifications) — `SMTP_*`
  - 3.6 Meta WhatsApp Business — `WHATSAPP_*`
  - 3.7 Razorpay (payments + subscriptions) — `RAZORPAY_*`
  - 3.8 GST GSP (Masters India) — `GST_GSP_*`
  - 3.9 Account Aggregator (Setu) — `AA_*`
  - 3.10 Zoho Books — `ZOHO_*`
  - 3.11 QuickBooks Online — `QBO_*`
  - 3.12 Tally — `TALLY_CONNECTOR_URL`
  - 3.13 Verification connectors — `PAYROLL_API_KEY` / `CREDIT_BUREAU_API_KEY` / `MCA_API_KEY`
  - 3.14 Admin-console extras — `GITHUB_TOKEN` / `GITHUB_REPO` / `NEXT_PUBLIC_GRAFANA_URL`
- **Part 4 — Frontend (Vercel) variables**
- **Part 5 — Placement mechanics (the exact commands)**
- **Part 6 — Master variable matrix & "minimum to boot"**
- **Part 7 — Verification playbook (per service)**
- **Part 8 — Rotation, revocation & incident response**
- **Part 9 — FAQ & troubleshooting**

---

# PART 0 — HOW CONFIGURATION FLOWS (READ THIS FIRST)

Vertofi reads **all** runtime config from environment variables. There is no config file checked into the repo with real values. Understanding *where each variable lives* is the whole game.

## 0.1 The three placement targets

There are exactly **three** places a value can go, depending on what consumes it:

| Target | Used by | How it gets there | When |
|--------|---------|-------------------|------|
| **A. Local `.env`** | the 32 services + 3 Python services when you run them on your machine (`pnpm dev`, docker-compose) | you edit `E:\VERTOFI APPLICATION\.env` (copied from `.env.example`) | local dev only |
| **B. GCP Secret Manager** | the 32 backend services running on GKE in production | `infra/gke/sync-secrets.ps1` reads `.env.production` and pushes each key as `vertofi-shared-<KEY>`; the **External Secrets Operator (ESO)** projects them into every pod as env vars | production backend |
| **C. Vercel project env** | the 8 Next.js frontends (build-time `NEXT_PUBLIC_*`) | Vercel dashboard → Project → Settings → Environment Variables, or `vercel env add` | production frontend |

**Rule of thumb:**
- Anything a **backend** service reads (DB, Kafka, OpenAI, Razorpay secret, JWT secret, SMTP, WhatsApp, GST, AA, …) → **A** locally, **B** in prod.
- Anything starting with **`NEXT_PUBLIC_`** is baked into the browser bundle at build → **C** (Vercel). Never put a real secret behind a `NEXT_PUBLIC_` name — it ships to every visitor.

```
            ┌─────────────┐         sync-secrets.ps1         ┌────────────────────┐   ESO   ┌──────────────┐
.env.prod → │ you fill in  │ ───────────────────────────────►│ GCP Secret Manager │ ───────►│ GKE pods     │
            └─────────────┘   vertofi-shared-<KEY>           └────────────────────┘         │ (env vars)   │
                                                                                             └──────────────┘
NEXT_PUBLIC_* ──────────────────────────────────────────────────────────────────────────►  Vercel build → browser
```

## 0.2 Naming convention in Secret Manager
Every backend secret is stored under a **shared prefix**: a variable `OPENAI_API_KEY` becomes the Secret Manager secret **`vertofi-shared-OPENAI_API_KEY`**. ESO's `ExternalSecret` finds them by that prefix and injects the bare name (`OPENAI_API_KEY`) into the pod. **One shared set is used by all services** — you do not create per-service secrets.

## 0.3 The "NEEDS_CREDENTIALS" philosophy (important)
Vertofi is built so that **a missing credential never crashes the platform and never fakes data**. If you leave, say, `AA_CLIENT_ID` blank, the bank connector returns a `NEEDS_CREDENTIALS` state and the UI shows an honest empty/onboarding card. This means you can **launch with only the REQUIRED core + a minimal credential set**, and add the rest later. See Part 6 for the true minimum.

**Hard-required (platform won't serve):** `DATABASE_URL`, `REDIS_URL`, Kafka, `S3_*`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `APP_FIELD_KEY`, gateway `CORS_ORIGINS`.
**Needed to actually log in:** either SMTP (email OTP) or MSG91 (SMS OTP) — or the temporary break-glass OTP.
**Everything else degrades gracefully.**

## 0.4 Tools you must install
- **Google Cloud SDK (`gcloud`)** — https://cloud.google.com/sdk/docs/install
- **kubectl** + **helm** + **terraform** (the user already has these per the deploy notes).
- **Vercel CLI** — `npm i -g vercel` — https://vercel.com/docs/cli
- **Node 22 + pnpm 10** (already installed).
- PowerShell (Windows) for the `infra/gke/*.ps1` scripts.

## 0.5 Security rules (non-negotiable)
1. **Never commit `.env` or `.env.production`** with real values. They are gitignored — keep it that way.
2. **Never** put a secret under a `NEXT_PUBLIC_` name.
3. Use a **dedicated mailbox / sub-account** for each provider where possible (so you can rotate without breaking personal logins).
4. Prefer **test/sandbox keys** until the platform is verified end-to-end, then swap to live keys (Razorpay, GST, AA especially).
5. Turn **off** `OTP_BYPASS_ENABLED` the moment real OTP delivery works (Part 2.3).
6. Rotate any key that ever appears in a log, screenshot, or chat. See Part 8.

---

# PART 1 — CORE INFRASTRUCTURE (REQUIRED)

These come mostly from `terraform apply` (see `current-hierarchy.md` §8), but you still need to capture their connection strings/keys and put them in `.env.production`.

## 1.1 GCP project & billing
1. Create/choose a project: https://console.cloud.google.com/projectcreate — note the **Project ID** (e.g. `vertofi-prod-001`).
2. Link a billing account: https://console.cloud.google.com/billing
3. Authenticate locally:
   ```powershell
   gcloud auth login
   gcloud config set project vertofi-prod-001
   gcloud auth application-default login
   ```
4. Enable the APIs Vertofi uses (Terraform enables most, but do these up front):
   ```powershell
   gcloud services enable `
     container.googleapis.com sqladmin.googleapis.com redis.googleapis.com `
     storage.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com `
     vision.googleapis.com cloudbilling.googleapis.com iam.googleapis.com `
     --project vertofi-prod-001
   ```
**Env captured here:**
```
GOOGLE_CLOUD_PROJECT=vertofi-prod-001
GCP_REGION=asia-south1
GCP_BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX   # console.cloud.google.com/billing → your account ID
```
> On GKE these are also available via Workload Identity; set them explicitly so the admin-console cloud/billing tabs work.

## 1.2 Cloud SQL for PostgreSQL → `DATABASE_URL`
Created by Terraform (Postgres 16, HA, PITR, encrypted). To capture the connection string:
1. Console: https://console.cloud.google.com/sql/instances
2. Get the instance's private IP (or use the **Cloud SQL Auth Proxy** for migrations).
3. Set the DB password (Terraform output, or `gcloud sql users set-password`).
```
DATABASE_URL=postgresql://vertofi:<DB_PASSWORD>@<CLOUDSQL_PRIVATE_IP>:5432/vertofi
DB_SSL=true
# Optional read-replica for reporting/admin reads:
DATABASE_URL_RO=postgresql://vertofi:<DB_PASSWORD>@<REPLICA_IP>:5432/vertofi
```
**Migrations:** run `pnpm migrate` per service against Cloud SQL (via the Auth Proxy or a one-shot Job) **before** opening signups.

## 1.3 Memorystore for Redis → `REDIS_URL`
Created by Terraform. Capture the host:
1. Console: https://console.cloud.google.com/memorystore/redis/instances
```
REDIS_URL=redis://<MEMORYSTORE_HOST>:6379
```
Used for: sessions, AI usage metering (`ai:usage`), rate limits, caches.

## 1.4 Cloud Storage + HMAC → `S3_*`
Vertofi talks to GCS through its **S3-compatible** API, so it uses S3-style keys.
1. The documents bucket is created by Terraform (output `documents_bucket`).
2. Create **HMAC keys** for the runtime service account:
   ```powershell
   gcloud storage hmac create vertofi-runtime@vertofi-prod-001.iam.gserviceaccount.com --project vertofi-prod-001
   # Output: Access ID (→ S3_ACCESS_KEY) and Secret (→ S3_SECRET_KEY)
   ```
   Docs: https://cloud.google.com/storage/docs/authentication/hmackeys
3. Set CORS on the bucket so the browser can do presigned PUTs (already documented in setup-guide; the value mirrors `CORS_ORIGINS`).
```
S3_ENDPOINT=https://storage.googleapis.com
S3_FORCE_PATH_STYLE=true
S3_REGION=asia-south1
S3_BUCKET=<documents_bucket>
S3_ACCESS_KEY=<HMAC Access ID>
S3_SECRET_KEY=<HMAC Secret>
```

## 1.5 Confluent Cloud (Kafka) → `KAFKA_*`
Vertofi's entire event pipeline (document→OCR→categorization→ledger→BHS, audit black box) runs on Kafka.
1. Sign up / log in: https://confluent.cloud
2. Create a **cluster** in a region close to `asia-south1` (e.g. Mumbai/Singapore). A **Basic** cluster is fine to start.
3. Cluster → **API keys** → *Create key* (scoped to the cluster). Save the **Key** and **Secret**.
4. Cluster settings → **Bootstrap server** (looks like `pkc-xxxxx.<region>.gcp.confluent.cloud:9092`).
5. (Optional) Pre-create topics, or let the services auto-create.
```
KAFKA_BROKERS=pkc-xxxxx.asia-south1.gcp.confluent.cloud:9092
KAFKA_CLIENT_ID=vertofi
KAFKA_SSL=true
KAFKA_SASL_MECHANISM=plain          # Confluent uses "plain" with the API key/secret
KAFKA_SASL_USERNAME=<Confluent API Key>
KAFKA_SASL_PASSWORD=<Confluent API Secret>
```
> The Python services (ocr, ai-gateway, categorization) read the same SASL vars and build `security_protocol=SASL_SSL` automatically.

## 1.6 Artifact Registry (images)
Created by Terraform at `asia-south1-docker.pkg.dev/<project>/vertofi`. Images are built & pushed by **GitHub Actions** (`.github/workflows/deploy.yml`) on push to `main`. The workflow needs these **GitHub repo secrets** (Settings → Secrets and variables → Actions):
```
GCP_PROJECT_ID = vertofi-prod-001
GCP_REGION     = asia-south1
GCP_SA_KEY     = <JSON key of a deployer service account with Artifact Registry Writer>
```
Create the deployer SA key:
```powershell
gcloud iam service-accounts create vertofi-ci --project vertofi-prod-001
gcloud projects add-iam-policy-binding vertofi-prod-001 `
  --member "serviceAccount:vertofi-ci@vertofi-prod-001.iam.gserviceaccount.com" `
  --role roles/artifactregistry.writer
gcloud iam service-accounts keys create ci-key.json `
  --iam-account vertofi-ci@vertofi-prod-001.iam.gserviceaccount.com
# paste ci-key.json contents into the GCP_SA_KEY GitHub secret, then delete the local file
```

## 1.7 GCP Secret Manager + External Secrets Operator
This is **target B** from Part 0. You don't create secrets by hand — `sync-secrets.ps1` does it from `.env.production`. ESO + the `ClusterSecretStore gcp-secret-manager` are installed by `deploy-gke.ps1`. See Part 5 for the exact run.

---

# PART 2 — SECRETS YOU GENERATE YOURSELF

These aren't from a provider — you create strong random values.

## 2.1 JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`)
Used by `auth` to sign access + refresh tokens. **Services fail-fast in production if these are missing or shorter than 16 chars.** Use two *different* long random strings.
```powershell
# Generate two 48-byte base64 secrets:
[Convert]::ToBase64String((1..48 | ForEach-Object {Get-Random -Max 256}))   # → JWT_ACCESS_SECRET
[Convert]::ToBase64String((1..48 | ForEach-Object {Get-Random -Max 256}))   # → JWT_REFRESH_SECRET
```
or on bash: `openssl rand -base64 48`
```
JWT_ACCESS_SECRET=<random ≥16 chars, unique>
JWT_REFRESH_SECRET=<random ≥16 chars, unique, different from access>
JWT_ACCESS_TTL=900          # 15 minutes
JWT_REFRESH_TTL=2592000     # 30 days
```

## 2.2 `APP_FIELD_KEY` (pgcrypto field encryption)
Symmetric key used by admin-console's pgcrypto helpers to encrypt/decrypt sensitive columns at rest. Generate once and **never lose it** (losing it = unreadable encrypted fields).
```powershell
openssl rand -base64 32   # → APP_FIELD_KEY
```
```
APP_FIELD_KEY=<random 32-byte base64>
```

## 2.3 Break-glass OTP (TEMPORARY)
Lets the pilot team log in **before** SMTP/SMS is configured. It is **not** a hardcoded code — it requires you to set a per-deployment operator secret, and it must be turned **off** once real OTP delivery works.
```
OTP_BYPASS_ENABLED=1          # 1=on (pilot), 0=off
OTP_BYPASS_CODE=<your 6-digit operator secret>   # entered in the OTP box
```
> **Set `OTP_BYPASS_ENABLED=0` (or remove both) the moment `SMTP_*` or `MSG91_*` deliver real codes.** Leaving it on in production is a standing backdoor.

---

# PART 3 — EXTERNAL PROVIDER CREDENTIALS

Each chapter: **what it powers → where to sign up → step-by-step → the env vars → where to place → how to verify → cost note.**

---

## 3.1 OpenAI — `OPENAI_API_KEY`  *(primary LLM — powers AI-draft invoices, categorization, WhatsApp AI, Voice-CFO, legal notice analysis)*

**Powers:** `ai-gateway` (and via it: categorization, accounting AI-draft, vbd, legal-cases, whatsapp). Without it, the AI gateway "degrades honestly" — categorization falls back to deterministic rules, AI drafts are unavailable.

**Get the key:**
1. Create an account: https://platform.openai.com/signup
2. Add a payment method + a usage limit: https://platform.openai.com/account/billing
3. Create a key: https://platform.openai.com/api-keys → **Create new secret key** → copy `sk-...` (shown once).
4. (Recommended) Create the key inside a **Project** so you can cap spend and revoke independently.

**Env:**
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
AI_USD_PER_1K_TOKENS=0.0006     # only the cost-estimate rate shown in admin console; not billed by us
```
**Place:** backend → `.env` (local) / Secret Manager (prod).
**Verify:** after deploy, `ai-gateway` `/health` should report `openai: configured`; create an AI-draft invoice in `business → /workspace → "Ask Vertofi"`.
**Cost:** pay-as-you-go per token; set a hard monthly cap in the OpenAI dashboard.

> **Model policy:** Vertofi standardized on **OpenAI**. (`GEMINI_API_KEY` is an optional secondary — 3.3.) Use the latest cost-effective models; the gateway handles model-tiering/caching/retry.

---

## 3.2 Google Cloud Vision — `GOOGLE_VISION_KEY`  *(OCR for uploaded invoices/receipts)*

**Powers:** the `ocr` service. Without it, uploaded documents are routed to human review (`NEEDS_REVIEW`) instead of being auto-extracted.

**Two ways to authenticate:**
- **(Recommended on GKE) Workload Identity** — the runtime SA already has access; you can leave `GOOGLE_VISION_KEY` blank and grant the SA the Vision role:
  ```powershell
  gcloud services enable vision.googleapis.com --project vertofi-prod-001
  gcloud projects add-iam-policy-binding vertofi-prod-001 `
    --member "serviceAccount:vertofi-runtime@vertofi-prod-001.iam.gserviceaccount.com" `
    --role roles/serviceusage.serviceUsageConsumer
  ```
- **(Simple / non-GKE) API key:**
  1. https://console.cloud.google.com/apis/credentials → **Create credentials → API key**.
  2. Restrict the key to the **Cloud Vision API** only.
  ```
  GOOGLE_VISION_KEY=AIza...
  ```
**Place:** backend.
**Verify:** upload a clear invoice photo in the business app → it should populate extracted fields (not sit in review).
**Cost:** first 1,000 units/month free, then per-1,000 pricing — https://cloud.google.com/vision/pricing

---

## 3.3 Gemini (optional) — `GEMINI_API_KEY`
Optional secondary LLM. Get a key at **Google AI Studio**: https://aistudio.google.com/app/apikey
```
GEMINI_API_KEY=AIza...
```
Leave blank if you're OpenAI-only (the default). **Place:** backend.

---

## 3.4 MSG91 — `MSG91_AUTH_KEY` / `MSG91_SENDER_ID` / `MSG91_TEMPLATE_ID`  *(SMS OTP for India, TRAI-DLT compliant)*

**Powers:** `auth` SMS OTP delivery. This is the India-specific path; sending SMS to Indian numbers legally **requires TRAI DLT registration** (sender ID + template approval). Budget a few business days for approvals.

**Step-by-step:**
1. Create an MSG91 account: https://msg91.com/signup
2. **DLT registration** (one-time, required by TRAI): register your business on a DLT portal (e.g. Jio/Vodafone/Airtel DLT). MSG91 has a guide: https://help.msg91.com (search "DLT"). You'll get:
   - a **Principal Entity ID (PEID)**,
   - an approved **Header / Sender ID** (6 alphabetic chars, e.g. `VERTFI`),
   - approved **content templates** (each gets a **DLT Template ID**).
3. In MSG91, link your DLT account and create the OTP template(s). Approve them.
4. Get your **Auth Key**: MSG91 dashboard → https://control.msg91.com → **Settings / API → Auth Key**.
5. Note the **Sender ID** and the **Template ID** for the login OTP.

**Env:**
```
MSG91_AUTH_KEY=<your MSG91 auth key>
MSG91_SENDER_ID=VERTFI            # your approved 6-char DLT header
MSG91_TEMPLATE_ID=<DLT template id for the base OTP>
# Optional per-purpose templates (fall back to MSG91_TEMPLATE_ID if unset):
# MSG91_TEMPLATE_ID_LOGIN= / _REGISTER= / _RESET= / _FINANCIAL= / _DOCUMENT= / _MFA=
```
**Place:** backend.
**Verify:** request an OTP at any login screen with an Indian mobile → SMS arrives within seconds. Until approved, use email OTP (3.5) or break-glass (2.3).
**Cost:** per-SMS, prepaid wallet. https://msg91.com/in/pricing

---

## 3.5 Email / SMTP — `SMTP_*`  *(email OTP + transactional notifications)*

**Powers:** `auth` email OTP and `notification` dispatch. Any SMTP provider works. Two common choices:

### Option A — Google Workspace (Gmail) app password (fastest if you already have Workspace)
1. The sending mailbox (e.g. `no-reply@vertofi.com`) must have **2-Step Verification ON**.
2. Create an **App Password**: https://myaccount.google.com/apppasswords → choose "Mail" → copy the 16-char password.
3. Use:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=no-reply@vertofi.com
   SMTP_PASS=<16-char app password, no spaces>
   SMTP_FROM=no-reply@vertofi.com
   ```
   Note: Gmail/Workspace has daily send limits (~2,000/day Workspace). Fine for pilot; move to a dedicated ESP for scale.

### Option B — Dedicated ESP (SendGrid / Brevo / Mailgun) — better deliverability at scale
- **SendGrid:** https://signup.sendgrid.com → verify a sender/domain → Settings → API Keys → create. Then:
  ```
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey            # literally the word "apikey"
  SMTP_PASS=<SendGrid API key>
  SMTP_FROM=no-reply@vertofi.com
  ```
- **Brevo (Sendinblue):** https://app.brevo.com → SMTP & API → SMTP. Host `smtp-relay.brevo.com`, port `587`, user = your login, pass = the SMTP key.
- **Mailgun:** https://signup.mailgun.com → add+verify domain → SMTP credentials. Host `smtp.mailgun.org`.

**Domain auth (do this for any option):** add **SPF**, **DKIM**, and **DMARC** DNS records for `vertofi.com` so OTP emails don't land in spam. Each provider shows the exact records.

**Place:** backend.
**Verify:** request an email OTP → it arrives; check it's not in spam (fix DKIM/SPF if it is).

---

## 3.6 Meta WhatsApp Business — `WHATSAPP_*`  *(WhatsApp accounting + AI replies)*

**Powers:** the `whatsapp` service (inbound webhook, AI replies, photo→document, plan-aware menus).

**Step-by-step:**
1. Create a Meta developer account: https://developers.facebook.com → **My Apps → Create App → Business**.
2. Add the **WhatsApp** product to the app.
3. In **WhatsApp → API Setup** you get a **test number** + a temporary token. For production, add your **own business phone number** and complete **Business Verification** (Meta Business Manager): https://business.facebook.com
4. Generate a **permanent System User access token** (Business Settings → System Users → add → assign the app → generate token with `whatsapp_business_messaging` + `whatsapp_business_management`).
5. Note the **Phone Number ID** (WhatsApp → API Setup).
6. Get the **App Secret** (App → Settings → Basic → App Secret) — used to verify the inbound `x-hub-signature-256`.
7. **Choose your own** verify token string (any random string you make up).
8. Configure the **webhook**: WhatsApp → Configuration → Callback URL = `https://<your whatsapp ingress>/webhook` (the whatsapp service has its own ingress; it is **not** behind the api-gateway), Verify Token = the value you chose. Subscribe to the `messages` field.

**Env:**
```
WHATSAPP_API_TOKEN=<permanent system-user token>
WHATSAPP_PHONE_ID=<phone number ID>
WHATSAPP_VERIFY_TOKEN=<the random string you chose; paste the same value in Meta>
WHATSAPP_APP_SECRET=<app secret>
```
**Place:** backend.
**Verify:** Meta's webhook "Verify and Save" succeeds; send a WhatsApp message to your number → you get an AI reply; send an invoice photo → a draft is created.
**Note:** WhatsApp `wa_user → org` mapping is a known depth gap (see `current-hierarchy.md` §10) — replies/menus work, full per-org actions are limited until that table is added.
**Cost:** Meta conversation-based pricing — https://developers.facebook.com/docs/whatsapp/pricing

---

## 3.7 Razorpay — `RAZORPAY_*`  *(payments, 7-day trial, UPI/card autopay subscriptions)*

**Powers:** the `billing` service + the `/subscribe` page. Without it, billing degrades to "trial active".

**Step-by-step:**
1. Create an account: https://dashboard.razorpay.com/signup → complete **KYC** (PAN, bank, business proof) to enable **Live** mode. Use **Test mode** keys first.
2. **API keys:** Dashboard → Settings → **API Keys** → *Generate Key* → copy **Key ID** (`rzp_test_...` / `rzp_live_...`) and **Key Secret** (shown once).
3. **Subscriptions / Plans:** Dashboard → **Subscriptions → Plans** → create one **Plan per tier**. Copy each `plan_id` (`plan_...`):
   - Starter → `RAZORPAY_PLAN_STARTER`
   - Growth → `RAZORPAY_PLAN_GROWTH`
   - Pro → `RAZORPAY_PLAN_PRO`
   Enable the methods you want for autopay mandate (UPI AutoPay / cards / e-mandate).
4. **Webhook:** Dashboard → Settings → **Webhooks** → *Add New Webhook*:
   - URL = `https://api.vertofi.com/api/v1/billing/webhook/razorpay` (this path is in the gateway's public allowlist).
   - Set a **Webhook Secret** (you choose it) → that's `RAZORPAY_WEBHOOK_SECRET`.
   - Subscribe to events: `subscription.authenticated`, `subscription.charged`, `subscription.halted`, `subscription.pending`, `subscription.cancelled` (+ `payment.captured`).

**Env:**
```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=<key secret>
RAZORPAY_WEBHOOK_SECRET=<the secret you set on the webhook>
RAZORPAY_PLAN_STARTER=plan_xxxxxxxx
RAZORPAY_PLAN_GROWTH=plan_xxxxxxxx
RAZORPAY_PLAN_PRO=plan_xxxxxxxx
```
**Place:** backend. (The Key ID is also used client-side by Razorpay Checkout, but the business app fetches it / uses the public checkout flow — do **not** invent a `NEXT_PUBLIC_` secret.)
**Verify:** in test mode, run `/subscribe` → Razorpay Checkout opens → complete a test mandate → the webhook flips billing to trial/active and the Celebration screen shows.
**Cost:** Razorpay per-transaction fee; no setup fee.

---

## 3.8 GST GSP (Masters India) — `GST_GSP_*`  *(GSTIN verification + GST filing data)*

**Powers:** the `gst-connector`. Blank → offline structural GSTIN validation only (no live portal verify).

**Step-by-step:**
1. Choose a **GST Suvidha Provider (GSP)** / API aggregator. Common: **Masters India** (https://www.mastersindia.co/gst-api/), ClearTax, or another GSP.
2. Sign up for their GST API product, complete onboarding, and get **client credentials** + the **base URL** for their API environment (sandbox first).
```
GST_GSP_BASE_URL=https://api.mastersindia.co   # provider-specific
GST_GSP_CLIENT_ID=<client id>
GST_GSP_CLIENT_SECRET=<client secret>
```
**Place:** backend.
**Verify:** GSTIN lookup returns live taxpayer details instead of just a structural pass.
**Note:** GST connector is currently stateless (no returns tables) — see §10 gaps.

---

## 3.9 Account Aggregator (Setu) — `AA_*`  *(consent-based bank statement fetch)*

**Powers:** the `bank-connector` (RBI Account Aggregator framework). Blank → empty state.

**Step-by-step:**
1. Use an AA gateway provider — **Setu** is common: https://setu.co/data/account-aggregator
2. Sign up, complete onboarding/KYC, get **sandbox** then **production** credentials + base URL.
```
AA_BASE_URL=https://fiu-sandbox.setu.co   # provider/env-specific
AA_CLIENT_ID=<client id>
AA_CLIENT_SECRET=<client secret>
```
**Place:** backend.
**Verify:** initiate a bank-link consent flow → statements flow into reconciliation.
**Note:** stateless (no consents table yet) — §10 gap.

---

## 3.10 Zoho Books — `ZOHO_*`  *(accounting-sync target)*
**Powers:** `accounting-sync` pushing posted ledgers to Zoho Books.
1. Zoho API console: https://api-console.zoho.in (use `.in` for India DC) → **Add Client → Server-based** → set redirect URI.
2. Copy **Client ID** + **Client Secret**; complete the OAuth grant to get refresh tokens (the connector handles token exchange).
```
ZOHO_CLIENT_ID=<client id>
ZOHO_CLIENT_SECRET=<client secret>
```
**Place:** backend. Optional — leave blank if not syncing to Zoho.

## 3.11 QuickBooks Online — `QBO_*`  *(accounting-sync target)*
1. Intuit developer: https://developer.intuit.com → create an app → **Keys & OAuth**.
2. Copy **Client ID** + **Client Secret** (use Development keys first, then Production).
```
QBO_CLIENT_ID=<client id>
QBO_CLIENT_SECRET=<client secret>
```
**Place:** backend. Optional.

## 3.12 Tally — `TALLY_CONNECTOR_URL`  *(accounting-sync target)*
Tally syncs via a local/remote Tally connector endpoint (Tally Prime running with the HTTP/XML gateway, or a bridge you host).
```
TALLY_CONNECTOR_URL=http://<tally-host>:9000   # your Tally gateway endpoint
```
**Place:** backend. Optional.

---

## 3.13 Verification connectors (optional) — `PAYROLL_API_KEY` / `CREDIT_BUREAU_API_KEY` / `MCA_API_KEY`
Used by `verification-connectors` for payroll, credit-bureau, and MCA (Ministry of Corporate Affairs) checks. These are **stubs** — wire real provider keys when you contract those providers (e.g. a credit bureau like CIBIL/Experian via an aggregator, an MCA data provider). Leave blank → connector reports `NEEDS_CREDENTIALS`.
```
PAYROLL_API_KEY=
CREDIT_BUREAU_API_KEY=
MCA_API_KEY=
```
**Place:** backend.

---

## 3.14 Admin-console extras — `GITHUB_TOKEN` / `GITHUB_REPO` / `NEXT_PUBLIC_GRAFANA_URL`
Power optional tabs in the internal admin console.
- **GitHub Actions tab** — a fine-grained PAT with read access to Actions:
  1. https://github.com/settings/personal-access-tokens/new → repo-scoped, **Actions: Read**, **Contents: Read**.
  ```
  GITHUB_TOKEN=github_pat_xxx
  GITHUB_REPO=your-org/vertofi
  ```
  **Place:** backend (admin-console).
- **Observability tab (Grafana iframe):**
  ```
  NEXT_PUBLIC_GRAFANA_URL=https://grafana.yourdomain.com
  ```
  **Place:** Vercel (web-admin project) — it's a `NEXT_PUBLIC_` build-time URL (not a secret).

---

# PART 4 — FRONTEND (VERCEL) VARIABLES

Set these in each Vercel project (**Settings → Environment Variables**, Production scope). They are build-time `NEXT_PUBLIC_*` — public by design, never secrets.

| Variable | Value | Which Vercel projects |
|----------|-------|------------------------|
| `NEXT_PUBLIC_API_URL` | `https://api.vertofi.com/api/v1` | **all 8** apps |
| `NEXT_PUBLIC_BUSINESS_URL` | `https://business.vertofi.com` | web-landing |
| `NEXT_PUBLIC_ASSOCIATES_URL` | `https://associates.vertofi.com` | web-landing |
| `NEXT_PUBLIC_ACCOUNTANTS_URL` | `https://accountants.vertofi.com` | web-landing |
| `NEXT_PUBLIC_BHS_URL` | `https://bhs.vertofi.com` | web-landing |
| `NEXT_PUBLIC_LEGAL_URL` | `https://legal.vertofi.com` | web-landing |
| `NEXT_PUBLIC_GRAFANA_URL` | `https://grafana.yourdomain.com` (optional) | web-admin |

> **The matching backend variable `CORS_ORIGINS` must list every one of these domains** or the browser will get CORS errors. See Part 5.3.

After setting Vercel envs, **redeploy** the affected project (envs are baked at build time).

```
CORS_ORIGINS=https://vertofi.com,https://www.vertofi.com,https://business.vertofi.com,https://associates.vertofi.com,https://accountants.vertofi.com,https://bhs.vertofi.com,https://legal.vertofi.com,https://admin.vertofi.com,https://teams.vertofi.com
RATE_LIMIT_PER_MIN=600
```

---

# PART 5 — PLACEMENT MECHANICS (THE EXACT COMMANDS)

## 5.1 Local development (target A)
```powershell
Copy-Item .env.example .env
# edit .env — for local you only really need DATABASE_URL/REDIS_URL/KAFKA_BROKERS (docker),
# JWT secrets, and OTP_BYPASS to log in. Add provider keys as you test each feature.
pnpm infra:up      # starts Postgres/Redis/Redpanda/MinIO/OpenSearch via docker-compose
pnpm dev           # or run individual services
```

## 5.2 Production backend (target B) — push to Secret Manager
Fill `.env.production` (copy from `.env.production.example`), then:
```powershell
cd infra\gke
.\sync-secrets.ps1 -EnvFile ..\..\.env.production -ProjectId vertofi-prod-001
```
This creates/updates `vertofi-shared-<KEY>` for every line. To push a single value by hand:
```powershell
# first time:
gcloud secrets create vertofi-shared-OPENAI_API_KEY --replication-policy=automatic --project vertofi-prod-001
# add/update value (no trailing newline):
"sk-proj-xxxx" | gcloud secrets versions add vertofi-shared-OPENAI_API_KEY --data-file=- --project vertofi-prod-001
```
After changing secrets, force pods to pick them up:
```powershell
# ESO re-syncs on its refresh interval; to apply now, restart the consumers:
kubectl rollout restart deployment --all -n vertofi-gateway
kubectl rollout restart deployment --all -n vertofi-identity
# (repeat per namespace, or restart only the affected service)
```

## 5.3 Production frontend (target C) — Vercel
```powershell
# per project, e.g. for web-landing:
vercel env add NEXT_PUBLIC_API_URL production         # paste https://api.vertofi.com/api/v1
vercel env add NEXT_PUBLIC_BUSINESS_URL production     # paste https://business.vertofi.com
# ...repeat the table in Part 4, then redeploy:
vercel redeploy --target production
```
And whenever you add a Vercel domain, **update `CORS_ORIGINS`** (5.2) and restart the gateway:
```powershell
kubectl rollout restart deployment api-gateway -n vertofi-gateway
```

---

# PART 6 — MASTER VARIABLE MATRIX & "MINIMUM TO BOOT"

## 6.1 Full matrix

| Variable | Provider / source | Target | Required? | Powers |
|----------|-------------------|--------|-----------|--------|
| `DATABASE_URL` | Cloud SQL | B (A local) | ✅ HARD | everything |
| `DB_SSL` | — | B | ✅ | DB TLS |
| `DATABASE_URL_RO` | Cloud SQL replica | B | optional | reporting reads |
| `REDIS_URL` | Memorystore | B | ✅ HARD | sessions/cache/metering |
| `KAFKA_BROKERS` | Confluent | B | ✅ HARD | event pipeline |
| `KAFKA_CLIENT_ID` | — | B | ✅ | Kafka |
| `KAFKA_SSL` | Confluent | B | ✅ | Kafka TLS |
| `KAFKA_SASL_MECHANISM` | Confluent | B | ✅ | Kafka auth |
| `KAFKA_SASL_USERNAME` | Confluent API key | B | ✅ | Kafka auth |
| `KAFKA_SASL_PASSWORD` | Confluent API secret | B | ✅ | Kafka auth |
| `S3_ENDPOINT/REGION/BUCKET` | GCS | B | ✅ HARD | document storage |
| `S3_ACCESS_KEY/S3_SECRET_KEY` | GCS HMAC | B | ✅ HARD | document storage |
| `S3_FORCE_PATH_STYLE` | — | B | ✅ | GCS S3 API |
| `JWT_ACCESS_SECRET` | generated | B | ✅ HARD | auth tokens |
| `JWT_REFRESH_SECRET` | generated | B | ✅ HARD | refresh tokens |
| `JWT_ACCESS_TTL/REFRESH_TTL` | — | B | ✅ | token lifetimes |
| `APP_FIELD_KEY` | generated | B | ✅ HARD | field encryption |
| `CORS_ORIGINS` | — | B | ✅ HARD | gateway CORS |
| `RATE_LIMIT_PER_MIN` | — | B | recommended | gateway rate limit |
| `OTP_BYPASS_ENABLED/CODE` | generated | B | temporary | break-glass login |
| `SMTP_*` | Workspace/ESP | B | ✅* login (email path) | email OTP + notifications |
| `MSG91_*` | MSG91 | B | ✅* login (SMS path) | SMS OTP |
| `OPENAI_API_KEY` | OpenAI | B | strongly recommended | all AI |
| `AI_USD_PER_1K_TOKENS` | — | B | optional | cost estimate |
| `GEMINI_API_KEY` | Google AI Studio | B | optional | secondary LLM |
| `GOOGLE_VISION_KEY` | GCP (or WI) | B | recommended | OCR |
| `WHATSAPP_*` | Meta | B | optional | WhatsApp |
| `RAZORPAY_*` (7 vars) | Razorpay | B | needed to charge | billing/subscriptions |
| `GST_GSP_*` | GSP | B | optional | GST verify |
| `AA_*` | Setu | B | optional | bank fetch |
| `ZOHO_*`/`QBO_*`/`TALLY_CONNECTOR_URL` | resp. | B | optional | accounting sync |
| `PAYROLL_API_KEY`/`CREDIT_BUREAU_API_KEY`/`MCA_API_KEY` | resp. | B | optional | verification |
| `GITHUB_TOKEN`/`GITHUB_REPO` | GitHub | B | optional | admin pipelines tab |
| `GOOGLE_CLOUD_PROJECT`/`GCP_REGION`/`GCP_BILLING_ACCOUNT_ID` | GCP | B | optional | admin cloud tabs |
| `NEXT_PUBLIC_API_URL` | — | C | ✅ HARD | frontends → gateway |
| `NEXT_PUBLIC_BUSINESS_URL` + 4 panel URLs | — | C | ✅ | landing links |
| `NEXT_PUBLIC_GRAFANA_URL` | — | C (web-admin) | optional | observability tab |

`✅*` = you need **at least one** of SMTP or MSG91 (or break-glass) for users to log in.

## 6.2 Absolute minimum to boot & log in (pilot)
1. Core infra: `DATABASE_URL`, `DB_SSL`, `REDIS_URL`, all `KAFKA_*`, all `S3_*`.
2. Generated: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `APP_FIELD_KEY`.
3. Gateway: `CORS_ORIGINS` (with your Vercel domains).
4. Login: **either** `SMTP_*` **or** `MSG91_*` — or temporarily `OTP_BYPASS_ENABLED=1` + `OTP_BYPASS_CODE`.
5. Frontend: `NEXT_PUBLIC_API_URL` (+ landing URLs).

Everything else can be added incrementally; each missing connector simply shows a `NEEDS_CREDENTIALS` empty state.

---

# PART 7 — VERIFICATION PLAYBOOK (PER SERVICE)

After deploy, work down this list:

```bash
# 1. Gateway up + public health
curl -s https://api.vertofi.com/health                 # → {"status":"ok"}

# 2. Auth public path reachable (login entrypoint)
curl -s -X POST https://api.vertofi.com/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"channel":"EMAIL","destination":"you@example.com","purpose":"LOGIN"}'   # → 202 {challengeId}

# 3. CORS for a frontend origin
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS https://api.vertofi.com/api/v1/auth/otp/send \
  -H "Origin: https://business.vertofi.com" -H "Access-Control-Request-Method: POST"   # → 204 with ACAO header

# 4. Protected route requires a token
curl -s -o /dev/null -w "%{http_code}\n" https://api.vertofi.com/api/v1/accounting/x   # → 401
```
Then in the apps:
- **OTP delivery** — email arrives (SMTP) or SMS arrives (MSG91).
- **OCR** — upload an invoice → fields extract (Vision configured) vs land in review (not configured).
- **AI** — `/workspace → Ask Vertofi` drafts an invoice (OpenAI configured).
- **Billing** — `/subscribe` test mandate flips state via the Razorpay webhook.
- **WhatsApp** — message → AI reply; photo → draft.
- **Admin console** — cloud/billing/pipelines tabs populate (GCP context + GitHub token) or show honest empty states.

**Pod-level checks:**
```powershell
kubectl get pods -A | findstr vertofi          # all Running
kubectl logs deploy/auth -n vertofi-identity   # look for "missing env" fail-fast messages
kubectl get externalsecret -A                  # SecretSynced = True for the shared set
```

---

# PART 8 — ROTATION, REVOCATION & INCIDENT RESPONSE

- **Rotate** by adding a new Secret Manager version and restarting consumers:
  ```powershell
  "NEW_VALUE" | gcloud secrets versions add vertofi-shared-OPENAI_API_KEY --data-file=- --project vertofi-prod-001
  kubectl rollout restart deployment --all -n vertofi-intelligence
  ```
- **JWT secret rotation** invalidates existing sessions (everyone re-logs in) — do it during a maintenance window; rotate access + refresh together.
- **Razorpay/GST/AA/WhatsApp**: revoke the old key in the provider dashboard after the new one is live.
- **If a key leaks** (log/screenshot/chat): revoke at the provider immediately, add a new version, restart, and rotate `APP_FIELD_KEY` only if it was the leaked one (note: rotating `APP_FIELD_KEY` requires re-encrypting existing encrypted columns — plan carefully).
- **Disable break-glass** (`OTP_BYPASS_ENABLED=0`) as the first hardening step once real OTP works.
- Keep an **owner + expiry** note per key (a simple table in your password manager) so nothing silently expires (OpenAI project keys, Meta tokens, GSP creds especially).

---

# PART 9 — FAQ & TROUBLESHOOTING

**Q: I set a secret but the service still says it's missing.**
ESO hasn't synced yet, or the pod wasn't restarted. Check `kubectl get externalsecret -A` (SecretSynced=True) and `kubectl rollout restart deployment/<svc> -n <ns>`.

**Q: Browser shows CORS error.**
The origin isn't in `CORS_ORIGINS`. Add it, re-run `sync-secrets`, restart api-gateway.

**Q: Login OTP never arrives.**
Neither SMTP nor MSG91 is configured/working. For email: check DKIM/SPF and that the app password is correct. For SMS: DLT template/sender must be approved. As a stopgap, enable break-glass.

**Q: Razorpay webhook isn't updating billing.**
The webhook URL must be `https://api.vertofi.com/api/v1/billing/webhook/razorpay` (public path), and `RAZORPAY_WEBHOOK_SECRET` must match exactly what you set in the Razorpay dashboard.

**Q: Documents always go to "review".**
`GOOGLE_VISION_KEY` is blank and Workload Identity isn't granted the Vision role. Configure one path (3.2).

**Q: Can I run with no AI key?**
Yes — categorization falls back to deterministic rules and AI-draft is unavailable; the platform still works. Add `OPENAI_API_KEY` to enable the AI features.

**Q: Where do `NEXT_PUBLIC_*` go — Secret Manager or Vercel?**
Vercel (target C). They are public, build-time values. Never put a real secret behind a `NEXT_PUBLIC_` name.

**Q: Local dev minimal set?**
docker infra (`pnpm infra:up`) gives you DB/Redis/Kafka/MinIO; then JWT secrets + `OTP_BYPASS` is enough to log in. Add provider keys per feature you're testing.

---

## Appendix A — One-glance "fill these in `.env.production`" block
```
# CORE (required)
DATABASE_URL=        DB_SSL=true        REDIS_URL=
KAFKA_BROKERS=       KAFKA_CLIENT_ID=vertofi   KAFKA_SSL=true
KAFKA_SASL_MECHANISM=plain   KAFKA_SASL_USERNAME=   KAFKA_SASL_PASSWORD=
S3_ENDPOINT=https://storage.googleapis.com  S3_FORCE_PATH_STYLE=true  S3_REGION=asia-south1
S3_BUCKET=  S3_ACCESS_KEY=  S3_SECRET_KEY=
JWT_ACCESS_SECRET=  JWT_REFRESH_SECRET=  JWT_ACCESS_TTL=900  JWT_REFRESH_TTL=2592000
APP_FIELD_KEY=
CORS_ORIGINS=https://vertofi.com,https://business.vertofi.com,https://associates.vertofi.com,https://accountants.vertofi.com,https://bhs.vertofi.com,https://legal.vertofi.com,https://admin.vertofi.com,https://teams.vertofi.com
RATE_LIMIT_PER_MIN=600
# LOGIN (pick at least one)
SMTP_HOST=  SMTP_PORT=587  SMTP_USER=  SMTP_PASS=  SMTP_FROM=no-reply@vertofi.com
MSG91_AUTH_KEY=  MSG91_SENDER_ID=VERTFI  MSG91_TEMPLATE_ID=
OTP_BYPASS_ENABLED=0  OTP_BYPASS_CODE=
# AI / OCR
OPENAI_API_KEY=  AI_USD_PER_1K_TOKENS=0.0006  GEMINI_API_KEY=  GOOGLE_VISION_KEY=
# PAYMENTS
RAZORPAY_KEY_ID=  RAZORPAY_KEY_SECRET=  RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_STARTER=  RAZORPAY_PLAN_GROWTH=  RAZORPAY_PLAN_PRO=
# MESSAGING / CONNECTORS (optional)
WHATSAPP_API_TOKEN=  WHATSAPP_PHONE_ID=  WHATSAPP_VERIFY_TOKEN=  WHATSAPP_APP_SECRET=
GST_GSP_BASE_URL=  GST_GSP_CLIENT_ID=  GST_GSP_CLIENT_SECRET=
AA_BASE_URL=  AA_CLIENT_ID=  AA_CLIENT_SECRET=
ZOHO_CLIENT_ID=  ZOHO_CLIENT_SECRET=  QBO_CLIENT_ID=  QBO_CLIENT_SECRET=  TALLY_CONNECTOR_URL=
PAYROLL_API_KEY=  CREDIT_BUREAU_API_KEY=  MCA_API_KEY=
# ADMIN / GCP CONTEXT
GITHUB_TOKEN=  GITHUB_REPO=  GOOGLE_CLOUD_PROJECT=  GCP_REGION=asia-south1  GCP_BILLING_ACCOUNT_ID=
```

## Appendix B — Provider quick-link index
| Provider | Sign-up / console |
|----------|-------------------|
| GCP Console | https://console.cloud.google.com |
| OpenAI | https://platform.openai.com/api-keys |
| Google AI Studio (Gemini) | https://aistudio.google.com/app/apikey |
| Cloud Vision pricing | https://cloud.google.com/vision/pricing |
| MSG91 | https://msg91.com · https://control.msg91.com |
| SendGrid | https://signup.sendgrid.com |
| Brevo | https://app.brevo.com |
| Mailgun | https://signup.mailgun.com |
| Google App Passwords | https://myaccount.google.com/apppasswords |
| Meta for Developers | https://developers.facebook.com |
| Meta Business Manager | https://business.facebook.com |
| Razorpay | https://dashboard.razorpay.com |
| Masters India (GSP) | https://www.mastersindia.co/gst-api/ |
| Setu (Account Aggregator) | https://setu.co/data/account-aggregator |
| Zoho API Console (IN) | https://api-console.zoho.in |
| Intuit Developer (QBO) | https://developer.intuit.com |
| Confluent Cloud | https://confluent.cloud |
| Vercel | https://vercel.com |

---

_End of guide. Keep this file private-internal (it documents your credential layout, though not the values). Update it whenever a new connector or variable is added to `.env.example` / `.env.production.example`._
