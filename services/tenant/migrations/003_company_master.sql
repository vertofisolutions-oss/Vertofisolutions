-- Company master expansion (docs/27 field model). Typed columns for what code
-- reads + profile jsonb catch-all. Additive + idempotent — never destructive.
ALTER TABLE tenant.organizations
  ADD COLUMN IF NOT EXISTS company_name        text,   -- display name if ≠ legal_name
  ADD COLUMN IF NOT EXISTS incorporation_date  date,
  ADD COLUMN IF NOT EXISTS fy_start_month      int DEFAULT 4,    -- April (Indian FY)
  ADD COLUMN IF NOT EXISTS registered_address  text,
  ADD COLUMN IF NOT EXISTS corporate_address   text,
  ADD COLUMN IF NOT EXISTS state               text,
  ADD COLUMN IF NOT EXISTS country             text DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS pincode             text,
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS alternate_phone     text,
  ADD COLUMN IF NOT EXISTS email               text,
  ADD COLUMN IF NOT EXISTS website             text,
  ADD COLUMN IF NOT EXISTS authorized_signatory text,
  ADD COLUMN IF NOT EXISTS director_names      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_currency    text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS timezone            text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS business_category   text,
  ADD COLUMN IF NOT EXISTS company_status      text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS accounting_method   text NOT NULL DEFAULT 'ACCRUAL',
  ADD COLUMN IF NOT EXISTS gst_registration_type text,   -- REGULAR | COMPOSITION | UNREGISTERED
  ADD COLUMN IF NOT EXISTS iec_code            text,
  ADD COLUMN IF NOT EXISTS pf_registration     text,
  ADD COLUMN IF NOT EXISTS esi_registration    text,
  ADD COLUMN IF NOT EXISTS dsc_details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile             jsonb NOT NULL DEFAULT '{}'::jsonb; -- catch-all for the rest of the field model
