-- Professional (CA/CMA/CS/CPA/ACCA/CFA) self-registration profiles + KYC review.
-- A professional signs up self-serve (role ASSOCIATE, status PENDING_VERIFICATION),
-- supplies their statutory credentials, uploads documents, and an admin verifies
-- them before the account goes ACTIVE and can be assigned to clients.
SET search_path TO auth;

CREATE TABLE IF NOT EXISTS professional_profiles (
  user_id              uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  professional_type    text NOT NULL,            -- CA|CMA|CPA|CS|ACCA|CFA
  full_name            text,
  membership_no        text,                     -- ICAI/ICMAI/ICSI membership number
  cop_no               text,                     -- Certificate of Practice number
  firm_name            text,
  firm_registration_no text,
  years_experience     integer,
  specializations      text[],
  office_address       text,
  city                 text,
  state                text,
  pincode              text,
  verification_status  text NOT NULL DEFAULT 'PENDING_VERIFICATION', -- PENDING_VERIFICATION|VERIFIED|REJECTED
  verification_note    text,
  verified_by          uuid,
  verified_at          timestamptz,
  documents            jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{type,filename,documentId,status}]
  extra                jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS professional_profiles_status_idx
  ON professional_profiles(verification_status);
