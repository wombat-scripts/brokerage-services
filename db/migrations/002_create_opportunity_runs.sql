-- Append-only Opportunity Run history. Source of truth for matrix cells.
-- Numeric / identity fields must not be updated; void via voided_at + reason only.

CREATE TABLE IF NOT EXISTS opportunity_runs (
  run_id TEXT PRIMARY KEY,
  firm_id TEXT NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL,
  requested_by TEXT NOT NULL,
  client_page_id TEXT NOT NULL,
  property_page_id TEXT NOT NULL,
  loan_page_id TEXT NOT NULL,
  current_lender_code TEXT NOT NULL,
  target_lender_code TEXT NOT NULL,
  loan_balance_aud NUMERIC NOT NULL,
  val_aud NUMERIC NOT NULL,
  val_date DATE NOT NULL,
  val_source TEXT NOT NULL,
  lvr NUMERIC NOT NULL,
  current_rate NUMERIC,
  current_rate_source TEXT,
  new_rate NUMERIC,
  saving_flag TEXT NOT NULL,
  delta_bp NUMERIC,
  valuation_job_id TEXT NOT NULL,
  pricing_job_id TEXT NOT NULL,
  matrix_job_id TEXT NOT NULL,
  artefact_uris TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_runs_firm_id_phase1 CHECK (firm_id = 'wombat'),
  CONSTRAINT opportunity_runs_saving_flag_check CHECK (
    saving_flag IN ('yes', 'no', 'unknown')
  ),
  CONSTRAINT opportunity_runs_void_pair CHECK (
    (voided_at IS NULL AND void_reason IS NULL)
    OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS opportunity_runs_loan_ran_idx
  ON opportunity_runs (loan_page_id, ran_at DESC);

CREATE INDEX IF NOT EXISTS opportunity_runs_matrix_job_idx
  ON opportunity_runs (matrix_job_id);

CREATE OR REPLACE FUNCTION forbid_opportunity_run_mutate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.run_id IS DISTINCT FROM OLD.run_id
    OR NEW.firm_id IS DISTINCT FROM OLD.firm_id
    OR NEW.ran_at IS DISTINCT FROM OLD.ran_at
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.client_page_id IS DISTINCT FROM OLD.client_page_id
    OR NEW.property_page_id IS DISTINCT FROM OLD.property_page_id
    OR NEW.loan_page_id IS DISTINCT FROM OLD.loan_page_id
    OR NEW.current_lender_code IS DISTINCT FROM OLD.current_lender_code
    OR NEW.target_lender_code IS DISTINCT FROM OLD.target_lender_code
    OR NEW.loan_balance_aud IS DISTINCT FROM OLD.loan_balance_aud
    OR NEW.val_aud IS DISTINCT FROM OLD.val_aud
    OR NEW.val_date IS DISTINCT FROM OLD.val_date
    OR NEW.val_source IS DISTINCT FROM OLD.val_source
    OR NEW.lvr IS DISTINCT FROM OLD.lvr
    OR NEW.current_rate IS DISTINCT FROM OLD.current_rate
    OR NEW.current_rate_source IS DISTINCT FROM OLD.current_rate_source
    OR NEW.new_rate IS DISTINCT FROM OLD.new_rate
    OR NEW.saving_flag IS DISTINCT FROM OLD.saving_flag
    OR NEW.delta_bp IS DISTINCT FROM OLD.delta_bp
    OR NEW.valuation_job_id IS DISTINCT FROM OLD.valuation_job_id
    OR NEW.pricing_job_id IS DISTINCT FROM OLD.pricing_job_id
    OR NEW.matrix_job_id IS DISTINCT FROM OLD.matrix_job_id
    OR NEW.artefact_uris IS DISTINCT FROM OLD.artefact_uris
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'opportunity_runs is append-only; void via voided_at + void_reason';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opportunity_runs_append_only ON opportunity_runs;
CREATE TRIGGER opportunity_runs_append_only
  BEFORE UPDATE ON opportunity_runs
  FOR EACH ROW
  EXECUTE FUNCTION forbid_opportunity_run_mutate();
