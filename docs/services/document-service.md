# Service: document

**Responsibility:** Lifecycle of every uploaded file — presigned upload, S3 storage, versioning, virus scan, encryption, linkage to entities, triggering OCR. Sources: web upload, WhatsApp media, email, vendor portals.

**Tech:** NestJS. S3 (MinIO local). ClamAV (virus scan). Emits to Kafka.

**Data owned:** `documents`.

**API (sync):**
```
POST /documents/presign     # → presigned S3 PUT url + document_id (org-scoped key)
POST /documents/{id}/commit # finalize after upload → triggers scan + OCR
GET  /documents/{id}        # metadata + scoped signed download (Document Access OTP for sensitive types)
GET  /documents?entity=     # list by linked entity
```

**Pipeline per upload:** store to `s3://.../{org_id}/{document_id}/v{n}` → virus scan → mark encrypted/scanned → emit `document.received {document_id, org_id, s3_key, source}` → OCR consumes.

**Events:** produces `document.received`, `document.scanned`, `document.rejected` (virus/invalid). Consumes `whatsapp.media.received`, `email.attachment.received`.

**Scaling:** stateless; uploads go **direct to S3 via presigned URLs** (service never proxies bytes) → scales trivially.

**Failure modes & degradation:** virus scanner down → quarantine state, retry, never auto-process unscanned. OCR backlog → documents sit in `received`, processed when workers scale. No data loss (durable in S3 + outbox event).

**Security:** org-prefixed keys, server-side encryption (KMS), scoped + short-lived signed URLs, **Document Access OTP** for sensitive types (GST returns, bank statements, payroll). All access audited.
