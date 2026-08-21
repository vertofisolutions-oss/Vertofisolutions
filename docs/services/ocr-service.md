# Service: ocr

**Responsibility:** Extract structured financial data from documents — invoices, receipts, bank statements, GST notices — even from crumpled/low-light/handwritten inputs. Layout parsing (tables, tax breakdowns) + entity extraction + validation.

**Tech:** Python + FastAPI. OCR connectors: Google Vision / AWS Textract (primary, via connector framework) + fallback; post-processing with heuristics + ai-gateway for cleanup/NER.

**Data owned:** `extractions`.

**API (sync, internal):** `POST /ocr/extract {document_id}` → structured payload + confidence.

**Pipeline:** consume `document.received` → OCR provider → layout parse → entity extraction (vendor, GSTIN, invoice no, date, line items, tax breakdown, total) → date/number/currency normalization → validation (GSTIN checksum, totals reconcile) → confidence scoring → emit `document.extracted {extraction_id, payload, confidence}`.

```json
{ "vendor_name":"ABC Traders","vendor_gstin":"29ABCDE1234F2Z5",
  "invoice_number":"INV-2025-045","invoice_date":"2025-11-25",
  "line_items":[{"desc":"Paper A4","qty":10,"rate":50,"tax":{"cgst":9,"sgst":9}}],
  "total":590, "confidence":0.87 }
```

**Events:** consumes `document.received`; produces `document.extracted`, `document.extraction_failed` (→ DLQ + exception).

**Scaling:** stateless workers, **autoscale on Kafka lag / queue depth**; optional GPU node group for batch/heavy custom models.

**Failure modes & degradation:** primary OCR provider down → failover provider; both down → retry/queue (document waits, user sees "extracting"). Low confidence (0.3–0.7) → routed to exception-workflow for human review, not auto-posted. No fabricated extraction ever.

**Security:** PII redacted before any ai-gateway call; raw images access-controlled via document service.
