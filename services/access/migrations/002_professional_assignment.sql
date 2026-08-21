-- Owner → CA assignment by Vertofi ID. Additive + idempotent (production-safe).

-- Professionals get a shareable public ID (VRU-XXXXXXXX), mirroring the org's
-- VRT- id. Owners type this to assign a CA to their books.
SET search_path TO auth;
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id text;
UPDATE users SET public_id = 'VRU-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) WHERE public_id IS NULL;
ALTER TABLE users ALTER COLUMN public_id SET DEFAULT 'VRU-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_idx ON users(public_id);

-- access_requests gains the professional being assigned + the requested scope,
-- so an owner-initiated request can be confirmed by that specific professional.
SET search_path TO access;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS target_grantee_id uuid;
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS requested_scope text;
CREATE INDEX IF NOT EXISTS access_requests_target_idx ON access_requests(target_grantee_id, status);
