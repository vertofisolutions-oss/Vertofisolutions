-- ============================================================
-- Migration: Admin Console — Team Management System
-- File: 20240610_admin_team_management.sql
-- Applies to: Vertofi production Cloud SQL (PostgreSQL 16)
-- Run via: psql $DATABASE_URL -f this_file.sql
-- ============================================================

BEGIN;

-- ── Sequence for auto Employee IDs (VTF-0001, VTF-0002, ...) ─────────────
CREATE SEQUENCE IF NOT EXISTS adminconsole.employee_id_seq
  START WITH 1001
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- ── Team Members ──────────────────────────────────────────────────────────
-- Vertofi internal staff managed entirely via admin panel.
-- Each row links to an auth.users record (role = TEAM_MEMBER or TEAM_LEAD).
CREATE TABLE IF NOT EXISTS adminconsole.team_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT        NOT NULL UNIQUE
                          DEFAULT 'VTF-' || LPAD(
                            nextval('adminconsole.employee_id_seq')::TEXT, 4, '0'
                          ),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  mobile      TEXT,
  job_title   TEXT,
  status      TEXT        NOT NULL DEFAULT 'ACTIVE'
                          CHECK (status IN ('ACTIVE','SUSPENDED','DEACTIVATED')),
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON adminconsole.team_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email       ON adminconsole.team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status      ON adminconsole.team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id     ON adminconsole.team_members(user_id);

-- ── Company Assignments ───────────────────────────────────────────────────
-- Maps a team member to the organisations they can access.
-- access_level controls READ vs READ_WRITE toggled from admin UI.
CREATE TABLE IF NOT EXISTS adminconsole.company_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id  UUID        NOT NULL REFERENCES adminconsole.team_members(id) ON DELETE CASCADE,
  org_id          UUID        NOT NULL REFERENCES tenant.organisations(id) ON DELETE CASCADE,
  access_level    TEXT        NOT NULL DEFAULT 'READ'
                              CHECK (access_level IN ('READ','READ_WRITE')),
  assigned_by     UUID        REFERENCES auth.users(id),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_company_assignments_member ON adminconsole.company_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_company_assignments_org    ON adminconsole.company_assignments(org_id);

-- ── Access Requests ───────────────────────────────────────────────────────
-- Team members request access to a company. Admin approves/rejects
-- via a popup that re-authenticates with the admin's own password.
CREATE TABLE IF NOT EXISTS adminconsole.access_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id  UUID        NOT NULL REFERENCES adminconsole.team_members(id) ON DELETE CASCADE,
  org_id          UUID        NOT NULL REFERENCES tenant.organisations(id) ON DELETE CASCADE,
  reason          TEXT,
  status          TEXT        NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reject_reason   TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by     UUID        REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ
);

-- Only one pending request per (member, org) pair.
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_pending_unique
  ON adminconsole.access_requests(team_member_id, org_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_access_requests_member ON adminconsole.access_requests(team_member_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON adminconsole.access_requests(status);

-- ── Panel Access Tokens ───────────────────────────────────────────────────
-- DB-stored permanent tokens set as httpOnly cookies in the browser.
-- Never expire by time — revoked individually by admin.
-- Middleware validates by checking is_active = true in this table.
CREATE TABLE IF NOT EXISTS adminconsole.panel_access_tokens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  team_member_id  UUID        REFERENCES adminconsole.team_members(id) ON DELETE CASCADE,
  panel           TEXT        NOT NULL CHECK (panel IN ('ADMIN','TEAMS')),
  label           TEXT        NOT NULL DEFAULT 'Default',  -- e.g. "Mahesh's laptop"
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  last_used_at    TIMESTAMPTZ,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panel_tokens_token     ON adminconsole.panel_access_tokens(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_panel_tokens_member    ON adminconsole.panel_access_tokens(team_member_id);
CREATE INDEX IF NOT EXISTS idx_panel_tokens_panel     ON adminconsole.panel_access_tokens(panel);

-- ── IP Allowlist ──────────────────────────────────────────────────────────
-- Admin manages this list from the IP Allowlist UI page.
-- Middleware calls the /ip-allowlist/check endpoint (Redis-cached, 30s TTL).
CREATE TABLE IF NOT EXISTS adminconsole.ip_allowlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address  TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL DEFAULT '',   -- "Vertofi HQ", "Ravi VPN"
  panel       TEXT        NOT NULL DEFAULT 'BOTH'
                          CHECK (panel IN ('ADMIN','TEAMS','BOTH')),
  expires_at  TIMESTAMPTZ,                        -- NULL = never expires
  added_by    UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_allowlist_ip    ON adminconsole.ip_allowlist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_allowlist_panel ON adminconsole.ip_allowlist(panel);

-- ── Triggers: updated_at maintenance ─────────────────────────────────────
CREATE OR REPLACE FUNCTION adminconsole.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_team_members_updated_at'
  ) THEN
    CREATE TRIGGER trg_team_members_updated_at
      BEFORE UPDATE ON adminconsole.team_members
      FOR EACH ROW EXECUTE FUNCTION adminconsole.set_updated_at();
  END IF;
END $$;

COMMIT;
