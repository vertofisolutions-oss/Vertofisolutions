-- Accounting Workspace (docs/11 #15 Zero-Data-Entry). Customers, products,
-- sales/purchase invoices, inventory. All tenant-scoped with RLS.
CREATE SCHEMA IF NOT EXISTS accounting;
SET search_path TO accounting;

CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  name       text NOT NULL,
  gstin      text,
  state      text,
  address    text,
  phone      text,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_org_idx ON customers(org_id, name);

CREATE TABLE IF NOT EXISTS products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  name       text NOT NULL,
  hsn        text,
  unit       text DEFAULT 'NOS',
  rate       numeric(18,2) NOT NULL DEFAULT 0,
  tax_rate   numeric(5,2) NOT NULL DEFAULT 18,
  stock      numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_org_idx ON products(org_id, name);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL,
  invoice_no    text,
  customer_id   uuid,
  customer_name text,
  date          date NOT NULL DEFAULT current_date,
  items         jsonb NOT NULL DEFAULT '[]',
  taxable       numeric(18,2) NOT NULL DEFAULT 0,
  cgst          numeric(18,2) NOT NULL DEFAULT 0,
  sgst          numeric(18,2) NOT NULL DEFAULT 0,
  igst          numeric(18,2) NOT NULL DEFAULT 0,
  total         numeric(18,2) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'DRAFT',   -- DRAFT|ISSUED|PAID
  source        text NOT NULL DEFAULT 'FORM',    -- FORM|SMART|AI|WHATSAPP
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_org_idx ON sales_invoices(org_id, date DESC);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  bill_no      text,
  vendor_name  text,
  vendor_gstin text,
  date         date NOT NULL DEFAULT current_date,
  items        jsonb NOT NULL DEFAULT '[]',
  taxable      numeric(18,2) NOT NULL DEFAULT 0,
  cgst         numeric(18,2) NOT NULL DEFAULT 0,
  sgst         numeric(18,2) NOT NULL DEFAULT 0,
  igst         numeric(18,2) NOT NULL DEFAULT 0,
  total        numeric(18,2) NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'RECORDED',
  source       text NOT NULL DEFAULT 'FORM',
  document_id  uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchase_org_idx ON purchase_invoices(org_id, date DESC);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  product_id uuid NOT NULL,
  direction  text NOT NULL,                    -- IN|OUT
  qty        numeric(18,2) NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inv_org_idx ON inventory_movements(org_id, created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','products','sales_invoices','purchase_invoices','inventory_movements'] LOOP
    EXECUTE format('ALTER TABLE accounting.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE accounting.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON accounting.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON accounting.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
