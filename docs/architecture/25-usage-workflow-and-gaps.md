# 25 — Business Owner Usage Workflow & Engineering Gap Register

Status: living document. Written after the V4 platform integration audit + TASK-1
module build (commit `de02428`). This is the canonical "how a paying customer
actually uses Vertofi day to day" design, plus the honest flaw register an
industry-standard reviewer would file against the platform today.

---

## Part A — The designed usage workflow (onboarding → daily operations)

### Stage 0 — Discovery → Signup (Day 0, ~6 minutes)
1. Lands on vertofi.com → "Start free trial" → business.vertofi.com/register.
2. Accepts Terms & Privacy (versioned consent stored with IP/UA evidence —
   `legal.document_acceptances`).
3. Phone OTP via Firebase (manual "Send code" — the click is the reCAPTCHA
   gesture; never auto-send). User created as `PENDING_ONBOARDING`.
4. Business info → org created (`tenant.organizations`, Vertofi ID `VRT-XXXXXXXX`),
   token re-issued with `org_id`.
5. Risk profile + stage saves (`saveStage` before `saveRisk` — profile must exist).
6. Plan selection → Razorpay subscription (7-day trial, card e-mandate or UPI
   AutoPay). Account activates only after the mandate; gateway 402-gates
   everything else until then.
7. Celebration → `/dashboard`.

### Stage 1 — First session (Day 0–1): "make the dashboard真real"
The dashboard is honest about empty state — no fake numbers ever. The activation
checklist drives the first session:
- **Connect GST** (`/module/gst-dashboard`) — unlocks GST summary, statutory
  dues, compliance calendar, e-invoicing eligibility.
- **Connect bank / upload statements** (`/module/reconciliation`) — unlocks
  reconciliation, MoneyMap cash truth, profit-leak detection.
- **First invoice** (`/module/invoices`) — sequence `INV-2026-0001` allocated
  from `accounting.document_sequences`; PDF rendered server-side from the
  approved template set (8 doc types).
- **Link WhatsApp** (`/module/whatsapp-cfo`) — daily briefing + command surface.
- **Assign your CA** (`/module/business-profile`) — enter the professional's
  `VRU-XXXXXXXX` → request lands in the CA's inbox → accept creates an EDIT
  grant scoped to the org.

### Stage 2 — Daily loop (5 minutes/day, mostly on WhatsApp)
- 08:30 WhatsApp daily briefing: cash position, dues today, BHS delta, anomalies.
- Sales/purchase entries via app or WhatsApp commands; every `sales.created`
  event fans out to notifications (in-app always; email for WARNING/CRITICAL).
- Dashboard Recent Activity = real `notification.notifications` rows.

### Stage 3 — Weekly loop (owner, 20 minutes)
- **Health Score** (`/module/health-score`): BHS trend + factor breakdown.
- **Profit Leaks** + **Tax Warnings**: ranked, rupee-quantified, each with a
  recommended action.
- **Reconciliation**: clear unmatched items; matched ratio feeds BHS.
- **Reports**: P&L / cashflow / balance sheet straight from the ledger.

### Stage 4 — Monthly compliance loop (owner + assigned CA)
- Compliance calendar shows GSTR-1/3B and TDS deadlines with countdown.
- CA (via access grant) prepares filings; owner approves; filing status flows
  back to the GST dashboard and compliance score.
- Credit/debit notes, proformas, POs, delivery challans all issue from the same
  document engine with their own sequences.

### Stage 5 — Exceptional moments
- **Lifeguard SOS**: one tap escalates a case (`lifeguard.case.escalated` →
  CRITICAL email + in-app). Legal/BHS teams pick it up in their panels.
- **Warranty claims**: file + track against vendors.
- **Vendor trust check**: GSTIN lookup before onboarding a new supplier.
- **VBD simulator**: "what if sales drop 20%" scenario before a big decision.

### Plan ladder (what they pay for is what they get)
STARTER < GROWTH < PRO/ENTERPRISE — gating decoded from the JWT plan claim in
the sidebar (`PLAN_RANK`); locked modules render visibly with an upgrade prompt,
never hidden, never faked.

---

## Part B — Flaw register (industry-standard review, post-TASK-1)

Severity: 🟥 must fix before scale · 🟧 should fix soon · 🟨 quality/debt.

### Product / workflow
1. 🟥 **No first-run activation checklist on the dashboard.** Stage-1 unlocks
   above are designed but the dashboard doesn't yet render a guided checklist;
   a new owner sees honest-but-empty panels with no "do these 4 things" rail.
2. 🟥 **Professional-side UI missing.** Owner→CA assignment works end to end at
   the API (proven), but web-accountants/associates have no incoming-requests
   inbox page yet — a CA can only accept via API.
3. 🟧 **V3 10-step onboarding wizard not built** — current signup is the 6-step
   flow; entity-type-driven document requirements, autosave, and GSTIN/PAN
   checksum validation are pending (P5).
4. 🟧 **Financial Black Box has no read API.** Audit service ingests but exposes
   no GET endpoints; the module shows an honest status card instead of the
   immutable timeline it should.
5. 🟨 **Email verification step** in business signup and a `/reset` password
   page are still missing.

### Platform / wiring (the bug class that already bit twice)
6. 🟥 **Consumer-topic drift.** Two consumers shipped subscribed to event-name
   topics instead of canonical `<domain>.events`. Convention now documented;
   needs a CI guard (lint that every `subscribe()` arg is a `Topics.*` member
   and every produced event's domain has a `Topics` key).
7. 🟧 **kafkajs cannot decode Snappy.** Any future producer that compresses
   poisons the consumer offset (crash-loop). Enforce `compression: none` or add
   a snappy codec to consumers.
8. 🟧 **Firebase web config hardcoded** in `packages/ui` firebaseClient — should
   move to `NEXT_PUBLIC_*` envs per app.
9. 🟧 **MSG91 + `OTP_BYPASS_ENABLED` still present** — remove after Firebase
   migration completes across all panels.
10. 🟨 **Razorpay still on test keys** — swap to live keys + live webhook secret
    at go-live; re-verify webhook signature with raw body.

### Operations / cost
11. 🟧 **Parked-service drift.** The 12 woken services run old-image risk every
    time they're parked through a code change (the audit-service SSL crash).
    Rule: any wake must roll to the latest digest.
12. 🟨 **GCP cost watch**: Cloud SQL (~$95/mo) is the floor; NAT was removed.
    Any new LB/NAT/Confluent dependency needs explicit justification.

### Design system
13. 🟨 Sharp tokens are preset-level (2–3px platform-wide) — done; remaining
    rounded artifacts are inline `style=` overrides in older components, to be
    swept opportunistically.

---

## Part C — Operating rules baked into the build

- **Never fake data.** Empty/disconnected states say so and link the fix.
- **Audit → map → integrate → deploy.** No feature ships without a live proof
  (the P1/P2/P6 proof recipes in the events-wiring runbook).
- **Database is production.** Additive idempotent migrations only; RLS on every
  org-scoped table (`app.current_org_ids` pattern).
- **No new GCP spend without sign-off**; in-cluster Redpanda, not Confluent.
