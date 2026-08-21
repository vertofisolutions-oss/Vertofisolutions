-- tenant service schema (orgs, teams) — see docs/05
SET search_path TO tenant;

CREATE TABLE IF NOT EXISTS organizations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name            text NOT NULL,
  trade_name            text,
  business_type         text,                          -- PROPRIETORSHIP|PARTNERSHIP|LLP|PVT_LTD|...
  industry              text,
  gstin                 text,
  pan                   text,
  cin                   text,
  llpin                 text,
  udyam                 text,
  tan                   text,
  plan                  text NOT NULL DEFAULT 'STARTER',
  plan_status           text NOT NULL DEFAULT 'TRIAL', -- TRIAL|ACTIVE|PAST_DUE|CANCELLED
  onboarding_stage      int NOT NULL DEFAULT 1,
  onboarding_confidence int,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  lead_user_id uuid,
  status       text NOT NULL DEFAULT 'ACTIVE',
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL,
  assigned_by uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, org_id)
);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
