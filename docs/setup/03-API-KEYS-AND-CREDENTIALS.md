# 03 — API Keys & Credentials: How to Obtain Each

For every external integration: where to sign up, how to get the credential, and
exactly which `.env` keys to fill. Order roughly by "easiest / most useful first."
Anything blank → that feature shows an empty state; the app keeps running.

---

## A. OpenAI (all AI features) — `OPENAI_API_KEY`
1. Go to **platform.openai.com** → sign up / log in.
2. **Settings → Billing** → add a payment method (pay-as-you-go).
3. **API keys → Create new secret key** → copy it (shown once).
4. `.env`: `OPENAI_API_KEY=sk-...`
5. Apply for a higher **usage tier** as volume grows (raises rate limits). The AI
   gateway caches, retries, and meters cost automatically; the admin **AI & Cloud**
   tab shows real token usage.

## B. MSG91 (mobile OTP SMS, India) — `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`
1. Go to **msg91.com** → create an account; complete KYC (company + GST/PAN).
2. Register a **6-character Sender ID** and an **OTP template** (DLT-approved for
   India). Approval can take 1–2 days.
3. Dashboard → **API → Auth Key** → copy.
4. `.env`: `MSG91_AUTH_KEY=...`, `MSG91_SENDER_ID=VRTOFI`.
5. Failover: Twilio can be added similarly later. Until configured, dev OTPs are
   printed in the `auth` service logs.

## C. AWS SES (email OTP) — see Document 02 Step 5
`AWS_SES_FROM`, `AWS_SES_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

## D. Razorpay (payments) — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
Full flow in **Document 04**. Short version:
1. **razorpay.com** → sign up → complete **KYC** (PAN, GST, bank, business proof).
2. **Settings → API Keys → Generate** (Test keys first) → copy **Key ID** +
   **Key Secret**.
3. **Settings → Webhooks → Add** → URL `https://api.vertofi.com/api/v1/billing/webhook/razorpay`,
   event `payment.captured`, set a **secret** → copy it.
4. `.env`: `RAZORPAY_KEY_ID=rzp_test_...`, `RAZORPAY_KEY_SECRET=...`,
   `RAZORPAY_WEBHOOK_SECRET=...`. Switch to **Live** keys after activation.

## E. WhatsApp Business (WhatsApp CFO) — `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`
**Easiest via a BSP** (Interakt / Gupshup / AiSensy) — they handle Meta approval.
Direct (Meta Cloud API):
1. **developers.facebook.com** → create an app (type **Business**).
2. Add **WhatsApp** product → get a **test number** → note the **Phone number ID**
   and a temporary **access token**; generate a **permanent token** via a System
   User.
3. **Configure webhook**: callback `https://wa.vertofi.com/webhook/whatsapp`,
   verify token = a string you choose → put the same string in
   `WHATSAPP_VERIFY_TOKEN`. Subscribe to `messages`.
4. `.env`: `WHATSAPP_API_TOKEN=...`, `WHATSAPP_PHONE_ID=...`,
   `WHATSAPP_VERIFY_TOKEN=yourVerifyString`.
5. Submit your message templates for approval; verify your business with Meta.

## F. OCR — `GOOGLE_VISION_KEY` **or** AWS Textract
**Google Vision:**
1. **console.cloud.google.com** → create a project → enable **Cloud Vision API**.
2. **APIs & Services → Credentials → Create credentials → API key** → restrict to
   Vision API → copy.
3. `.env`: `GOOGLE_VISION_KEY=...`
**AWS Textract (alternative):** no extra key — uses your AWS app IAM keys +
`AWS_TEXTRACT_REGION=ap-south-1` (the policy in Document 02 grants Textract).

## G. GST GSP (GST verify, returns) — `GST_GSP_BASE_URL`, `GST_GSP_CLIENT_ID`, `GST_GSP_CLIENT_SECRET`
Regulated — requires partnership. Recommended provider: **Masters India** (or
ClearTax/Vayana).
1. Apply for **GSP/ASP partnership** on the provider site; submit company profile,
   use case, security/compliance details, and sign an NDA.
2. Receive **sandbox** credentials → later **production** after audit.
3. `.env`: `GST_GSP_BASE_URL=https://<provider-sandbox>`, `GST_GSP_CLIENT_ID=...`,
   `GST_GSP_CLIENT_SECRET=...`. Offline GSTIN structural validation works without
   this; filing-status/risk needs the GSP.

## H. Account Aggregator (bank data) — `AA_BASE_URL`, `AA_CLIENT_ID`, `AA_CLIENT_SECRET`
Regulated (RBI AA framework). Recommended: **Setu** (or Perfios/Finvu).
1. Register your company on the provider; submit GST, PAN, CIN, use case, privacy
   policy and security architecture; sign agreements.
2. Receive **sandbox** keys → production after approval.
3. `.env`: `AA_BASE_URL=...`, `AA_CLIENT_ID=...`, `AA_CLIENT_SECRET=...`.

## I. Accounting sync — Tally / Zoho / QuickBooks
- **Tally:** runs locally at the client; expose via the Tally XML/connector and
  set `TALLY_CONNECTOR_URL`.
- **Zoho Books:** **api-console.zoho.in** → create a **Server-based application**
  → get `ZOHO_CLIENT_ID` + `ZOHO_CLIENT_SECRET` (OAuth).
- **QuickBooks:** **developer.intuit.com** → create an app → `QBO_CLIENT_ID` +
  `QBO_CLIENT_SECRET`.

## J. Verification connectors
- **Payroll** (Keka/GreytHR/RazorpayX): register a developer/partner account →
  `PAYROLL_API_KEY`.
- **Credit bureau** (CIBIL/CRIF via an aggregator like Perfios/Decentro): apply
  with legal agreements → `CREDIT_BUREAU_API_KEY`.
- **MCA / KYC** (Karza/Signzy/Surepass): create a business account, buy credits →
  `MCA_API_KEY`.

## K. Admin console extras
- **GitHub Actions** (Pipelines tab): GitHub → **Settings → Developer settings →
  Personal access tokens (fine-grained)** → scope: repo **Actions: read** →
  `GITHUB_TOKEN`; `GITHUB_REPO=your-org/vertofi`.
- **Grafana** (Observability tab): deploy Grafana (kube-prometheus-stack) →
  `NEXT_PUBLIC_GRAFANA_URL=https://grafana.internal.vertofi/d/<uid>?kiosk`.
- **Field encryption key:** generate `openssl rand -base64 32` → store as
  `APP_FIELD_KEY` in Secrets Manager.

## Priority order for a usable launch
1. **MSG91** (real OTP login) → 2. **OpenAI** (AI features) → 3. **Razorpay**
(payments) → 4. **Google Vision / Textract** (document extraction) →
5. **AWS SES** (email) → then the regulated ones (GST GSP, Account Aggregator) as
partnerships complete.

## Security reminders
- Never commit keys. Local: `.env` (gitignored). Production: **AWS Secrets
  Manager**.
- Use **test/sandbox** keys until you go live; rotate keys periodically.
- Restrict each key (IP/scope) where the provider allows.
