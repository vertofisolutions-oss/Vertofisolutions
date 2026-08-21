# 07 — Onboarding Flow

Onboarding must feel like **opening a bank account + hiring a CFO**: trustworthy, premium, guided. Three stages; each saves progress and can resume. Outputs a baseline that powers BHS, MoneyMap, Predictive Tax, ProfitLeak, and VBD.

## Stage 1 — Registration (~5 min)
**Business basics + owner + PAN + GST.**
- Business: legal name, trade name, business type, industry, year established, registered + business address, website, employee count.
- Registration IDs: PAN, GSTIN, CIN (company), LLPIN (LLP), UDYAM (optional), TAN.
- Owner/authorized person: full name, designation, mobile, email.
- Owner docs: PAN card, Aadhaar, photograph.
- **Mobile OTP + email verification** here.

## Stage 2 — Financial Setup (~15 min)
**Bank + GST + accounting documents.**
- Business documents (mandatory): PAN copy, GST certificate, incorporation/registration certificate.
- Entity-specific: Proprietorship → GST cert (+ optional Shop Establishment License); Partnership → deed; LLP → LLP agreement + COI; Pvt Ltd → COI + MOA + AOA.
- Banking: bank name, account no, IFSC; cancelled cheque **or** bank statement. **Recommended: last 12 months** of statements (12 months gives seasonality, cashflow patterns, BHS baseline, predictive foundation — not 3 or 6).
- Accounting docs (if available): P&L, balance sheet, trial balance, general ledger, cashflow statement.
- GST docs: GSTR-1 (12 mo), GSTR-3B (12 mo), GST portal summary, GST notices (if any).
- Income tax: last 2 years ITR, tax notices (if any).

## Stage 3 — Intelligence Setup (~20 min)
**Revenue + payroll + vendors + tax history + risk assessment.**
- Payroll (if employees): count, payroll summary, PF/ESI registration; optional salary register, payroll reports.
- Sales: monthly avg revenue range (`<₹5L | ₹5L–25L | ₹25L–1Cr | ₹1Cr+`); sales summary, top 10 customers, outstanding receivables.
- Vendors: top vendors, vendor GSTINs, outstanding payables (feeds VendorTrust + ProfitLeak).
- Existing software: accounting (Tally/Zoho/Busy/QuickBooks/Excel/None), payroll (Keka/GreytHR/Manual), billing (Vyapar/MyBillBook/Shopify/POS).
- **Risk assessment questions (gold):** received GST notice? IT notice? TDS notice? existing issues — cashflow problems, pending GST filings, pending ITR, vendor disputes, loan defaults?
- **Choose your professional** (Associate: CA/CMA/CPA/CS/ACCA/CFA) → creates the access grant.

## Vertofi Internal Risk Score (generated at end)
Computed from collected data + risk answers:
```
Business Profile Completeness: 92%
Financial Maturity:            Medium
Compliance Risk:               Low
Cashflow Risk:                 Medium
Onboarding Confidence Score:   88/100
```
Stored in `onboarding_profiles`; gives the assigned Team/Associate immediate context and seeds the BHS baseline.

## UX rules
- Card-based, lots of whitespace, progress indicator across the 3 stages, autosave, "resume later."
- Every document upload → real S3 storage → virus scan → OCR/extraction → confidence badge. **No fake confirmations.**
- Missing integrations (e.g., GST portal pull pending GSP credential) → **empty state + "connect later"**, never fabricated data.
