-- Comprehensive inventory: warehouses, categories, batches, a full stock ledger
-- (typed movements + running balance + valuation), and product valuation fields.
-- Stock auto-moves on sales (OUT) and purchases (IN) from the service layer.
SET search_path TO accounting;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS valuation_method text NOT NULL DEFAULT 'WAVG',  -- WAVG|FIFO
  ADD COLUMN IF NOT EXISTS avg_cost         numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_stock    numeric(18,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warehouse_id     uuid,
  ADD COLUMN IF NOT EXISTS track_batches    boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS warehouses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  name       text NOT NULL,
  code       text,
  address    text,
  city       text,
  state      text,
  pincode    text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS warehouses_org_idx ON warehouses(org_id, name);

CREATE TABLE IF NOT EXISTS product_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  name       text NOT NULL,
  parent     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  product_id   uuid NOT NULL,
  batch_no     text NOT NULL,
  expiry_date  date,
  qty          numeric(18,3) NOT NULL DEFAULT 0,
  cost         numeric(18,4) NOT NULL DEFAULT 0,
  warehouse_id uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_batches_product_idx ON stock_batches(org_id, product_id);

-- The stock ledger: every movement, typed, with the running balance + value
-- after it. This is the audit-grade source of truth for stock + valuation.
CREATE TABLE IF NOT EXISTS stock_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  product_id    uuid NOT NULL,
  warehouse_id  uuid,
  batch_id      uuid,
  movement_type text NOT NULL,   -- OPENING|PURCHASE|SALE|ADJUSTMENT|TRANSFER|RETURN
  direction     text NOT NULL,   -- IN|OUT
  qty           numeric(18,3) NOT NULL,
  rate          numeric(18,4) NOT NULL DEFAULT 0,
  value         numeric(18,2) NOT NULL DEFAULT 0,
  balance_qty   numeric(18,3) NOT NULL DEFAULT 0,
  ref_type      text,            -- SALE_INVOICE|PURCHASE_INVOICE|MANUAL|TRANSFER
  ref_id        uuid,
  note          text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_ledger_product_idx ON stock_ledger(org_id, product_id, created_at DESC);

-- RLS — standard tenant policy on every new table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['warehouses','product_categories','stock_batches','stock_ledger'] LOOP
    EXECUTE format('ALTER TABLE accounting.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE accounting.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON accounting.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON accounting.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;
