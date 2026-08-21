-- V3 enterprise onboarding: one jsonb document keyed by section
-- (business, registration, owner, tax, banking, accounting, documents,
--  whatsapp, team, review). Additive + idempotent — never destructive.
ALTER TABLE onboarding.onboarding_profiles
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '{}'::jsonb;
