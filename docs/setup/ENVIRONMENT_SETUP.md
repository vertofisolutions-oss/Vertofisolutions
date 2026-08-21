# Vertofi — Environment Setup

Every environment variable Vertofi reads, where it comes from, and how to verify it.

**How config flows in production:** values live in **GCP Secret Manager** as
`vertofi-shared-<KEY>`. The **External Secrets Operator** projects the whole set
into each pod (one shared set for all services). Frontend (`NEXT_PUBLIC_*`) vars
are set in **Vercel** project settings, not here.

## Setting / updating a secret (production)

```bash
PROJECT=vertofi-prod-001
KEY=SMTP_USER            # example
VALUE='no-reply@vertofi.com'

# create-or-update (byte-exact, no trailing newline)
gcloud secrets create vertofi-shared-$KEY --replication-policy=automatic --project $PROJECT 2>/dev/null
printf '%s' "$VALUE" | gcloud secrets versions add vertofi-shared-$KEY --data-file=- --project $PROJECT

# push to a service now (or wait up to 1h for the auto-sync), then restart it
kubectl annotate externalsecret auth-secrets -n vertofi-identity force-sync="$(date +%s)" --overwrite
kubectl rollout restart deployment/auth -n vertofi-identity
```

> Windows/PowerShell: use `infra/gke/sync-secrets.ps1` (writes a byte-exact temp
> file — do **not** pipe a string into `gcloud --data-file=-`, it appends a CRLF).

## Verify integration status (no secrets exposed)

```bash
kubectl port-forward -n vertofi-gateway svc/api-gateway 8088:4000 &
curl -s localhost:8088/health/integrations | jq .
# or per service: kubectl port-forward -n vertofi-identity svc/auth 8089:4001 ; curl localhost:8089/health/integrations
```

---

## Variable reference

Required = platform/feature won't work without it. Optional = feature degrades to an empty/NEEDS_CONFIGURATION state.

### Core infrastructure (Required)
| Variable | Description | Example | Provider | Req | Verify |
|---|---|---|---|---|---|
| `DATABASE_URL` | Postgres DSN | `postgresql://u:p@host:5432/vertofi` | Cloud SQL | ✅ | `GET /ready` → `db:ok` |
| `DB_SSL` | TLS to DB | `true` | Cloud SQL | ✅ | pod logs no SSL error |
| `REDIS_URL` | Redis DSN | `redis://host:6379` | Memorystore | ✅ | admin-console AI usage tab |
| `KAFKA_BROKERS` | Bootstrap servers | `pkc-xxx.confluent.cloud:9092` | Confluent | ✅ | consumers not crash-looping |
| `KAFKA_SASL_USERNAME/PASSWORD` | Confluent API key/secret | — | Confluent | ✅* | event flow works |
| `S3_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET` | GCS S3-compatible storage + HMAC | `https://storage.googleapis.com` | GCS | ✅ | document presign upload |
| `APP_FIELD_KEY` | pgcrypto field-encryption key | — | self | ✅ | admin DB browser decrypt |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing (≥16 chars) | random 48-char | self | ✅ | pod boots (fail-fast guard) |

\* required only when using Confluent (prod).

### Authentication delivery
| Variable | Description | Example | Provider | Req | Verify |
|---|---|---|---|---|---|
| `SMTP_HOST` | SMTP relay host | `smtp.gmail.com` | Google Workspace | ✅ (email) | `/health/integrations` smtp=configured |
| `SMTP_PORT` | 587 STARTTLS / 465 TLS | `587` | — | ✅ | — |
| `SMTP_USER` | Mailbox login | `no-reply@vertofi.com` | Google Workspace | ✅ | send test OTP email |
| `SMTP_PASS` | App password (16 char) | — | Google Workspace | ✅ | send test OTP email |
| `SMTP_FROM` | From address | `no-reply@vertofi.com` | — | ✅ | — |
| `MSG91_AUTH_KEY` | MSG91 auth key | — | MSG91 | ✅ (sms) | `/health/integrations` sms=configured |
| `MSG91_SENDER_ID` | DLT sender id | `VERTFI` | MSG91 | ✅ | — |
| `MSG91_TEMPLATE_ID` | DLT OTP template | — | MSG91 | ✅ | receive test SMS |
| `OTP_BYPASS_ENABLED` / `OTP_BYPASS_CODE` | **Temporary** break-glass login | `0` / 6 digits | self | ⛔ remove at launch | login with code |

### Communications / Payments / Financial / Intelligence
| Variable | Description | Provider | Req |
|---|---|---|---|
| `WHATSAPP_API_TOKEN` / `WHATSAPP_PHONE_ID` / `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_APP_SECRET` | WhatsApp Cloud API + webhook verify/signature | Meta | optional |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Payments + webhook HMAC | Razorpay | optional* |
| `RAZORPAY_PLAN_STARTER/GROWTH/PRO` | Subscription plan ids | Razorpay | optional* |
| `GST_GSP_BASE_URL` / `GST_GSP_CLIENT_ID` / `GST_GSP_CLIENT_SECRET` | GSP for GSTIN verify / e-invoice / e-way | Masters India | optional |
| `AA_BASE_URL` / `AA_CLIENT_ID` / `AA_CLIENT_SECRET` | Account Aggregator (bank data) | Setu | optional |
| `OPENAI_API_KEY` | Primary LLM | OpenAI | optional |
| `GEMINI_API_KEY` | Secondary LLM | Google AI | optional |
| `GOOGLE_VISION_KEY` | OCR | Google Cloud | optional |
| `TALLY_CONNECTOR_URL` / `ZOHO_*` / `QBO_*` | Accounting sync targets | Tally/Zoho/Intuit | optional |
| `PAYROLL_API_KEY` / `CREDIT_BUREAU_API_KEY` / `MCA_API_KEY` | Verification connectors | various | optional |

\* without Razorpay the app stays in trial-only mode (no autopay).

### Frontend (set in Vercel, not Secret Manager)
| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Gateway base URL | `https://api.vertofi.com/api/v1` |
| `NEXT_PUBLIC_BUSINESS_URL` / `NEXT_PUBLIC_PANEL_BASE` | Cross-app links | `https://app.vertofi.com` |
| `NEXT_PUBLIC_GRAFANA_URL` | Admin Observability iframe | optional |

See **docs/PROVIDER_ONBOARDING.md** for step-by-step credential acquisition.
