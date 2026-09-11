import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  WOMBAT_FIRM_ID,
  assertWombatFirmId,
  type Job,
  type JobStatus,
  type OpportunityRun,
} from "@wombat/contracts";
import type { BrokerageStore, JobStore, OpportunityRunStore } from "./types.js";

const { Pool } = pg;

export type PgQueryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

function migrationsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../db/migrations");
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    jobId: String(row.job_id),
    firmId: WOMBAT_FIRM_ID,
    kind: row.kind as Job["kind"],
    version: String(row.version),
    status: row.status as Job["status"],
    requestedBy: String(row.requested_by),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    ...(row.started_at ? { startedAt: toIso(row.started_at) } : {}),
    ...(row.finished_at ? { finishedAt: toIso(row.finished_at) } : {}),
    input: row.input,
    ...(row.output !== null && row.output !== undefined ? { output: row.output } : {}),
    ...(row.error !== null && row.error !== undefined ? { error: row.error as Job["error"] } : {}),
    artefacts: (row.artefacts as Job["artefacts"]) ?? [],
    audit: (row.audit as Job["audit"]) ?? [],
    subjectRefs: (row.subject_refs as Job["subjectRefs"]) ?? {},
  };
}

function rowToRun(row: Record<string, unknown>): OpportunityRun {
  return {
    runId: String(row.run_id),
    firmId: WOMBAT_FIRM_ID,
    ranAt: toIso(row.ran_at),
    requestedBy: String(row.requested_by),
    clientPageId: String(row.client_page_id),
    propertyPageId: String(row.property_page_id),
    loanPageId: String(row.loan_page_id),
    currentLenderCode: String(row.current_lender_code),
    targetLenderCode: String(row.target_lender_code),
    loanBalanceAud: Number(row.loan_balance_aud),
    valAud: Number(row.val_aud),
    valDate: toDateOnly(row.val_date),
    valSource: row.val_source as OpportunityRun["valSource"],
    lvr: Number(row.lvr),
    ...(row.current_rate !== null && row.current_rate !== undefined
      ? { currentRate: Number(row.current_rate) }
      : {}),
    ...(row.current_rate_source
      ? { currentRateSource: row.current_rate_source as OpportunityRun["currentRateSource"] }
      : {}),
    ...(row.new_rate !== null && row.new_rate !== undefined ? { newRate: Number(row.new_rate) } : {}),
    savingFlag: row.saving_flag as OpportunityRun["savingFlag"],
    ...(row.delta_bp !== null && row.delta_bp !== undefined ? { deltaBp: Number(row.delta_bp) } : {}),
    valuationJobId: String(row.valuation_job_id),
    pricingJobId: String(row.pricing_job_id),
    matrixJobId: String(row.matrix_job_id),
    artefactUris: (row.artefact_uris as string[]) ?? [],
    ...(row.notes ? { notes: String(row.notes) } : {}),
    ...(row.voided_at ? { voidedAt: toIso(row.voided_at) } : {}),
    ...(row.voidReason || row.void_reason ? { voidReason: String(row.void_reason) } : {}),
  };
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

class PostgresJobStore implements JobStore {
  constructor(private readonly db: PgQueryable) {}

  async create(job: Job): Promise<Job> {
    assertWombatFirmId(job.firmId);
    await this.db.query(
      `INSERT INTO jobs (
        job_id, firm_id, kind, version, status, requested_by,
        created_at, updated_at, started_at, finished_at,
        input, output, error, artefacts, audit, subject_refs
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      )`,
      jobParams(job),
    );
    const stored = await this.get(job.jobId);
    if (!stored) throw new Error("job insert failed");
    return stored;
  }

  async get(jobId: string): Promise<Job | null> {
    const result = await this.db.query(`SELECT * FROM jobs WHERE job_id = $1`, [jobId]);
    const row = result.rows[0];
    return row ? rowToJob(row) : null;
  }

  async update(job: Job): Promise<Job> {
    assertWombatFirmId(job.firmId);
    const result = await this.db.query(
      `UPDATE jobs SET
        firm_id = $2, kind = $3, version = $4, status = $5, requested_by = $6,
        created_at = $7, updated_at = $8, started_at = $9, finished_at = $10,
        input = $11, output = $12, error = $13, artefacts = $14, audit = $15, subject_refs = $16
      WHERE job_id = $1
      RETURNING *`,
      jobParams(job),
    );
    const row = result.rows[0];
    if (!row) throw new Error(`job not found: ${job.jobId}`);
    return rowToJob(row);
  }

  async listByStatus(status: JobStatus, limit = 50): Promise<Job[]> {
    const result = await this.db.query(
      `SELECT * FROM jobs WHERE status = $1 ORDER BY created_at ASC LIMIT $2`,
      [status, limit],
    );
    return result.rows.map(rowToJob);
  }
}

class PostgresOpportunityRunStore implements OpportunityRunStore {
  constructor(private readonly db: PgQueryable) {}

  async append(run: OpportunityRun): Promise<OpportunityRun> {
    assertWombatFirmId(run.firmId);
    await this.db.query(
      `INSERT INTO opportunity_runs (
        run_id, firm_id, ran_at, requested_by,
        client_page_id, property_page_id, loan_page_id,
        current_lender_code, target_lender_code,
        loan_balance_aud, val_aud, val_date, val_source, lvr,
        current_rate, current_rate_source, new_rate, saving_flag, delta_bp,
        valuation_job_id, pricing_job_id, matrix_job_id,
        artefact_uris, notes
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22,
        $23, $24
      )`,
      [
        run.runId,
        WOMBAT_FIRM_ID,
        run.ranAt,
        run.requestedBy,
        run.clientPageId,
        run.propertyPageId,
        run.loanPageId,
        run.currentLenderCode,
        run.targetLenderCode,
        run.loanBalanceAud,
        run.valAud,
        run.valDate,
        run.valSource,
        run.lvr,
        run.currentRate ?? null,
        run.currentRateSource ?? null,
        run.newRate ?? null,
        run.savingFlag,
        run.deltaBp ?? null,
        run.valuationJobId,
        run.pricingJobId,
        run.matrixJobId,
        run.artefactUris,
        run.notes ?? null,
      ],
    );
    const stored = await this.get(run.runId);
    if (!stored) throw new Error("opportunity run insert failed");
    return stored;
  }

  async get(runId: string): Promise<OpportunityRun | null> {
    const result = await this.db.query(`SELECT * FROM opportunity_runs WHERE run_id = $1`, [runId]);
    const row = result.rows[0];
    return row ? rowToRun(row) : null;
  }

  async voidRun(runId: string, reason: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE opportunity_runs SET voided_at = now(), void_reason = $2 WHERE run_id = $1`,
      [runId, reason],
    );
    if (result.rows.length === 0) {
      // node-pg UPDATE without RETURNING still has rowCount on the result; handle both.
    }
  }
}

function jobParams(job: Job): unknown[] {
  return [
    job.jobId,
    WOMBAT_FIRM_ID,
    job.kind,
    job.version,
    job.status,
    job.requestedBy,
    job.createdAt,
    job.updatedAt,
    job.startedAt ?? null,
    job.finishedAt ?? null,
    job.input,
    job.output ?? null,
    job.error ?? null,
    JSON.stringify(job.artefacts),
    JSON.stringify(job.audit),
    JSON.stringify(job.subjectRefs),
  ];
}

export function createPostgresStore(db: PgQueryable): BrokerageStore {
  return {
    jobs: new PostgresJobStore(db),
    opportunityRuns: new PostgresOpportunityRunStore(db),
  };
}

export function createPgPool(databaseUrl: string): pg.Pool {
  return new Pool({ connectionString: databaseUrl });
}

export async function applyMigrations(db: PgQueryable, dir = migrationsDir()): Promise<string[]> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const applied: string[] = [];

  for (const file of files) {
    const existing = await db.query(`SELECT id FROM schema_migrations WHERE id = $1`, [file]);
    if (existing.rows[0]) continue;
    const sql = readFileSync(path.join(dir, file), "utf8");
    await db.query(sql);
    await db.query(`INSERT INTO schema_migrations (id) VALUES ($1)`, [file]);
    applied.push(file);
  }

  return applied;
}
