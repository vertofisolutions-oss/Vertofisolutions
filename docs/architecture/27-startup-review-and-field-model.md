# 27 — Full Codebase Review, Kill List & ERP Field Model

Written 2026-06-12 after the V4 build-out. Brutally honest, as requested.

---

## Part A — The flaws that actually threaten this startup

### 🟥 Existential (fix before chasing 10,000 users)
1. **One database, one cluster, no staging.** Every deploy and migration goes
   straight to production. One bad `kubectl set image` away from an outage.
   *Fix: a staging namespace + the same CI gate; cheap (parked-pod sizes).*
2. **Payments are still on Razorpay TEST keys.** Nobody can actually pay you.
   Highest-priority business item; needs live keys + webhook re-verification.
3. **No outbound email.** SMTP is `NEEDS_CONFIGURATION` — no email OTP, no
   receipts, no statements, no password-reset fallback. One transactional
   provider (SES/Resend/Postmark) unblocks four features at once.
4. **WhatsApp token fragility.** Meta access tokens expire; when they do, the
   entire "Mobile CFO" silently degrades. Needs a System User permanent token
   + an alert when sends return 401 (the connector already detects it; nothing
   alerts a human).
5. **Single-replica truths.** audit (hash chain) and redpanda are effectively
   single instances. Acceptable now — document the blast radius, revisit at
   1k users.

### 🟧 Product flaws (what's weak)
6. **Two parallel "books" models.** `accounting.sales_invoices` (the workspace)
   and `ledger.invoices` (reports read from here) are not reconciled — P&L can
   disagree with the invoice list. *This is the single biggest correctness
   risk in the product.* Fix: accounting emits → ledger posts (event exists:
   `accounting.sales.created`; the ledger consumer must post journal lines).
7. **Predictions without data look silly.** BHS/tax-warnings/profit-leaks all
   show empty states until bank+GST connect — good honesty, but the demo
   experience is hollow. Add a "sample data sandbox" toggle for evaluation.
8. **GSP connector is NOT configured** — e-invoicing/e-way are honest stubs.
   Either sign a GSP (ClearTax/MastersIndia sandbox) or de-emphasize the
   sidebar items until then.

### Kill list (features to remove or demote — they dilute focus)
- **Voice notes on WhatsApp** ("coming soon" reply): remove the teaser until
  STT is wired; broken promises erode trust faster than missing features.
- **Vendor Trust GSTIN check / Benchmarks**: thin data behind them; demote to
  GROWTH+ "beta" labels or fold into Vendor master.
- **VBD simulator** as a separate module: keep the engine, move the entry
  point inside Insights; a lone "Virtual Business Director" menu item
  over-promises.
- **Quotation + Proforma + Delivery Challan** in the first onboarding: keep
  the engine (it's one registry), but the UI should lead with the 3 documents
  MSMEs use daily (tax invoice, purchase bill, credit note).
- **Landing `contacts` endpoint** (`/onboarding/landing-contact`): unused
  by the funnel — delete or wire to a CRM lead (see field model).

### What is genuinely strong (don't touch)
Sharp module engine + honest empty states; event bus conventions + CI guard;
RLS everywhere; template-faithful PDF engine; WhatsApp guided flow + dynamic
linking; the audit hash chain (now that it actually writes).

---

## Part B — ERP field model: storage contract

Pattern adopted (TallyPrime/Dynamics-style): **typed columns for fields code
validates or filters on + `extra jsonb` catch-all** on every master, so the
full 500+ parameter model is storable TODAY and promotion of a jsonb key to a
typed column is a cheap additive migration later.

| Domain (user spec) | Where it lives now | Status |
|---|---|---|
| Company master (CIN/PAN/GSTIN/TAN/MSME/IEC/PF/ESI/DSC/FY/addresses/directors/signatory/currency/tz…) | `tenant.organizations` (003_company_master) + `profile jsonb` | ✅ schema live |
| User management (role/MFA/sessions/login attempts/IP…) | `auth.users`, `auth.sessions`, `auth.otp_challenges` | ✅ existing |
| Customer master + KYC (type/DOB/IDs/addresses/credit/ratings + kyc jsonb: CKYC, AML, PEP, risk) | `accounting.customers` (004_erp_masters) | ✅ schema live |
| Vendor master | `accounting.vendors` (004) | ✅ schema + API live |
| Chart of accounts / Ledger / Vouchers / Cash book | `ledger.*` (chart_of_accounts, ledger_entries, ledger_lines, invoices) | ◑ exists; needs voucher metadata + opening balances (next ledger migration) |
| Bank + reconciliation | `reconciliation.bank_txns`, `pending_items` | ◑ exists; statement metadata in extra |
| Sales / Purchase | `accounting.sales_invoices`, `purchase_invoices` | ✅ existing |
| Inventory + warehouse | `accounting.products` (004: SKU/barcode/brand/MRP/reorder/warehouse) | ✅ schema live; warehouse master = jsonb until multi-warehouse demand |
| Expenses | `accounting.expenses` (004) | ✅ schema + API live |
| GST / TDS | `ledger.invoices` tax cols + gst connector; TDS = planned `accounting.tds_entries` | ◑ |
| Fixed assets, Payroll, Attendance, Loans, Repayments, Collections, CRM, Investors, Budgeting, Cost centers, Multi-branch | **Phase 2 services** — each is a real subsystem; schemas reserved in this doc, NOT stubbed in prod | 🗓 roadmap |
| Audit trail | `audit.audit_log` (hash-chained) | ✅ |
| Documents / Notifications / Reporting / Security & compliance | existing services | ✅ |

**Rule:** nothing from the Phase-2 row gets a half-built table in production.
A loan ledger that doesn't compute DPD correctly is worse than no loan ledger.

---

## Part C — AI fill-in-the-blanks (token-light, Python)

`services/ocr/app/field_fill.py` — the extraction contract:
1. **Regex + checksum pass first** (GSTIN mod-36, PAN/TAN/CIN/Udyam/IEC/IFSC/
   IRN/EWB/HSN/amounts/dates/contacts) — zero tokens; verified 13/13 fields on
   a real invoice text.
2. **One compact AI call** only for keys the regexes missed: 1500-char excerpt
   + missing-key list → bare JSON. No retries, no chain-of-thought, returns {}
   on failure — never fabricates.
3. Output tags every value `REGEX` (trusted) or `AI` (route to human review),
   which is exactly the OCR pipeline's existing review gate.

PDFs: generated documents carry **no logo** (per decision 2026-06-12).
