-- ERP master-data expansion (docs/27 field model). Pattern: typed columns for
-- the fields code actually reads/validates + an `extra jsonb` catch-all so the
-- FULL 500+ parameter model is storable today without 500 columns. Additive +
-- idempotent — never destructive.
SET search_path TO accounting;

-- ── Customer master + KYC ────────────────────────────────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_type     text,        -- INDIVIDUAL | BUSINESS
  ADD COLUMN IF NOT EXISTS pan               text,
  ADD COLUMN IF NOT EXISTS date_of_birth     date,
  ADD COLUMN IF NOT EXISTS gender            text,
  ADD COLUMN IF NOT EXISTS whatsapp_number   text,
  ADD COLUMN IF NOT EXISTS alternate_mobile  text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS district          text,
  ADD COLUMN IF NOT EXISTS pincode           text,
  ADD COLUMN IF NOT EXISTS country           text DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS credit_limit      numeric(18,2),
  ADD COLUMN IF NOT EXISTS credit_days       int,
  ADD COLUMN IF NOT EXISTS customer_rating   int,
  ADD COLUMN IF NOT EXISTS opening_balance   numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_status    text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS kyc               jsonb NOT NULL DEFAULT '{}'::jsonb,  -- kyc_status, aadhaar/pan verification, ckyc, risk_category, pep_flag, …
  ADD COLUMN IF NOT EXISTS extra             jsonb NOT NULL DEFAULT '{}'::jsonb;  -- everything else in the field model

-- ── Vendor master ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL,
  name             text NOT NULL,
  contact_person   text,
  gstin            text,
  pan               text,
  msme_number      text,
  phone            text,
  email            text,
  address          text,
  bank_account     text,
  ifsc             text,
  payment_terms    text,
  credit_days      int,
  opening_balance  numeric(18,2) NOT NULL DEFAULT 0,
  vendor_rating    int,
  preferred_payment_method text,
  tax_category     text,
  status           text NOT NULL DEFAULT 'ACTIVE',
  extra            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendors_org_idx ON vendors(org_id, name);

-- ── Inventory master extension ───────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku              text,
  ADD COLUMN IF NOT EXISTS barcode          text,
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS subcategory      text,
  ADD COLUMN IF NOT EXISTS brand            text,
  ADD COLUMN IF NOT EXISTS purchase_price   numeric(18,2),
  ADD COLUMN IF NOT EXISTS mrp              numeric(18,2),
  ADD COLUMN IF NOT EXISTS reorder_level    numeric(18,3),
  ADD COLUMN IF NOT EXISTS reorder_qty      numeric(18,3),
  ADD COLUMN IF NOT EXISTS warehouse        text,
  ADD COLUMN IF NOT EXISTS shelf_location   text,
  ADD COLUMN IF NOT EXISTS extra            jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── Expense management (typed; vouchers stay in ledger service) ──────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  category        text NOT NULL,
  expense_date    date NOT NULL DEFAULT current_date,
  amount          numeric(18,2) NOT NULL,
  tax_amount      numeric(18,2) NOT NULL DEFAULT 0,
  vendor_id       uuid,
  vendor_name     text,
  payment_method  text,
  approved_by     uuid,
  notes           text,
  extra           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_org_idx ON expenses(org_id, expense_date DESC);

-- RLS — standard policy on the new tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['vendors','expenses'] LOOP
    EXECUTE format('ALTER TABLE accounting.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE accounting.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON accounting.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON accounting.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;
