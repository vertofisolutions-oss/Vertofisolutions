-- billing service schema (docs/05, docs/11 plan gating)
SET search_path TO billing;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL,
  plan               text NOT NULL DEFAULT 'STARTER',  -- STARTER|GROWTH|PRO|ENTERPRISE
  period             text NOT NULL DEFAULT 'MONTHLY',  -- MONTHLY|QUARTERLY|HALF_YEARLY|YEARLY
  amount             numeric(18,2) NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'TRIAL',    -- TRIAL|PENDING|ACTIVE|PAST_DUE|CANCELLED
  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  gateway_ref        text,                             -- Razorpay order/subscription id
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_org_idx ON subscriptions(org_id);

CREATE TABLE IF NOT EXISTS usage_counters (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id  uuid NOT NULL,
  metric  text NOT NULL,                                -- INVOICES|OCR_SCANS|USERS|AI_CALLS|...
  period  text NOT NULL,                                -- YYYY-MM
  used    bigint NOT NULL DEFAULT 0,
  limit_v bigint NOT NULL,
  UNIQUE (org_id, metric, period)
);

CREATE TABLE IF NOT EXISTS payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  gateway_ref  text NOT NULL,
  amount       numeric(18,2) NOT NULL,
  status       text NOT NULL,                            -- CAPTURED|FAILED|REFUNDED
  raw          jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_org_idx ON payments(org_id, created_at);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
