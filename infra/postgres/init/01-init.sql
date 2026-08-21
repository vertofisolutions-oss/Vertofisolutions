-- Vertofi local Postgres bootstrap.
-- Schemas are owned per service (logical isolation within one Aurora cluster).
-- Production applies the same via migration jobs (see docs/17-ci-cd.md).

CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid, crypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- One schema per bounded context (see docs/02-system-architecture.md)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS tenant;
CREATE SCHEMA IF NOT EXISTS access;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS onboarding;
CREATE SCHEMA IF NOT EXISTS document;
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE SCHEMA IF NOT EXISTS billing;

-- Application role used by services. RLS policies key off session GUCs
-- app.current_org_ids and app.current_role (see docs/04-rbac-and-access-control.md).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vertofi_app') THEN
    CREATE ROLE vertofi_app NOINHERIT LOGIN PASSWORD 'vertofi_app';
  END IF;
END $$;

GRANT USAGE ON SCHEMA auth, tenant, access, audit, onboarding, document, ledger, billing TO vertofi_app;
