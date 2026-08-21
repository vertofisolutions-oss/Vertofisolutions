-- Document engine: per-org consecutive numbering (GST requires unbroken series)
-- + an audit trail of every generated statutory document. Tenant-scoped (RLS).
SET search_path TO accounting;

CREATE TABLE IF NOT EXISTS document_sequences (
  org_id      uuid NOT NULL,
  doc_type    text NOT NULL,
  prefix      text NOT NULL,
  next_number int  NOT NULL DEFAULT 1,
  PRIMARY KEY (org_id, doc_type)
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  doc_type   text NOT NULL,
  number     text NOT NULL,
  source_id  uuid,                       -- e.g. the sales_invoices row it was built from
  payload    jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gendocs_org_idx ON generated_documents(org_id, created_at DESC);

-- RLS — identical policy style to 001_init.sql.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['document_sequences','generated_documents'] LOOP
    EXECUTE format('ALTER TABLE accounting.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE accounting.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON accounting.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON accounting.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;
