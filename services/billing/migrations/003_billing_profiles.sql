-- Billing/tax profile per org — collected before checkout for GST tax invoices
-- and RBI-mandated auto-debit notices (docs/04, docs/09). One row per org.
SET search_path TO billing;

CREATE TABLE IF NOT EXISTS billing_profiles (
  org_id       uuid PRIMARY KEY,
  legal_name   text,
  gstin        text,                         -- 15-char GSTIN (optional; B2C may not have one)
  email        text,                         -- billing contact (RBI pre-debit notice)
  phone        text,                         -- billing contact (UPI AutoPay notice)
  address_line text,
  city         text,
  state        text,
  pincode      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
