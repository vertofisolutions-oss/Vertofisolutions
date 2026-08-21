-- vendor schema — VendorTrust Score™ (docs/11 #9)
CREATE SCHEMA IF NOT EXISTS vendor;
SET search_path TO vendor;

CREATE TABLE IF NOT EXISTS vendor_trust (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  vendor_name text NOT NULL,
  gstin       text,
  score       int,                           -- 0–100, null when insufficient signals
  factors     jsonb NOT NULL DEFAULT '{}',
  rating      text,                           -- TRUSTED|MODERATE|RISKY|INSUFFICIENT
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, vendor_name)
);
CREATE INDEX IF NOT EXISTS vendor_trust_org_idx ON vendor_trust(org_id);

ALTER TABLE vendor_trust ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_trust FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendor_trust_tenant ON vendor_trust;
CREATE POLICY vendor_trust_tenant ON vendor_trust USING (
  current_setting('app.current_org_ids', true) = '*'
  OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')));
