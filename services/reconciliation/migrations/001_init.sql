-- reconciliation service schema (docs/services/reconciliation-service.md)
CREATE SCHEMA IF NOT EXISTS reconciliation;
SET search_path TO reconciliation;

-- Read model fed by events: items awaiting a bank match.
CREATE TABLE IF NOT EXISTS pending_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  document_id  uuid,
  extraction_id uuid,
  vendor       text,
  category     text,
  amount       numeric(18,2) NOT NULL,
  invoice_no   text,
  item_date    date,
  matched      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pending_match_idx ON pending_items(org_id, amount) WHERE matched = false;

CREATE TABLE IF NOT EXISTS bank_txns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  ext_ref     text,
  amount      numeric(18,2) NOT NULL,
  direction   text NOT NULL,              -- DEBIT|CREDIT
  txn_date    date,
  matched     boolean NOT NULL DEFAULT false,
  raw         jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bank_match_idx ON bank_txns(org_id, amount) WHERE matched = false;

CREATE TABLE IF NOT EXISTS reconciliations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  pending_id    uuid,
  bank_txn_id   uuid,
  match_confidence numeric(4,3) NOT NULL,
  method        text NOT NULL,            -- DETERMINISTIC|FUZZY|MANUAL
  status        text NOT NULL DEFAULT 'PROPOSED', -- PROPOSED|CONFIRMED|REJECTED
  resolved_by   uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recon_org_idx ON reconciliations(org_id, status);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pending_items','bank_txns','reconciliations'] LOOP
    EXECUTE format('ALTER TABLE reconciliation.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE reconciliation.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON reconciliation.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON reconciliation.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
