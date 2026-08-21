-- ocr service schema (docs/services/ocr-service.md)
CREATE SCHEMA IF NOT EXISTS ocr;
SET search_path TO ocr;

CREATE TABLE IF NOT EXISTS extractions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  org_id      uuid NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}',
  confidence  numeric(4,3) NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'NEEDS_REVIEW',  -- EXTRACTED|NEEDS_REVIEW|FAILED
  model_version text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS extractions_doc_idx ON extractions(document_id);
CREATE INDEX IF NOT EXISTS extractions_org_idx ON extractions(org_id, created_at);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
