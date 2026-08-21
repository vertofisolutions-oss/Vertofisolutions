-- Public "Vertofi ID" — a short, shareable, unique identifier each business
-- gets (e.g. VRT-1A2B3C4D). Owners share it so professionals (CAs) can be
-- assigned to their books; it never exposes the internal UUID.
SET search_path TO tenant;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS public_id text;

-- Backfill existing orgs.
UPDATE organizations
   SET public_id = 'VRT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
 WHERE public_id IS NULL;

-- New orgs get one automatically (8 hex chars ≈ 4.3B space; unique index guards
-- the rare collision).
ALTER TABLE organizations
  ALTER COLUMN public_id SET DEFAULT 'VRT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

CREATE UNIQUE INDEX IF NOT EXISTS org_public_id_idx ON organizations(public_id);
