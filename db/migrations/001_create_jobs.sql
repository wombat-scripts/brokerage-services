-- Job bus. Status updates are allowed; this is not append-only.
-- Host this table in AU (Neon / Supabase Sydney) for residency.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  firm_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  input JSONB NOT NULL,
  output JSONB,
  error JSONB,
  artefacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT jobs_firm_id_phase1 CHECK (firm_id = 'wombat'),
  CONSTRAINT jobs_status_check CHECK (
    status IN (
      'queued',
      'running',
      'awaiting_attended_mfa',
      'succeeded',
      'failed',
      'cancelled'
    )
  )
);

CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON jobs (status, created_at);
CREATE INDEX IF NOT EXISTS jobs_firm_kind_idx ON jobs (firm_id, kind);
