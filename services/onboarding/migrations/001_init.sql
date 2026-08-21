-- onboarding service schema (docs/07). RLS-scoped by org_id.
SET search_path TO onboarding;

CREATE TABLE IF NOT EXISTS onboarding_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL UNIQUE,
  stage               int  NOT NULL DEFAULT 1,          -- 1=registration 2=financial 3=intelligence
  completeness        int  NOT NULL DEFAULT 0,          -- 0–100 %
  financial_maturity  text,                             -- LOW|MEDIUM|HIGH
  compliance_risk     text,                             -- LOW|MEDIUM|HIGH
  cashflow_risk       text,                             -- LOW|MEDIUM|HIGH
  confidence_score    int,                              -- 0–100
  selected_professional_id uuid,                        -- chosen CA/CMA/... associate
  stage1              jsonb NOT NULL DEFAULT '{}',
  stage2              jsonb NOT NULL DEFAULT '{}',
  stage3              jsonb NOT NULL DEFAULT '{}',
  risk_answers        jsonb NOT NULL DEFAULT '{}',
  existing_software   jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS onboarding_profiles_tenant ON onboarding_profiles;
CREATE POLICY onboarding_profiles_tenant ON onboarding_profiles
  USING (
    current_setting('app.current_org_ids', true) = '*'
    OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ','))
  );

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
