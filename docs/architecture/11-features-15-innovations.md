# 11 — Features: The 15 Innovations (how each is computed)

Each feature is computed from **real stored data**. Where a data source needs a pending integration, the feature shows an **empty state** until activated — never fabricated numbers. Plan gating per [01](./01-product-overview.md).

### 1. Business Health Score (BHS™) — `bhs-engine`
0–100 composite of weighted sub-scores: expense discipline, tax compliance, cashflow stability, GST accuracy, payroll consistency, debt risk, profit leakage. Recomputed on relevant events (`ledger.posted`, `gst.return.fetched`, `payroll.synced`, `reconciliation.completed`) → emits `bhs.computed`; cached in Redis; history in `bhs_scores` (partitioned). Shown as huge number + gold "Excellent" badge.

### 2. Predictive Tax Warning System™ — `prediction`
Forecasts GST liability, filing delays, penalty risk from filing history + current invoices + liabilities. Uses time-series + ai-gateway reasoning. Output e.g. *"GST liability may increase, projected +₹18,240, recommend delay invoice by 4 days."*

### 3. Business Lifeguard™ (24×7) — `lifeguard`
Emergency desk. SOS via app/WhatsApp → `lifeguard_case` → severity + category → analyst routing → escalation to Legal panel for notices. SLA-tracked timeline.

### 4. ProfitLeak Finder™ — `prediction` + rules
Detects duplicate invoices, hidden charges, overspending, subscription waste, unclaimed ITC. Combines deterministic rules + anomaly detection over `invoices`/`bank_transactions`. Writes `profit_leaks` with evidence.

### 5. Virtual Business Director™ (VBD) — `vbd`
Decision simulations (hire / invest / switch supplier / restructure). Runs financial scenarios over current books + forecasts → recommendation + risk score. Pro plan. (Powers Voice CFO on WhatsApp.)

### 6. WhatsApp Micro Accounting™ — `whatsapp`
See [10](./10-whatsapp-cfo.md). Capture via text/voice/image/PDF → OCR → categorize → ledger.

### 7. Financial Wellness Program™ — `prediction` + `reporting`
Structured improvement plans for tax/expense/cashflow habits, tracked over time against BHS sub-scores.

### 8. Invisible Accounting™ — connectors + `categorization` + `reconciliation`
Auto-sync bank, GST, TDS, payroll, POS, sales, WhatsApp → auto-categorize → auto-reconcile → auto-post. The Zero-Data-Entry engine end-to-end.

### 9. VendorTrust Score™ — `vendor`
Vendor risk from GST filing history, disputes, defaults, credit patterns (via GST + credit connectors). Writes `vendor_trust`. Pro plan.

### 10. Accounting Warranty+™ — `billing` + `audit`
Warranty against penalties caused by Vertofi errors. Eligibility tied to timely data submission + no client interference + the immutable audit trail proving Vertofi's action. `warranty_claims` workflow with verification (7–15 days). Pro plan.

### 11. MoneyMap Live™ — `reporting` + `moneymap_snapshots`
Real-time inflow/outflow, profit zones, waste zones, seasonality. The dashboard **wow centerpiece** — animated flow network (see [12](./12-ui-design-system.md)). Streams updates via WebSocket on new transactions.

### 12. On-Demand Accountant™ — `lifeguard`/`tenant` + `billing`
Pay-per-use 10-minute expert help; routes to available Associate/Accountant; metered.

### 13. Financial Black Box™ — `audit`
Immutable, append-only `audit_log` consuming **all** domain events: who/what/when + the approval OTP. Audit-grade reconstruction reports. Always-on substrate, not a feature toggle.

### 14. Industry Benchmarks™ — `reporting` + `benchmarks`
**Anonymized** cross-tenant comparisons (expense ratios, margins, GST behavior, payroll sizes) computed from aggregate data with k-anonymity thresholds — no single tenant identifiable. Pro plan.

### 15. Zero-Data-Entry Accounting™ — the whole pipeline
The flagship: ingestion → OCR → GST verify → categorize → reconcile → exception (human-in-loop) → post → external sync, with confidence-driven automation. See [02](./02-system-architecture.md) event flow.

## Feature × plan gating (enforced in gateway + ai-gateway)
| Feature | Starter | Growth | Pro |
|---|:--:|:--:|:--:|
| BHS | Basic | Full | Advanced |
| Predictive Tax / ProfitLeak / MoneyMap / Invisible Acc. | ❌ | ✅ | ✅ |
| VBD / VendorTrust / Warranty+ / Black Box / Benchmarks / API | ❌ | ❌ | ✅ |
| WhatsApp Accounting | Basic | Advanced | Enterprise |
