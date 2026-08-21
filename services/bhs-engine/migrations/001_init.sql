-- bhs-engine schema — Business Health Score (docs/11 #1)
CREATE SCHEMA IF NOT EXISTS bhs;
SET search_path TO bhs;

CREATE TABLE IF NOT EXISTS bhs_scores (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  score       int,                          -- 0–100, null when insufficient data
  sub_scores  jsonb NOT NULL DEFAULT '{}',
  rating      text,                          -- EXCELLENT|HEALTHY|NEEDS_ATTENTION|AT_RISK|INSUFFICIENT
  computed_at timestamptz NOT NULL DEFAULT now(),
  -- A partitioned table's PRIMARY KEY must include the partition key (computed_at).
  PRIMARY KEY (id, computed_at)
) PARTITION BY RANGE (computed_at);
CREATE TABLE IF NOT EXISTS bhs_scores_default PARTITION OF bhs_scores DEFAULT;
CREATE INDEX IF NOT EXISTS bhs_org_idx ON bhs_scores(org_id, computed_at DESC);

ALTER TABLE bhs_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhs_scores FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bhs_tenant ON bhs_scores;
CREATE POLICY bhs_tenant ON bhs_scores USING (
  current_setting('app.current_org_ids', true) = '*'
  OR org_id::text = ANY (string_to_array(current_setting('app.current_org_ids', true), ',')));

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY, envelope jsonb NOT NULL,
  published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox(created_at) WHERE published_at IS NULL;
