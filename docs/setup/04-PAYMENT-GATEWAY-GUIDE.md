# 04 — Payment Gateway Guide (Razorpay)

How payments work in Vertofi, end to end — setup, the money flow, the
"after-payment-only" gate, plan limits, trials, webhooks and refunds. Implemented
by the **billing** service (`services/billing`, port 4007).

---

## 1. Why Razorpay
Razorpay is the primary gateway (India): UPI, cards, net-banking, subscriptions,
and webhooks. Cashfree/PayU can be added as alternates via the same connector
pattern.

## 2. One-time setup
1. **razorpay.com** → sign up → complete **KYC** (PAN, GST, bank account,
   business proof). Activation typically 1–3 days.
2. **Settings → API Keys** → **Generate Test Key** → copy **Key ID** + **Key
   Secret**.
3. **Settings → Webhooks → Add New Webhook**:
   - URL: `https://api.vertofi.com/api/v1/billing/webhook/razorpay`
   - Active events: **`payment.captured`** (add `payment.failed`, `refund.processed`
     later).
   - **Secret:** set a strong string → copy it.
4. Fill `.env` / Secrets Manager:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxx
   RAZORPAY_KEY_SECRET=xxx
   RAZORPAY_WEBHOOK_SECRET=xxx
   ```
5. After go-live, switch to **Live** keys and update the webhook to the live URL.

## 3. Plans & pricing (enforced in code)
| Plan | Monthly (excl. GST) | Key limits |
|------|--------------------|-----------|
| Starter | ₹1,499 | 2 users · 1,000 invoices · 100 OCR · 5GB · 1 bank · 200 AI calls |
| Growth | ₹3,999 | 10 users · 10,000 invoices · 2,000 OCR · 50GB · 10 banks · 5,000 AI |
| Pro | ₹8,999 | 50 users · unlimited invoices · 25,000 OCR · 500GB · unlimited banks · 50,000 AI |

Defined in `services/billing/src/plans.ts`; limits enforced atomically via
`usage_counters` and checked at the gateway + AI gateway.

## 4. The money flow (sequence)
```
Client app                Billing service            Razorpay
   │  POST /billing/checkout {orgId, plan}  │
   │ ─────────────────────────────────────► │
   │                                        │  create order (amount = plan price)
   │                                        │ ─────────────────────────► returns order_id
   │  ◄──── {orderId, amount, keyId} ───────│
   │  open Razorpay Checkout (keyId, orderId)│
   │ ─────────────────────────────────────────────────────────────────► user pays (UPI/card)
   │                                        │  ◄── webhook: payment.captured ──── Razorpay
   │                                        │  verify signature (HMAC-SHA256, webhook secret)
   │                                        │  record payment + set subscription = ACTIVE
   │                                        │  emit subscription.activated (→ tenant)
```
Code: `services/billing/src/billing.service.ts` (`checkout`, `activateFromPayment`)
and `billing.controller.ts` (`/checkout`, `/webhook/razorpay`).

## 5. The "after-payment-only" access gate
A business may use the app while its subscription is **TRIAL (not expired)** or
**ACTIVE**. The client checks `GET /billing/:orgId/access` → `{ active, plan,
status }`; if not active, the UI prompts to subscribe. The trial is started at
onboarding (`POST /billing/:orgId/trial`) for **7 days**.

## 6. Webhook security
The webhook handler verifies the `X-Razorpay-Signature` header with
**HMAC-SHA256** over the raw body using `RAZORPAY_WEBHOOK_SECRET`. Invalid
signatures are rejected. Handlers are **idempotent** (safe on Razorpay retries).
The `payment.captured` payload must include the `org_id` in `notes` so the
subscription can be matched.

## 7. Trials, upgrades, downgrades
- **Trial:** 7 days from onboarding; access ends if no paid plan is taken.
- **Upgrade:** takes effect immediately (prorate in the gateway dashboard).
- **Downgrade:** next renewal; new plan limits apply.

## 8. Refunds
Per the Refund & Cancellation Policy (`legal-docs/08`). Process a refund from the
Razorpay dashboard or via the Refunds API; subscriptions remain active until the
end of the paid term on cancellation.

## 9. Add-ons
₹/user, ₹/business, OCR packs, WhatsApp Automation Pro, AI Forecasting Pro, API
access — billed as separate line items (same gateway).

## 10. Testing
Use **Razorpay test mode** + test cards (e.g. card `4111 1111 1111 1111`, any
future expiry/CVV) and the **test UPI** flow. Trigger the webhook from the
dashboard's "Send test webhook" to verify activation locally (use a tunnel such
as ngrok to expose `localhost:4000`).

## 11. Go-live checklist
- [ ] KYC activated · Live keys set in Secrets Manager
- [ ] Live webhook URL + secret configured and verified
- [ ] GST added to invoices/line items
- [ ] Refund policy published (legal-docs/08)
- [ ] Reconciliation: Razorpay settlements vs `billing.payments`
