-- lifeguard schema — Business Lifeguard™ 24×7 (docs/11 #3)
CREATE SCHEMA IF NOT EXISTS lifeguard;
SET search_path TO lifeguard;

CREATE TABLE IF NOT EXISTS lifeguard_cases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  category    text NOT NULL,                 -- GST_NOTICE|TAX_NOTICE|FRAUD|CASHFLOW_CRISIS|VENDOR_DISPUTE
  severity    text NOT NULL DEFAULT 'HIGH',
  source      text NOT NULL DEFAULT 'APP',   -- APP|WHATSAPP
  status      text NOT NULL DEFAULT 'OPEN',  -- OPEN|ASSIGNED|RESOLVED|ESCALATED_LEGAL
  assigned_to uuid,
  timeline    jsonb NOT NULL DEFAULT '[]',
  raised_by   uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lifeguard_org_idx ON lifeguard_cases(org_id, status);

ALTER TABLE lifeguard_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifeguard_cases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lifeguard_tenant ON lifeguard_cases;
CREATE POLICY lifeguard_tenant ON lifeguard_cases USING (
  current_setting('app.current_org_ids', true) = '*'
  OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')));

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
