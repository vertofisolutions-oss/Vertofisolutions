# Vertofi — Production Readiness

_Audit date: 2026-06-06 · Cluster `vertofi-production` (GKE Autopilot, asia-south1) · Project `vertofi-prod-001`_

The platform is **deployed on GCP** (GKE + 4 Vercel frontends) and starts
gracefully with integrations disabled — missing credentials disable only the
related feature. The remaining work is **credentials, DNS/TLS, provider
approvals, and cluster capacity** (see §0), all itemized below.

## 0. Cluster capacity (infrastructure blocker)
The cluster runs **2× `ek-standard-8` nodes, each capped at 32 pods** (CPU/memory
are <20% used — the limit is pod **count**, not resources). At 64/64 pods the
cluster could only host **18 of 32 services**; the other 14 were scaled to `0`.
On 2026-06-06 those 14 were scaled back to 1 replica, which requires Autopilot to
provision additional node(s). **Action:** ensure the node pool can grow to
≥3–4 nodes (or use higher pod-density nodes) so the full fleet runs concurrently.
The 18 always-on services include the critical path (gateway, auth, tenant,
accounting, document, onboarding, reporting, whatsapp, ai-gateway).

---

## 1. Service inventory (35 services)

| Service | Port | Namespace | Type | Status |
|---|---|---|---|---|
| api-gateway | 4000 | vertofi-gateway | Express | ✅ Running |
| auth | 4001 | vertofi-identity | Nest | ✅ Running (security-hardened, redeployed) |
| tenant | 4002 | vertofi-identity | Nest | ✅ Running |
| access | 4003 | vertofi-identity | Nest | ✅ Running |
| audit | 4004 | vertofi-commerce | Nest | ✅ Running |
| onboarding | 4005 | vertofi-workflow | Nest | ✅ Running |
| document | 4006 | vertofi-documents | Nest | ✅ Running |
| billing | 4007 | vertofi-commerce | Nest | ✅ Running (Razorpay unconfigured → trial-only) |
| ocr | 4008 | vertofi-documents | Python | ✅ Running (Vision unconfigured → review) |
| notification | 4009 | vertofi-engagement | Nest | ✅ Running |
| ai-gateway | 4010 | vertofi-intelligence | Python | ✅ Running (OpenAI unconfigured → degraded) |
| accounting-ledger | 4011 | vertofi-accounting | Nest | ✅ Running |
| categorization | 4012 | vertofi-intelligence | Python | ✅ Running |
| reconciliation | 4013 | vertofi-accounting | Nest | ✅ Running |
| exception-workflow | 4014 | vertofi-workflow | Nest | ✅ Running |
| bank-connector | 4015 | vertofi-connectors | Nest | ✅ Running (AA unconfigured) |
| gst-connector | 4016 | vertofi-connectors | Nest | ✅ Running (GSP unconfigured → offline validation) |
| accounting-sync | 4017 | vertofi-accounting | Nest | ✅ Running |
| whatsapp | 4018 | vertofi-engagement | Express | ✅ Running (Meta unconfigured) |
| bhs-engine | 4019 | vertofi-intelligence | Nest | ✅ Running |
| reporting | 4020 | vertofi-engagement | Nest | ✅ Running |
| prediction | 4021 | vertofi-intelligence | Nest | ✅ Running |
| lifeguard | 4022 | vertofi-workflow | Nest | ✅ Running |
| vendor | 4023 | vertofi-connectors | Nest | ✅ Running |
| vbd | 4024 | vertofi-intelligence | Nest | ✅ Running |
| legal-cases | 4025 | vertofi-workflow | Nest | ✅ Running |
| bhs-intelligence | 4026 | vertofi-intelligence | Nest | ✅ Running |
| benchmarks | 4027 | vertofi-intelligence | Nest | ✅ Running |
| warranty | 4028 | vertofi-workflow | Nest | ✅ Running |
| verification-connectors | 4029 | vertofi-connectors | Nest | ✅ Running |
| admin-console | 4030 | vertofi-commerce | Nest | ✅ Running |
| accounting | 4031 | vertofi-accounting | Nest | ✅ Running |
| **Frontends (Vercel)** | | | Next | web-landing, web-business (app.vertofi.com), web-panels, web-admin (admin.vertofi.com) |

