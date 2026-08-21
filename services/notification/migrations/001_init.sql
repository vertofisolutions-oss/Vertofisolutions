-- notification service schema (docs/08)
CREATE SCHEMA IF NOT EXISTS notification;
SET search_path TO notification;

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid,
  user_id    uuid NOT NULL,
  channel    text NOT NULL DEFAULT 'IN_APP',  -- IN_APP|EMAIL|SMS|WHATSAPP
  template   text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}',
  severity   text NOT NULL DEFAULT 'INFO',     -- INFO|WARNING|CRITICAL
  status     text NOT NULL DEFAULT 'PENDING',  -- PENDING|SENT|READ|FAILED
  read_at    timestamptz,
  sent_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id) WHERE read_at IS NULL;
