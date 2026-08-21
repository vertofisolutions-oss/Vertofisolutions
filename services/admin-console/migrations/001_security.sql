-- admin-console: defense-in-depth security primitives (docs/24).
-- Row-level security already protects tenant tables (docs/04). Here we add
-- COLUMN-level security + at-rest encryption helpers + an admin access log.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS adminconsole;
SET search_path TO adminconsole;

-- Immutable log of every admin data access / edit (who/what/when).
CREATE TABLE IF NOT EXISTS admin_access_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL,
  action      text NOT NULL,            -- VIEW_TABLE | EDIT_ROW | VIEW_DUES | ...
  target      text,                     -- schema.table or resource
  target_id   text,
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_access_admin_idx ON admin_access_log(admin_id, created_at DESC);

-- ── Column-level security (CLS) ──────────────────────────────────────────────
-- A read role that may SELECT financial tables but NEVER the sensitive columns.
-- Services that only need redacted reads connect as this role; the admin-console
-- additionally enforces column allowlists in the application layer.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vertofi_readonly') THEN
    CREATE ROLE vertofi_readonly NOLOGIN;
  END IF;
END $$;

-- Example CLS grants (extend per table). Sensitive auth columns are excluded.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT (id, email, mobile, role, professional_type, org_id, plan, status, created_at) ON auth.users TO vertofi_readonly';
    -- password_hash, mfa_secret are deliberately NOT granted.
  END IF;
  IF to_regclass('ledger.ledger_lines') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON ledger.ledger_lines TO vertofi_readonly';
  END IF;
END $$;

-- ── At-rest field encryption helpers (pgcrypto) ──────────────────────────────
-- Sensitive identifiers (account numbers, Aadhaar) are encrypted with a key
-- supplied at runtime from the secrets vault (never stored in the DB). These
-- wrappers centralize symmetric encryption so callers never handle the key
-- inline. The key is passed as a session GUC by the application.
-- pgcrypto lives in the `public` schema; this migration runs under
-- search_path=adminconsole, so the functions must be schema-qualified or they
-- resolve to "does not exist" at CREATE FUNCTION time.
CREATE OR REPLACE FUNCTION adminconsole.enc(plaintext text) RETURNS bytea AS $$
  SELECT public.pgp_sym_encrypt(plaintext, current_setting('app.field_key'));
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION adminconsole.dec(ciphertext bytea) RETURNS text AS $$
  SELECT public.pgp_sym_decrypt(ciphertext, current_setting('app.field_key'));
$$ LANGUAGE sql;
