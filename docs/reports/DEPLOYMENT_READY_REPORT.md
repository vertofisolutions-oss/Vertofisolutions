# Vertofi — Deployment Ready Report

_2026-06-06 · Generated from live cluster + repo audit. See `PRODUCTION_READINESS.md`
for the full inventory and `docs/PROVIDER_ONBOARDING.md` for credential steps._

## Summary
Vertofi is **deployed and operational on GCP** (35 backend services on GKE,
4 frontends on Vercel). Architecture unchanged. The platform runs with all
external integrations disabled and degrades honestly; nothing crashes on missing
credentials. Remaining items are credentials, DNS/TLS, and vendor approvals.

---

> **Cluster capacity note:** the 2-node cluster (ek-standard-8, 32 pods/node) is
> pod-count saturated at 64/64, so only **18 of 32 services run concurrently**;
> the other 14 were scaled to 0. They were scaled back up on 2026-06-06 pending
> Autopilot node provisioning. Grow the node pool to ≥3–4 nodes to run the full
> fleet. See PRODUCTION_READINESS.md §0.

## Services operational (today — the 18 always-on)
Reachable via the API gateway; login verified end-to-end. Fully functional
without external providers:
- Identity & access (auth, tenant, access), gateway, audit
- Onboarding, documents (GCS upload), accounting + ledger + reconciliation
- BHS engine/intelligence, reporting, prediction, benchmarks, vendor, vbd
- Lifeguard, legal-cases, warranty, exception-workflow, admin-console
- Event pipeline (Redpanda/Kafka), notification (in-app)

## Services waiting for credentials (feature-disabled, not down)
| Service | Needs | Batch |
|---|---|---|
| auth (email OTP) | `SMTP_USER`, `SMTP_PASS` | 1 |
| auth (SMS OTP) | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | 6 |
| whatsapp | `WHATSAPP_API_TOKEN/PHONE_ID/VERIFY_TOKEN/APP_SECRET` | 2 |
| billing | `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`, `RAZORPAY_PLAN_*` | 5 |
| gst-connector | `GST_GSP_BASE_URL/CLIENT_ID/CLIENT_SECRET` | 3 |
| bank-connector | `AA_BASE_URL/CLIENT_ID/CLIENT_SECRET` | 4 |
| ai-gateway | `OPENAI_API_KEY` (opt `GEMINI_API_KEY`) | AI |
| ocr | `GOOGLE_VISION_KEY` | OCR |
| accounting-sync | `TALLY_CONNECTOR_URL` / `ZOHO_*` / `QBO_*` | opt |

## Services waiting for provider approval
- WhatsApp (Meta business + display-name), MSG91 (TRAI-DLT template), GST GSP
  (Masters India prod), Setu AA (FIU onboarding). Razorpay needs KYC activation
  for live keys (test keys work immediately).

## Services waiting for DNS
- `api.vertofi.com` → A `8.233.130.121` (+ Google-managed TLS cert).
- `app.vertofi.com` / `vertofi.com` / panels / admin → Vercel.
- Until DNS/TLS: use the GKE ingress IP and Vercel `*.vercel.app` URLs.

## Launch blockers
1. Email delivery (Batch 1) — to retire the temporary break-glass login.
2. `api.vertofi.com` + `app.vertofi.com` DNS & TLS.
3. Set `OTP_BYPASS_ENABLED=0` once email is verified.

## Post-launch tasks
- Roll the new shared `/health/integrations` + webhook receivers to all services
  (auth/gateway/gst/bank/whatsapp + Python done first; rest on next deploy).
- WhatsApp inbound `x-hub-signature-256` verification.
- Re-enable NetworkPolicy with proper intra-namespace rules (disabled at launch).
- Wire real GSP/AA webhook processing behind the now-live callback URLs.
- Depth gaps (separate track): WhatsApp `wa_user→org`, stateful bank/GST, recon override.

## What changed today (no new features / no rearchitecture)
- Removed critical auth backdoor; restored prod OTP-delivery guards; fixed
  returning-user login; JWT fail-fast; secret CRLF trim; templated OTP.
- Fixed broken CI (created CI service account + repo secrets); images build again.
- Added `/health/integrations` everywhere + normalized `/api/webhooks/*`.
- Generated `.env.example`, `.env.production.example`, `docs/ENVIRONMENT_SETUP.md`,
  `docs/PROVIDER_ONBOARDING.md`, `PRODUCTION_READINESS.md`, this report.
