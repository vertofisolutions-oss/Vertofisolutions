-- auth service schema (see docs/05-data-model.md, docs/06-authentication-and-otp.md)
SET search_path TO auth;

CREATE TABLE IF NOT EXISTS users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text UNIQUE,
  mobile              text UNIQUE,
  password_hash       text,
  role                text NOT NULL,                 -- see Role union in @vertofi/tenancy
  professional_type   text,                          -- CA|CMA|CPA|CS|ACCA|CFA
  org_id              uuid,
  parent_associate_id uuid,
  plan                text DEFAULT 'STARTER',
  status              text NOT NULL DEFAULT 'PENDING',-- PENDING|ACTIVE|LOCKED|DISABLED
  email_verified      boolean NOT NULL DEFAULT false,
  mobile_verified     boolean NOT NULL DEFAULT false,
  mfa_enabled         boolean NOT NULL DEFAULT false,
  mfa_secret          text,
  last_login_at       timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family        uuid NOT NULL,                        -- refresh-token family for reuse detection
  device_id     text,
  ip            text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,
  channel       text NOT NULL,                        -- MOBILE|EMAIL|WHATSAPP|TOTP
  purpose       text NOT NULL,                        -- LOGIN|REGISTER|EMAIL_VERIFY|RESET|FINANCIAL|DOCUMENT|MFA
  destination   text NOT NULL,                        -- mobile/email the code went to
  code_hash     text NOT NULL,
  attempts      int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 5,
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_lookup_idx ON otp_challenges(id) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS login_attempts (
  id          bigserial PRIMARY KEY,
  identifier  text NOT NULL,                          -- email/mobile attempted
  ip          text,
  success     boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_idx ON login_attempts(identifier, created_at);

-- transactional outbox (see docs/18)
CREATE TABLE IF NOT EXISTS outbox (
  id           uuid PRIMARY KEY,
  envelope     jsonb NOT NULL,
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
