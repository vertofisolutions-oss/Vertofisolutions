# Service: reconciliation

**Responsibility:** Match bank/PG transactions ↔ invoices/receipts, GST portal data ↔ books, TDS ↔ income, payroll ↔ bank payouts. Deterministic + fuzzy matching, ranked candidates, with anything uncertain routed to human review.

**Tech:** NestJS (orchestration) + ai-gateway/embeddings for similarity. Postgres. Kafka.

**Data owned:** `reconciliations`.

**Matching strategy:**
- **Deterministic:** invoice no / reference no / exact amount + date.
- **Fuzzy:** amount ± tolerance, date window, description similarity (embedding cosine), vendor canonicalization.
- **Ranking:** top-N candidates with confidence; auto-accept above high threshold, route 0.3–0.7 to exceptions.

**API (sync):**
```
POST /reconcile/run {org_id, account_id, date_range}
GET  /reconcile/matches?status=
POST /reconcile/{id}/accept | /override   # human decision feeds learning
```

**Events:** consumes `transaction.categorized`, `bank.transaction`, `gst.return.fetched`; produces `reconciliation.proposed`, `reconciliation.completed`, `reconciliation.exception` (→ exception-workflow).

**Scaling:** stateless; partitioned by `org_id`; batch + streaming modes. Heavy similarity work uses cached embeddings.

**Failure modes & degradation:** ai-gateway down → fall back to deterministic + numeric fuzzy rules only (still functional, fewer fuzzy matches). Unmatched items remain open (never force a wrong match) and surface as exceptions.

**Security:** tenant-scoped; every accept/override audited (who/what/when) — feeds Financial Black Box.
