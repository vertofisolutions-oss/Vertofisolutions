-- document service schema (docs/05, services/document-service.md)
SET search_path TO document;

CREATE TABLE IF NOT EXISTS documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL,
  type               text NOT NULL,                 -- INVOICE|RECEIPT|BANK_STATEMENT|GST_RETURN|PAN|...
  filename           text NOT NULL,
  content_type       text,
  s3_key             text NOT NULL,
  version            int  NOT NULL DEFAULT 1,
  status             text NOT NULL DEFAULT 'PENDING',-- PENDING|UPLOADED|SCANNED|REJECTED|EXTRACTED
  virus_scanned      boolean NOT NULL DEFAULT false,
  source             text NOT NULL DEFAULT 'WEB',    -- WEB|WHATSAPP|EMAIL|VENDOR_PORTAL
  linked_entity_type text,
  linked_entity_id   uuid,
  uploaded_by        uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_tenant ON documents;
CREATE POLICY documents_tenant ON documents
  USING (
    current_setting('app.current_org_ids', true) = '*'
    OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ','))
  );
CREATE INDEX IF NOT EXISTS documents_org_idx ON documents(org_id, created_at);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
