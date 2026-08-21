-- prediction schema — Predictive Tax Warnings + ProfitLeak Finder (docs/11 #2,#4)
CREATE SCHEMA IF NOT EXISTS prediction;
SET search_path TO prediction;

CREATE TABLE IF NOT EXISTS profit_leaks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  type       text NOT NULL,                 -- DUPLICATE|SUBSCRIPTION_WASTE|HIGH_SPEND|UNCLAIMED_ITC
  amount     numeric(18,2) NOT NULL DEFAULT 0,
  evidence   jsonb NOT NULL DEFAULT '{}',
  status     text NOT NULL DEFAULT 'OPEN',  -- OPEN|DISMISSED|FIXED
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leaks_org_idx ON profit_leaks(org_id, status);

CREATE TABLE IF NOT EXISTS predictions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  type       text NOT NULL,                 -- TAX_WARNING|CASHFLOW_RISK
  horizon    text,
  payload    jsonb NOT NULL DEFAULT '{}',
  confidence numeric(4,3),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS predictions_org_idx ON predictions(org_id, created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profit_leaks','predictions'] LOOP
    EXECUTE format('ALTER TABLE prediction.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE prediction.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant ON prediction.%I', t, t);
    EXECUTE format($p$CREATE POLICY %I_tenant ON prediction.%I USING (
      current_setting('app.current_org_ids', true) = '*'
      OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')))$p$, t, t);
  END LOOP;
END $$;
