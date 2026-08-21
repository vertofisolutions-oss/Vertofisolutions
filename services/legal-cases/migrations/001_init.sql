-- legal-cases schema — Vertofi for Legal Services panel (docs/03 #7)
CREATE SCHEMA IF NOT EXISTS legal;
SET search_path TO legal;

CREATE TABLE IF NOT EXISTS legal_cases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  lawyer_id   uuid,
  type        text NOT NULL,                 -- GST_NOTICE|TAX_NOTICE|FRAUD|DISPUTE|OTHER
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'OPEN',  -- OPEN|IN_PROGRESS|CLOSED
  source_case_id uuid,                        -- originating lifeguard case
  ai_analysis jsonb,
  documents   jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legal_org_idx ON legal_cases(org_id, status);
CREATE INDEX IF NOT EXISTS legal_lawyer_idx ON legal_cases(lawyer_id, status);

ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_cases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS legal_tenant ON legal_cases;
CREATE POLICY legal_tenant ON legal_cases USING (
  current_setting('app.current_org_ids', true) = '*'
  OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')));
