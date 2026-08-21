-- Legally-auditable Terms & Conditions / Privacy Policy acceptance (fintech).
-- Versioned documents + an append-only acceptance ledger with evidence.
SET search_path TO legal;

-- Versioned legal documents. A new version (re-)triggers acceptance.
CREATE TABLE IF NOT EXISTS legal_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type     text NOT NULL,                 -- TERMS | PRIVACY
  version      text NOT NULL,                 -- e.g. '1.0'
  title        text NOT NULL,
  url          text,                          -- canonical URL of the document
  content_hash text NOT NULL,                 -- integrity hash of the published text
  effective_at timestamptz NOT NULL DEFAULT now(),
  published    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, version)
);
CREATE INDEX IF NOT EXISTS legal_docs_current_idx ON legal_documents(doc_type, effective_at DESC) WHERE published;

-- Append-only acceptance ledger — the legal proof. Never updated or deleted, so
-- the full history (who accepted which exact version, when, from where) is kept.
CREATE TABLE IF NOT EXISTS document_acceptances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  org_id      uuid,
  document_id uuid NOT NULL REFERENCES legal_documents(id),
  doc_type    text NOT NULL,
  version     text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip          text,                           -- evidence
  user_agent  text,                           -- evidence
  method      text NOT NULL DEFAULT 'CHECKBOX'
);
CREATE INDEX IF NOT EXISTS doc_accept_user_idx ON document_acceptances(user_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS doc_accept_org_idx ON document_acceptances(org_id);

-- Seed the initial published versions (idempotent).
INSERT INTO legal_documents (doc_type, version, title, url, content_hash, effective_at, published)
VALUES
  ('TERMS',   '1.0', 'Vertofi Terms & Conditions', 'https://vertofi.com/legal/terms',   'sha256:seed-terms-1.0',   now(), true),
  ('PRIVACY', '1.0', 'Vertofi Privacy Policy',      'https://vertofi.com/legal/privacy', 'sha256:seed-privacy-1.0', now(), true)
ON CONFLICT (doc_type, version) DO NOTHING;
