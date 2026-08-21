-- Dynamic WhatsApp ↔ Vertofi account linking. A user's registered mobile and
-- the wizard's WhatsApp number auto-link; this table holds EXPLICIT links for
-- any other number, created via the in-chat code flow. Additive + idempotent.
CREATE TABLE IF NOT EXISTS auth.whatsapp_links (
  wa_number  text PRIMARY KEY,            -- 10-digit Indian mobile
  user_id    uuid NOT NULL,
  linked_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_links_user_idx ON auth.whatsapp_links(user_id);
