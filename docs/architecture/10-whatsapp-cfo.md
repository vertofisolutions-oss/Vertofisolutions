# 10 — WhatsApp CFO (24/7 CFO in your pocket)

**Core principle:** the user should never think "I'm talking to a bot." They're talking to **Vertofi**. The web dashboard is the control center; **WhatsApp is the daily operating system**.

## Architecture
```
WhatsApp → Meta Business API → Vertofi WhatsApp Gateway → Conversation Engine
  → Financial Intelligence Engine → Action Engine → Databases + Integrations
```
- **Gateway** (NestJS): verifies webhook signature, dedupes, normalizes inbound (text/voice/image/PDF), enforces tenancy (maps `wa_user` → org), emits `whatsapp.message.received`.
- **Conversation Engine** (FastAPI + ai-gateway): intent detection, dialog state, uses **long-term memory**.
- **Action Engine**: turns intents into real platform actions (create invoice, file GST, record expense) with approval + OTP.

## Supported inputs
- **Text** — "How much GST do I need to pay this month?" → reads GST data, filings, invoices, liabilities → answers.
- **Voice notes** — "I paid ₹25,000 to Ganesh Suppliers today" → STT → intent → classify → ledger draft → "Approve?".
- **Images** — GST invoice/petrol bill/receipt → OCR → extract (vendor, amount, GST, ITC eligibility) → "Record expense?".
- **PDF** — bank statement / GST notice → parse → analyze → e.g. *"GST Notice detected, due 12 June, demand ₹18,400, risk Medium. Start Lifeguard response?"*

## Long-term memory (why most bots fail — Vertofi doesn't)
- **Business memory:** type, GSTIN, industry, revenue range, vendors, customers, past filings, loans, payroll, connected accounts. (Persisted in `whatsapp_conversations.memory` + sourced from org data.)
- **Conversation memory:** previous questions, past decisions, uploaded documents, pending tasks, approvals.
- Result: "How much did I spend on fuel last month?" — already knows. No re-upload, no re-explain.

## Action Engine (acts, not just answers)
- *"Create invoice for Ramesh Traders ₹25,000"* → creates `INV-245` → "Send to customer?" → approve → delivered.
- *"File GST"* → GST summary (liability/ITC/net payable) → "Approve filing?" → **OTP** → submit → done.
- *"Show cashflow risk"* → runs MoneyMap + Predictive Tax + BHS → "Cash runway 42 days, risk Medium, largest issue: slow receivables."

## Plan-aware AI
Bot knows the subscription plan. *"Run vendor trust analysis"* → Starter: "Available in Pro Plan." → Pro: runs and delivers. Enforced via `usage_counters` + plan claims.

## Business Lifeguard via WhatsApp
Keyword **HELP** / **SOS** → Lifeguard menu: 1 GST Notice · 2 Tax Notice · 3 Fraud · 4 Cashflow Crisis · 5 Vendor Dispute → creates a `lifeguard_case` instantly, routes to analyst (and Legal panel if escalated).

## Voice CFO (VBD over WhatsApp)
*"Can I hire 3 employees next month?"* (voice) → STT → VBD engine checks cashflow/payroll/tax → *"Recommendation: delay 45 days. Cash runway falls 87→52 days. Risk 68/100."*

## Daily Intelligence Push (every morning)
> Good morning Mahesh. Business Health Score: 91. Cash position: ₹4.8L. GST due: 7 days. Top risk: Vendor XYZ hasn't filed GSTR-1. Recommended: follow up today.

## Approval workflows (sensitive actions)
GST filing · payroll processing · invoice sending · tax submission · bank connection → **Approve → OTP → Execute**. Every approval recorded in the Financial Black Box as legal proof (see [06](./06-authentication-and-otp.md)).

## Reliability
WhatsApp/Meta or OpenAI outage → inbound messages are still **accepted and queued** (Kafka), processed when dependencies recover; user gets an acknowledgement, never an error. STT and OCR have provider failovers.
