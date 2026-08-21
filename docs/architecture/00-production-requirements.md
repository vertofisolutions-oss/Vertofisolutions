# 00 — Non-Negotiable Production Requirements

This is **not** a prototype, MVP, demo, PoC, or UI showcase. It is a production financial platform that will onboard paying customers and handle real GST data, bank records, invoices, payroll, and tax filings.

## Forbidden

| ❌ Never | Instead |
|---------|---------|
| Mock data / sample transactions / fake users | Real records in Postgres, or an **empty state** |
| Fake / placeholder APIs | Real endpoints with real business logic |
| Hardcoded values / dummy analytics | Values computed from stored data |
| Static reports | Reports generated dynamically from real data |
| Simulated integrations | Real connector + credential framework (see [09](./09-integrations-and-connectors.md)) |
| In-memory / local-only storage | Durable Postgres / Redis / S3 |
| Single-server assumptions | Stateless, horizontally scalable services |

**Missing credentials rule:** if an external integration (GST GSP, Account Aggregator, credit bureau, WhatsApp Business, etc.) cannot be activated because approvals/keys are pending, build:
- the production **connector interface** + adapter,
- the **secure credential vault** entry,
- the **onboarding workflow** to activate it,
- and an **empty state** in the UI.

Never substitute fake data.

## Scale targets (design ceiling — no redesign to reach these)

- 50,000+ concurrent active users
- 500,000+ registered businesses
- 100M+ transactions
- 10M+ documents
- 1M+ OCR operations / month
- 1M+ WhatsApp interactions / month
- 99.99% availability, multi-region DR, zero-downtime deploys

## Definition of done (per module)

A module is "done" only when it is: real-data-backed · tenant-isolated · access-controlled · audited · observable (metrics+traces+logs) · tested (unit+integration+e2e) · documented · idempotent on writes · containerized · covered by IaC · gracefully degrading on dependency failure.

## Data integrity (financial-grade)

ACID transactions · double-entry accounting in the internal ledger · immutable audit trails (Financial Black Box) · versioned records · reconciliation validation · consistency checks · every financial action traceable to who/what/when + the OTP approval that authorized it.
