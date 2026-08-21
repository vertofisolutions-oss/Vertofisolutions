# 19 — API Standards

All APIs are RESTful, versioned, documented, rate-limited, authenticated, monitored, audited, and validated. **OpenAPI spec is the contract** for every service; the typed frontend client is generated from it.

## REST conventions
- Base: `/api/v1/...`. Version in path; breaking changes → new version (contract check in CI, [17](./17-ci-cd.md)).
- Resource-oriented nouns, plural (`/invoices`, `/exceptions`). Standard verbs + status codes.
- Pagination: cursor-based (`?cursor=&limit=`). Filtering/sorting via query params. Consistent envelope:
```
{ "data": ..., "meta": { "cursor": "...", "request_id": "..." }, "errors": [] }
```
- Errors: RFC 7807 problem+json with stable machine-readable `code`.

## Auth & tenancy on every call
`Authorization: Bearer <JWT>` → gateway validates → injects principal + effective org set → RLS enforced ([04](./04-rbac-and-access-control.md)). `428 Precondition Required` triggers step-up OTP for sensitive actions ([06](./06-authentication-and-otp.md)).

## Idempotency
All non-GET mutations accept `Idempotency-Key`; gateway dedupes (Redis) → safe client retries. Webhooks dedupe on provider event id.

## Rate limiting & plan limits
Token-bucket per user/IP/org in Redis. **Plan limits** (invoices, OCR scans, users, AI calls, storage, bank accounts) enforced at gateway + `usage_counters`; `429` with `Retry-After` and an upgrade hint when a plan cap is hit.

## Event contracts (Kafka)
Envelope on every event:
```
{ "event": "document.extracted", "schema_version": 1,
  "org_id": "...", "actor_id": "...",
  "correlation_id": "...", "causation_id": "...", "occurred_at": "...",
  "data": { ... } }
```
- Schema registry + compatibility checks; consumers tolerate unknown fields (forward-compatible).
- Topics partitioned by `org_id` (ordering per tenant). DLQ per topic.
- Canonical topics: `user.*`, `org.*`, `grant.*`, `document.*`, `transaction.*`, `bank.*`, `gst.*`, `payroll.*`, `vendor.*`, `reconciliation.*`, `exception.*`, `ledger.*`, `external.*`, `bhs.*`, `prediction.*`, `vbd.*`, `whatsapp.*`, `notification.*`, `lifeguard.*`, `subscription.*`, `audit.*`, `security.*`.

## Documentation
Swagger UI per service from its OpenAPI spec; public Pro-tier API (plan-gated) documented for third-party automation + webhooks.

## Validation & observability
Request/response schema validation (class-validator / Pydantic). Every request carries a `request_id`, traced (OpenTelemetry), and audited where it mutates state.
