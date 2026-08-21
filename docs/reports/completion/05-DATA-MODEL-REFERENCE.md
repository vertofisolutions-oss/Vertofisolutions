# Data Model Reference

**VERTOFI PRIVATE LIMITED** · CIN U62099TS2026PTC211039 · 3 June 2026

PostgreSQL (Aurora, multi-AZ) is the system of record. Each service owns a
logical **schema**; tenant tables enforce row-level security; financial data
adds column-level security. 19 migrations across 19 schemas.

## Schemas & principal tables

| Schema | Key tables |
|--------|-----------|
| auth | users, sessions, otp_challenges, login_attempts |
| tenant | organizations, teams, team_assignments |
| access | access_grants, access_requests |
| audit | audit_log (partitioned, append-only, hash-chained) |
| onboarding | onboarding_profiles |
| document | documents |
| billing | subscriptions, usage_counters, payments |
| ledger | chart_of_accounts, ledger_entries, ledger_lines, invoices |
| reconciliation | pending_items, bank_txns, reconciliations |
| exception | exceptions |
| ocr | extractions |
| bhs | bhs_scores (partitioned) |
| prediction | predictions, profit_leaks |
| lifeguard | lifeguard_cases |
| vendor | vendor_trust |
| legal | legal_cases |
| warranty | warranty_claims |
| notification | notifications |
| adminconsole | admin_access_log; CLS grants; pgcrypto enc/dec helpers |

## Conventions

- **Keys:** UUID primary keys; `org_id` on every tenant-scoped row.
- **Money:** `NUMERIC(18,2)`, never floating point; INR default.
- **Timestamps:** `created_at`/`updated_at`; financial records are never
  hard-deleted (append-only + reversing entries).
- **JSONB** for flexible payloads (extractions, third-party responses) with GIN
  indexes.

## Tenant isolation (row-level security)

Every tenant table has an RLS policy keyed off session GUCs
(`app.current_org_ids`, `app.current_role`) set per request from the validated
JWT. A query can only ever touch organizations the principal is entitled to.
Trusted internal consumers use a system context (`'*'`) but their SQL still
constrains to the relevant tenant.

## Column-level security (financial data)

The admin database browser exposes only a per-table column allowlist; sensitive
columns (`password_hash`, `mfa_secret`, `code_hash`, encrypted blobs) are never
selectable. DB-level `GRANT SELECT (col, …)` to a restricted role provides
defense in depth.

## Field-level encryption

`pgcrypto` `enc()/dec()` helpers encrypt the most sensitive identifiers (bank
account numbers, Aadhaar) with a symmetric key supplied at runtime from the
secrets vault via a session GUC — the key is never stored in the database.

## Partitioning & performance

`audit_log`, `bank_transactions`, `bhs_scores`, `whatsapp_messages`,
`predictions` are range-partitioned by month with automatic partition creation
and archival. Composite indexes lead with `org_id`. Reporting/admin reads route
to read replicas; connections are pooled (PgBouncer-compatible).

## Double-entry integrity

The ledger enforces the fundamental invariant `sum(debit) = sum(credit)` per
entry before commit; entries are reversed (never deleted); each posting carries
the approval OTP id as legal proof, recorded in the immutable audit log.

DDL lives in `services/*/migrations/*.sql`.
