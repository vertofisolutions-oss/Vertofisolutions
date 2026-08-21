-- Unified document record: lifecycle status, PDF url, WhatsApp delivery status,
-- and an embedded audit trail + approval history on every generated document.
SET search_path TO accounting;

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'CREATED',  -- CREATED|APPROVED|SENT|CANCELLED
  ADD COLUMN IF NOT EXISTS pdf_url          text,
  ADD COLUMN IF NOT EXISTS whatsapp_status  text,                              -- PENDING|SENT|DELIVERED|FAILED
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS audit_trail      jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{action,by,at,meta}]
  ADD COLUMN IF NOT EXISTS approval_history jsonb NOT NULL DEFAULT '[]'::jsonb;
