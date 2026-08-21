-- audit service schema — the Financial Black Box (docs/11 #13, docs/15).
-- Append-only + hash-chained for tamper evidence.
SET search_path TO audit;

CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid          NOT NULL,
  seq             bigserial,
  org_id          uuid,
  actor_id        uuid,
  event           text NOT NULL,
  correlation_id  uuid,
  payload         jsonb NOT NULL,
  approval_otp_id uuid,
  prev_hash       text,
  hash            text NOT NULL,
  occurred_at     timestamptz NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, recorded_at)        -- must include partition key
) PARTITION BY RANGE (recorded_at);

-- Initial monthly partitions are created by a maintenance job in production.
-- A catch-all default partition keeps local dev simple.
CREATE TABLE IF NOT EXISTS audit_log_default PARTITION OF audit_log DEFAULT;

CREATE INDEX IF NOT EXISTS audit_org_idx ON audit_log (org_id, recorded_at);
CREATE INDEX IF NOT EXISTS audit_corr_idx ON audit_log (correlation_id);

-- Block updates/deletes at the DB level (append-only).
CREATE OR REPLACE FUNCTION audit.forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_no_update ON audit_log;
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit.forbid_mutation();
