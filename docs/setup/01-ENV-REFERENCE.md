# 01 — Environment Variable Reference

Every key in `.env`, what it does, which service uses it, and how to fill it.
**Blank connector keys are safe** — that connector reports NEEDS_CREDENTIALS and
the UI shows an empty state (never fake data).

Legend: 🟢 works out-of-the-box locally · 🔑 needs a credential you obtain · 🏭 production-only.

## Core runtime
| Key | Used by | Local value | Notes |
|-----|---------|-------------|-------|
| `NODE_ENV` | all | `development` | `production` in prod |
| `DATABASE_URL` | all DB services | `postgresql://vertofi:vertofi@localhost:5432/vertofi` 🟢 | Aurora writer DSN in prod |
| `DATABASE_URL_RO` | reporting/admin | blank | optional read-replica DSN (load balancing) |
| `DB_SSL` | DB services | `false` | `true` in prod (Aurora TLS) |
| `REDIS_URL` | ai-gateway, admin-console, gateway rate-limit | `redis://localhost:6379` 🟢 | ElastiCache URL in prod |
| `KAFKA_BROKERS` | event producers/consumers | `localhost:19092` 🟢 | MSK brokers in prod |
| `KAFKA_CLIENT_ID` | events | `vertofi` | — |

## Object storage (S3 / MinIO)
| Key | Local value | Notes |
|-----|-------------|-------|
| `S3_ENDPOINT` | `http://localhost:9000` 🟢 | remove/point to AWS S3 in prod |
| `S3_REGION` | `ap-south-1` | India |
| `S3_BUCKET` | `vertofi-documents` | create bucket in prod |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | `vertofi` / `vertofi-secret` 🟢 | IAM creds in prod (or IRSA) |
| `S3_FORCE_PATH_STYLE` | `true` (MinIO) | `false` for AWS S3 |

## Search
| `OPENSEARCH_URL` | `http://localhost:9200` 🟢 | OpenSearch domain in prod |

## Auth / JWT
| Key | Local | Notes |
|-----|-------|-------|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | dev placeholders 🟢 | 🏭 **generate strong random secrets** (e.g. `openssl rand -base64 48`) and store in Secrets Manager |
| `JWT_ACCESS_TTL` | `900` (15 min) | — |
| `JWT_REFRESH_TTL` | `2592000` (30 days) | — |

## Service ports (4000–4030)
`GATEWAY_PORT=4000`, `AUTH_PORT=4001`, … `ADMIN_CONSOLE_PORT=4030`. Defaults work
locally; in Kubernetes the Service/Ingress maps these. `AI_GATEWAY_URL` points
callers (categorization, vbd, whatsapp, legal) at the AI gateway.

## CORS & frontend URLs
| Key | Local | Notes |
|-----|-------|-------|
| `CORS_ORIGINS` | `http://localhost:3000..3003` 🟢 | 🏭 set to your real domains (comma-separated) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | gateway base for browsers |
| `NEXT_PUBLIC_BUSINESS_URL` | `http://localhost:3001` | landing links to business app |
| `NEXT_PUBLIC_PANEL_BASE` | `http://localhost:3002` | landing links to panels |
| `NEXT_PUBLIC_GRAFANA_URL` | blank | 🔑 embed Grafana in admin Observability tab |

## Admin console extras
| Key | Notes |
|-----|-------|
| `AI_USD_PER_1K_TOKENS` | `0.0006` — rate to convert **real** metered tokens → cost estimate |
| `GITHUB_TOKEN` / `GITHUB_REPO` | 🔑 show GitHub Actions runs in Pipelines tab (Document 03) |
| `APP_FIELD_KEY` | 🔑🏭 pgcrypto key for field-level encryption (store in vault, never commit) |

## External connectors (each → Document 03)
| Key(s) | Connector | Feature it unlocks |
|--------|-----------|--------------------|
| `OPENAI_API_KEY` | AI gateway | all AI features (BHS insights, categorization, VBD, WhatsApp answers) |
| `MSG91_AUTH_KEY`, `MSG91_SENDER_ID` | SMS | mobile OTP delivery (else logged in dev) |
| `AWS_SES_FROM`, `AWS_SES_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | email | email OTP / notifications |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | payments | subscriptions, after-payment gate (Document 04) |
| `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | WhatsApp | WhatsApp CFO |
| `GST_GSP_BASE_URL`, `GST_GSP_CLIENT_ID`, `GST_GSP_CLIENT_SECRET` | GST GSP | GST verify, returns |
| `AA_BASE_URL`, `AA_CLIENT_ID`, `AA_CLIENT_SECRET` | Account Aggregator | bank data sync |
| `GOOGLE_VISION_KEY` **or** `AWS_ACCESS_KEY_ID` (+Textract) | OCR | invoice/receipt extraction |
| `AWS_TEXTRACT_REGION` | OCR (Textract) | `ap-south-1` |
| `TALLY_CONNECTOR_URL` | accounting-sync | push to Tally |
| `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` | accounting-sync | push to Zoho Books |
| `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET` | accounting-sync | push to QuickBooks |
| `PAYROLL_API_KEY` | verification | payroll analytics |
| `CREDIT_BUREAU_API_KEY` | verification | credit/debt risk |
| `MCA_API_KEY` | verification | company/director verification |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | admin AWS Health / Cost Explorer | AWS status + cloud billing tabs |

## Where env values live
- **Local:** your `.env` (gitignored).
- **Production:** **AWS Secrets Manager** (or Vault), injected into pods by the
  External Secrets Operator — never in container images or git. `NEXT_PUBLIC_*`
  values are build-time public and may live in deployment config.

## Minimum keys to demo each capability
- **Sign-in by real SMS:** MSG91.
- **Any AI feature:** OPENAI_API_KEY.
- **Take a payment:** Razorpay trio.
- **Extract a document:** Google Vision **or** AWS Textract.
- Everything else degrades gracefully until its keys are added.
