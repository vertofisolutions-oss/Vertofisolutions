-- exception-workflow schema (docs/services + docs/03 Teams flaw-flagging)
CREATE SCHEMA IF NOT EXISTS exception;
SET search_path TO exception;

CREATE TABLE IF NOT EXISTS exceptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  type        text NOT NULL,                  -- NEEDS_REVIEW|RECON_UNMATCHED|FLAW_FLAG|GST_MISMATCH
  severity    text NOT NULL DEFAULT 'MEDIUM', -- LOW|MEDIUM|HIGH
  payload     jsonb NOT NULL DEFAULT '{}',
  raised_by   uuid,                            -- user (flaw flag) or null (system)
  assigned_to uuid,
  sla_due_at  timestamptz,
  status      text NOT NULL DEFAULT 'OPEN',   -- OPEN|IN_PROGRESS|RESOLVED|DISMISSED
  resolution  jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exceptions_org_idx ON exceptions(org_id, status);

ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exceptions_tenant ON exceptions;
CREATE POLICY exceptions_tenant ON exceptions USING (
  current_setting('app.current_org_ids', true) = '*'
  OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')));

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
