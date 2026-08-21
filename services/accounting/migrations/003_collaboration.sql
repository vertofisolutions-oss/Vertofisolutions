-- Cross-module collaboration (V4 P8.3): comment threads on business entities
-- (sales/purchase invoices, generated documents). Additive + idempotent.
SET search_path TO accounting;

CREATE TABLE IF NOT EXISTS entity_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  entity_type text NOT NULL,              -- SALE | PURCHASE | DOCUMENT
  entity_id   uuid NOT NULL,
  author_id   uuid NOT NULL,
  author_role text,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_entity_idx
  ON entity_comments(org_id, entity_type, entity_id, created_at);

-- RLS — identical policy style to 001/002.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['entity_comments'] LOOP
    EXECUTE format('ALTER TABLE accounting.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE accounting.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON accounting.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON accounting.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;
