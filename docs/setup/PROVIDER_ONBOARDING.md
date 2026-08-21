# Vertofi — Provider Onboarding

Step-by-step to obtain and install each external credential. After setting any
secret, push it and roll the affected service (see the command block at the end).

**Canonical webhook/callback URLs** (already live via the gateway — give these to providers):
| Provider | Callback URL |
|---|---|
| Meta WhatsApp | `https://api.vertofi.com/api/webhooks/whatsapp` |
| Razorpay | `https://api.vertofi.com/api/webhooks/razorpay` |
| GST / GSP | `https://api.vertofi.com/api/webhooks/gst` |
| Banking / AA | `https://api.vertofi.com/api/webhooks/banking` |

> These resolve once `api.vertofi.com` DNS + TLS are live. Until then use the GKE
> ingress IP `http://8.233.130.121/api/webhooks/...` for provider sandbox tests.

---

## Batch 1 — Google Workspace (Email / SMTP) — unblocks login
1. In Google Workspace Admin, ensure a mailbox exists for `no-reply@vertofi.com` (or use a real user).
2. Enable 2-Step Verification on that account → **App passwords** → generate one for "Mail". Copy the 16-char password.
3. Install:
   ```bash
   printf '%s' 'no-reply@vertofi.com' | gcloud secrets versions add vertofi-shared-SMTP_USER --data-file=- --project vertofi-prod-001
   printf '%s' 'xxxxxxxxxxxxxxxx'     | gcloud secrets versions add vertofi-shared-SMTP_PASS --data-file=- --project vertofi-prod-001
   ```
4. Sync + restart auth (block below), confirm `/health/integrations` shows `smtp: configured`, then **disable the break-glass**:
   ```bash
   printf '%s' '0' | gcloud secrets versions add vertofi-shared-OTP_BYPASS_ENABLED --data-file=- --project vertofi-prod-001
   ```

## Batch 2 — Meta WhatsApp Business
1. developers.facebook.com → create/Use the Business app → add **WhatsApp** product.
2. Get **Permanent access token** (System User) → `WHATSAPP_API_TOKEN`; **Phone number ID** → `WHATSAPP_PHONE_ID`; App **App Secret** (Settings → Basic) → `WHATSAPP_APP_SECRET`.
3. Choose any string for `WHATSAPP_VERIFY_TOKEN` (e.g. a random 24-char).
4. In WhatsApp → Configuration → Webhook: Callback URL = `https://api.vertofi.com/api/webhooks/whatsapp`, Verify token = the value above; subscribe to `messages`.
5. Install all four `vertofi-shared-WHATSAPP_*` secrets, then roll `whatsapp`.

## Batch 3 — GST (Masters India GSP)
1. Sign up at mastersindia.co (GSP/ASP) → get sandbox `client_id` / `client_secret` and the API base URL.
2. Set `GST_GSP_BASE_URL`, `GST_GSP_CLIENT_ID`, `GST_GSP_CLIENT_SECRET`; roll `gst-connector`.
3. Verify: `POST /api/v1/gst/verify-vendor {"gstin":"<15-char>"}` returns a live result (not `NEEDS_CREDENTIALS`).

## Batch 4 — Banking (Setu Account Aggregator)
1. bridge.setu.co → onboard for **Account Aggregator (FIU)** → get `client_id` / `client_secret` and base URL.
2. Set `AA_BASE_URL`, `AA_CLIENT_ID`, `AA_CLIENT_SECRET`; roll `bank-connector`.
3. Setu consent/data callbacks → `https://api.vertofi.com/api/webhooks/banking`.

## Batch 5 — Payments (Razorpay)
1. dashboard.razorpay.com → API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
2. Create 3 subscription **Plans** (Starter/Growth/Pro) → copy plan ids into `RAZORPAY_PLAN_*`.
3. Settings → Webhooks: URL `https://api.vertofi.com/api/webhooks/razorpay`, secret → `RAZORPAY_WEBHOOK_SECRET`; subscribe `subscription.*`, `payment.*`.
4. Set all secrets; roll `billing`.

## Batch 6 — SMS (MSG91)
1. msg91.com → get `MSG91_AUTH_KEY`.
2. Register a DLT **sender id** (`VERTFI`) and an **OTP template** → `MSG91_TEMPLATE_ID`. (Optional per-purpose templates: `MSG91_TEMPLATE_ID_LOGIN` etc.)
3. Set secrets; roll `auth`. Verify `/health/integrations` → `sms: configured`.

## AI — OpenAI / Gemini
- OpenAI: platform.openai.com → API key → `OPENAI_API_KEY`; roll `ai-gateway`.
- Gemini (optional): aistudio.google.com → API key → `GEMINI_API_KEY`.

## OCR — Google Cloud Vision
- Enable Vision API on `vertofi-prod-001`, create an API key → `GOOGLE_VISION_KEY`; roll `ocr`. (Or grant the runtime SA `roles/visionai.user` and use Workload Identity.)

---

## Apply-and-roll helper
```bash
PROJECT=vertofi-prod-001
# after setting secrets, push to ALL services + restart the relevant ones:
for ns in vertofi-identity vertofi-gateway vertofi-commerce vertofi-connectors \
          vertofi-documents vertofi-engagement vertofi-intelligence vertofi-workflow vertofi-accounting; do
  for es in $(kubectl get externalsecret -n $ns -o name 2>/dev/null); do
    kubectl annotate $es -n $ns force-sync="$(date +%s)" --overwrite >/dev/null
  done
done
# restart a specific service after its credential lands, e.g.:
kubectl rollout restart deployment/auth -n vertofi-identity
```

| Service | Namespace |
|---|---|
| auth, access, tenant | vertofi-identity |
| api-gateway | vertofi-gateway |
| billing, admin-console, audit | vertofi-commerce |
| bank-connector, gst-connector, vendor, verification-connectors | vertofi-connectors |
| document, ocr | vertofi-documents |
| reporting, whatsapp, notification | vertofi-engagement |
| ai-gateway, categorization, bhs-*, prediction, vbd, benchmarks | vertofi-intelligence |
| onboarding, lifeguard, legal-cases, warranty, exception-workflow | vertofi-workflow |
| accounting, accounting-ledger, accounting-sync, reconciliation | vertofi-accounting |