## 2. Deployment inventory
- **Compute:** GKE Autopilot, 9 `vertofi-*` namespaces. Kafka = self-hosted Redpanda (`vertofi-messaging`).
- **Managed:** Cloud SQL (Postgres 16), Memorystore (Redis), GCS (documents), Confluent-compatible Kafka via env.
- **Secrets:** GCP Secret Manager `vertofi-shared-*` → External Secrets Operator → `<svc>-secrets` (hourly sync).
- **Images:** Artifact Registry `asia-south1-docker.pkg.dev/vertofi-prod-001/vertofi/<svc>`. CI = GitHub Actions on push to `main` (Vertofi-platform repo). **Builds were broken (no repo secrets) — fixed 2026-06-06.**
- **Ingress:** `api.vertofi.com` → GKE Ingress `8.233.130.121` (**HTTP only — TLS cert pending**).
- **Frontends:** Vercel, custom domains configured, DNS pending.

## 3. Configuration status (live `/health/integrations`)
| Integration | Status |
|---|---|
| database, redis, kafka, storage, jwt | ✅ configured |
| smtp | ⚠️ partial — host/port/from set, **SMTP_USER/PASS placeholder** |
| sms (MSG91) | ⚠️ partial — sender set, **AUTH_KEY/TEMPLATE placeholder** |
| whatsapp, razorpay, gst, banking, openai, gemini, ocr_vision, accounting_sync | ❌ needs_configuration (no secrets yet) |

## 4. Master checklist
### ✅ Ready
- All 35 services deployed, healthy, reachable through the gateway.
- Auth/JWT, RBAC, RLS, sessions, refresh rotation.
- Core data plane: Postgres, Redis, Kafka/Redpanda, GCS.
- `/health`, `/ready`, `/health/integrations` on every service (rolling out via CI).
- Normalized webhook callback URLs (`/api/webhooks/{whatsapp,razorpay,gst,banking}`).
- Login flow (send→verify→tokens) — verified end-to-end.

### 🟡 Blocked (needs credential)
- Email (SMTP_USER/PASS), SMS (MSG91), WhatsApp, Razorpay, GST, Banking, OpenAI, Gemini, OCR Vision.

### 🟠 Missing infrastructure
- `api.vertofi.com` TLS certificate (Google-managed cert / ManagedCertificate).
- DNS records (Route 53 → Vercel + GKE ingress) — in progress.

### 🔴 Code defect (all FIXED 2026-06-06)
- ~~Hardcoded `123456` OTP backdoor~~ → removed.
- ~~Connectors silently "succeed" + log OTP in prod~~ → guards restored.
- ~~Returning-user login impossible (unbound challenge)~~ → fixed.
- ~~JWT public-secret fallback~~ → fail-fast.
- ~~Secret CRLF corruption defeating placeholder checks~~ → vault trims + sync script fixed.
- ~~CI image build broken (no repo secrets)~~ → CI service account + repo secrets configured.

---

## Working today
Full backend + frontend deployed and reachable. Users can register and log in
(via the temporary break-glass while email is unconfigured), reach dashboards,
and use all features that don't require an external provider.

## Requires credential from founder
Batched in `docs/PROVIDER_ONBOARDING.md`: **Batch 1** Google Workspace SMTP,
**Batch 2** WhatsApp, **Batch 3** GST (Masters India), **Batch 4** Banking (Setu),
**Batch 5** Razorpay, **Batch 6** MSG91, plus OpenAI/Gemini/Vision keys.

## Requires DNS
- `api.vertofi.com` → `8.233.130.121` (A)
- `app.vertofi.com`, `vertofi.com`, `panels…`, `admin…` → Vercel (`cname.vercel-dns.com` / `76.76.21.21`)

## Requires vendor approval
- **WhatsApp**: Meta business verification + display-name approval.
- **MSG91 / SMS**: TRAI-DLT sender id + template approval.
- **GST GSP**: Masters India production access.
- **Setu AA**: FIU onboarding approval.

## Requires code work
None blocking launch. Post-launch hardening: per-service connector-level
`/health/integrations` (currently env-based), WhatsApp `x-hub-signature-256`
verification, full-fleet rollout of the new shared health endpoint.

## Launch blockers (must clear before public launch)
1. **Email delivery** (Batch 1) — required to remove the break-glass login.
2. **DNS + TLS** for `api.vertofi.com` and `app.vertofi.com`.
3. **Disable break-glass** (`OTP_BYPASS_ENABLED=0`) once email works.
