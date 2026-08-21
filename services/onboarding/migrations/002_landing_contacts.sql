CREATE TABLE IF NOT EXISTS onboarding.landing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for sorting descending by date
CREATE INDEX IF NOT EXISTS landing_contacts_created_at_idx ON onboarding.landing_contacts(created_at DESC);
