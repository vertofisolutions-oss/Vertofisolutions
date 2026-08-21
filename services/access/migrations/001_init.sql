-- access service schema (RBAC/ABAC grants) — see docs/04
SET search_path TO access;

CREATE TABLE IF NOT EXISTS access_grants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grantee_type text NOT NULL,                 -- USER | COMPANY
  grantee_id   uuid NOT NULL,                 -- associate/team-member/bhs-company/lawyer id
  org_id       uuid NOT NULL,                 -- the client org being granted
  permission   text NOT NULL DEFAULT 'VIEW',  -- VIEW | EDIT
  scope        text NOT NULL DEFAULT 'FULL',  -- FULL | BHS_ONLY | CASES_ONLY | DOCUMENTS
  granted_by   uuid NOT NULL,
  reason       text,
  expires_at   timestamptz,
  status       text NOT NULL DEFAULT 'ACTIVE',-- ACTIVE | REVOKED | PENDING
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS grants_grantee_idx ON access_grants(grantee_id, status);
CREATE INDEX IF NOT EXISTS grants_org_idx ON access_grants(org_id, status);

CREATE TABLE IF NOT EXISTS access_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id         uuid NOT NULL,
  org_id               uuid NOT NULL,
  requested_permission text NOT NULL DEFAULT 'VIEW',
  reason               text,
  status               text NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|DENIED
  decided_by           uuid,
  decided_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
