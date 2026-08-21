# 05 — Data Model

PostgreSQL (Aurora, multi-AZ) is the system of record for all structured & financial data. ACID, RLS-enforced tenancy, partitioned hot tables. S3 holds blobs; OpenSearch holds search indexes; Redis holds cache/sessions.

## Conventions
- UUID v7 primary keys (`id`). `org_id` on every tenant-scoped row. `created_at`, `updated_at`, `created_by`. Soft delete via `deleted_at` for recoverable entities; financial records are **never hard-deleted** (append-only + reversing entries).
- Money stored as `NUMERIC(18,2)` in **paise-safe** form (no floats). Currency `INR` default.
- JSONB for flexible payloads (extractions, raw third-party responses) with GIN indexes.
- RLS on every tenant table (see [04](./04-rbac-and-access-control.md)).

## Identity & access
```
organizations(id, legal_name, trade_name, business_type, industry, gstin, pan, cin, llpin, udyam, tan,
              plan, plan_status, onboarding_stage, onboarding_confidence, created_at)
users(id, org_id?, role, professional_type?, parent_associate_id?, full_name, email,
      mobile, status, mfa_enabled, last_login_at, created_at)
teams(id, name, lead_user_id, created_by, status)
team_assignments(id, team_id, org_id, assigned_by, created_at)
access_grants(id, grantee_type, grantee_id, org_id, permission, scope, granted_by,
              reason, expires_at, status, created_at)   -- ABAC core
access_requests(id, requester_id, org_id, requested_permission, reason, status, decided_by)
sessions(id, user_id, device_id, ip, user_agent, created_at, expires_at, revoked_at)
otp_challenges(id, user_id, channel, purpose, code_hash, attempts, expires_at, consumed_at)
```

## Onboarding & documents
```
onboarding_profiles(id, org_id, stage, completeness, financial_maturity, compliance_risk,
                    cashflow_risk, confidence_score, risk_answers jsonb, existing_software jsonb)
documents(id, org_id, type, s3_key, version, status, virus_scanned, encrypted, uploaded_by,
          linked_entity_type, linked_entity_id, created_at)
extractions(id, document_id, org_id, payload jsonb, confidence, status, model_version)
```

## Accounting core (double-entry)
```
chart_of_accounts(id, org_id, code, name, type)            -- asset/liability/income/expense/equity
ledger_entries(id, org_id, txn_date, narration, source, status, posted_by, approval_otp_id)
ledger_lines(id, entry_id, org_id, account_id, debit, credit) -- sum(debit)=sum(credit) enforced
invoices(id, org_id, vendor_id?, customer_id?, direction, invoice_no, date, taxable, cgst, sgst, igst,
         total, itc_eligible, status, document_id)
bank_accounts(id, org_id, bank_name, account_no_masked, ifsc, connector_ref, status)
bank_transactions(id, org_id, bank_account_id, txn_date, amount, direction, ref, raw jsonb)  -- PARTITIONED by month
vendors(id, org_id, name, gstin, gst_status, trust_score)
customers(id, org_id, name, gstin)
reconciliations(id, org_id, invoice_id, bank_txn_id, match_confidence, method, resolved_by, status)
exceptions(id, org_id, type, payload jsonb, assigned_to, sla_due_at, status, resolution jsonb)
```

## Intelligence & features
```
bhs_scores(id, org_id, score, sub_scores jsonb, computed_at)               -- PARTITIONED by month
predictions(id, org_id, type, horizon, payload jsonb, confidence, created_at)
profit_leaks(id, org_id, type, amount, evidence jsonb, status)
moneymap_snapshots(id, org_id, period, inflow, outflow, profit_zones jsonb, waste_zones jsonb)
vendor_trust(id, org_id, vendor_id, score, factors jsonb, computed_at)
benchmarks(id, industry, metric, percentile_data jsonb, period)            -- anonymized, cross-tenant
warranty_claims(id, org_id, type, penalty_amount, status, verdict)
```

## Engagement, legal, billing, audit
```
whatsapp_conversations(id, org_id, wa_user, state, memory jsonb, last_msg_at)
whatsapp_messages(id, conversation_id, org_id, direction, type, content, media_s3_key, intent)
notifications(id, org_id, user_id, channel, template, payload jsonb, status, sent_at)
legal_cases(id, org_id, lawyer_id, type, status, ai_analysis jsonb, documents jsonb, created_at)
lifeguard_cases(id, org_id, category, severity, assigned_to, status, timeline jsonb)
subscriptions(id, org_id, plan, period, amount, status, current_period_end, gateway_ref)
usage_counters(id, org_id, metric, period, used, limit)                    -- plan enforcement
audit_log(id, org_id?, actor_id, action, entity_type, entity_id, before jsonb, after jsonb,
          ip, correlation_id, approval_otp_id, created_at)  -- IMMUTABLE, append-only (Financial Black Box)
```

## Partitioning & scale
- `bank_transactions`, `audit_log`, `whatsapp_messages`, `bhs_scores`, `predictions` → **range-partitioned by month**, with automatic partition creation + archival to cold storage after retention window.
- Composite indexes lead with `org_id`. Heavy read paths served by **read replicas**; reporting routed to replicas only.
- Hot aggregates (current BHS, cash position, dashboard cards) cached in Redis with event-driven invalidation.

DDL migrations live in `services/*/migrations` and are applied via CI (see [17](./17-ci-cd.md)).
