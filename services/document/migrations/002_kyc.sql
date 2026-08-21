-- Professional KYC documents (membership cert, COP, PAN, photo ID, firm reg).
-- Unlike org documents these are scoped to the uploading USER, not an org — a
-- professional has no org during onboarding. Admins (verifiers) may read any.
SET search_path TO document;

CREATE TABLE IF NOT EXISTS kyc_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  type         text NOT NULL,           -- MEMBERSHIP_CERTIFICATE|COP|PAN|PHOTO_ID|FIRM_REGISTRATION
  filename     text NOT NULL,
  content_type text NOT NULL,
  s3_key       text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'PENDING', -- PENDING|UPLOADED
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_documents_user_idx ON kyc_documents(user_id);
