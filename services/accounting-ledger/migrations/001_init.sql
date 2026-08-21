-- accounting-ledger schema (docs/05, docs/00 double-entry + immutability)
SET search_path TO ledger;

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id  uuid NOT NULL,
  code    text NOT NULL,
  name    text NOT NULL,
  type    text NOT NULL,                  -- ASSET|LIABILITY|INCOME|EXPENSE|EQUITY
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  txn_date      date NOT NULL,
  narration     text,
  source        text NOT NULL DEFAULT 'MANUAL',  -- MANUAL|WHATSAPP|RECON|SYNC
  status        text NOT NULL DEFAULT 'POSTED',  -- DRAFT|POSTED|REVERSED
  posted_by     uuid,
  approval_otp_id uuid,                            -- legal proof (docs/06)
  reverses_id   uuid,                              -- reversing entry link (no hard deletes)
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entries_org_idx ON ledger_entries(org_id, txn_date);

CREATE TABLE IF NOT EXISTS ledger_lines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id   uuid NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  debit      numeric(18,2) NOT NULL DEFAULT 0,
  credit     numeric(18,2) NOT NULL DEFAULT 0,
  CONSTRAINT line_nonneg CHECK (debit >= 0 AND credit >= 0),
  CONSTRAINT line_one_side CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX IF NOT EXISTS lines_entry_idx ON ledger_lines(entry_id);

CREATE TABLE IF NOT EXISTS invoices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  direction   text NOT NULL,                 -- PURCHASE|SALES
  vendor_id   uuid,
  customer_id uuid,
  invoice_no  text,
  date        date,
  taxable     numeric(18,2) NOT NULL DEFAULT 0,
  cgst        numeric(18,2) NOT NULL DEFAULT 0,
  sgst        numeric(18,2) NOT NULL DEFAULT 0,
  igst        numeric(18,2) NOT NULL DEFAULT 0,
  total       numeric(18,2) NOT NULL DEFAULT 0,
  itc_eligible boolean,
  status      text NOT NULL DEFAULT 'RECORDED',
  document_id uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_org_idx ON invoices(org_id, date);

-- RLS on every tenant table (docs/04)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chart_of_accounts','ledger_entries','ledger_lines','invoices'] LOOP
    EXECUTE format('ALTER TABLE ledger.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE ledger.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON ledger.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON ledger.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
