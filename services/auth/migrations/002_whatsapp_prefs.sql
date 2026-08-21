-- WhatsApp preference columns (see services/whatsapp).
-- Referenced by:
--   * notification.consumer.ts  → COALESCE(u.wa_notifications_enabled, true)
--   * onboarding.ts (briefing)  → WHERE u.wa_briefing_opt_in = true
-- Without these columns every proactive WhatsApp notification + the daily
-- briefing query throws "column does not exist" and silently sends nothing.
SET search_path TO auth;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wa_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS wa_briefing_opt_in       boolean NOT NULL DEFAULT false;
