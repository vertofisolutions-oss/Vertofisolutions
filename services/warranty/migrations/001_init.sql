-- warranty schema — Accounting Warranty+™ (docs/11 #10)
CREATE SCHEMA IF NOT EXISTS warranty;
SET search_path TO warranty;

CREATE TABLE IF NOT EXISTS warranty_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  type          text NOT NULL,                 -- GST_PENALTY|TAX_PENALTY|PAYROLL|OTHER
  penalty_amount numeric(18,2) NOT NULL,
  description   text,
  evidence_doc_id uuid,
  status        text NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|PAID
  verdict       jsonb,
  submitted_by  uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS warranty_org_idx ON warranty_claims(org_id, status);

ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS warranty_tenant ON warranty_claims;
CREATE POLICY warranty_tenant ON warranty_claims USING (
  current_setting('app.current_org_ids', true) = '*'
  OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')));
