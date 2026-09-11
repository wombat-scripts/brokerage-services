import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyMigrations,
  createPgPool,
  createPostgresStore,
  resetPostgresData,
  seedPraiNabDeskFixtures,
} from "@wombat/store";
import { createApi } from "./app.js";
import { expectCrossFirmIsolation, expectPraiNabDeskReads } from "./desk-api.cases.js";

const databaseUrl = process.env.DATABASE_URL;

describe("CI Postgres requirement", () => {
  it("fails CI if DATABASE_URL is missing so list/get cannot skip", () => {
    if (process.env.CI) {
      expect(databaseUrl, "CI must set DATABASE_URL so Postgres Desk list/get is tested").toBeTruthy();
    }
  });
});

describe.skipIf(!databaseUrl)("Desk read APIs against Postgres", () => {
  let pool: ReturnType<typeof createPgPool>;

  beforeAll(async () => {
    pool = createPgPool(databaseUrl!);
    await applyMigrations(pool);
  });

  beforeEach(async () => {
    await resetPostgresData(pool);
    await seedPraiNabDeskFixtures(createPostgresStore(pool));
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("lists and gets Opportunity Runs and jobs from real Postgres", async () => {
    const app = createApi(createPostgresStore(pool));
    await expectPraiNabDeskReads(app);
  });

  it("404s the wrong firm and unknown runId (no empty-list leak)", async () => {
    const app = createApi(createPostgresStore(pool));
    await expectCrossFirmIsolation(app);
  });

  it("does not return another firm's rows from list/get even if they exist", async () => {
    try {
      await pool.query(`ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_firm_id_phase1`);
      await pool.query(`ALTER TABLE opportunity_runs DROP CONSTRAINT IF EXISTS opportunity_runs_firm_id_phase1`);
      await pool.query(
        `INSERT INTO jobs (
          job_id, firm_id, kind, version, status, requested_by,
          created_at, updated_at, input, artefacts, audit, subject_refs
        ) VALUES (
          'job_acme_secret', 'acme', 'valuation.lender', '0.1.0', 'succeeded', 'seat:acme',
          now(), now(), '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb
        )`,
      );
      await pool.query(
        `INSERT INTO opportunity_runs (
          run_id, firm_id, ran_at, requested_by,
          client_page_id, property_page_id, loan_page_id,
          current_lender_code, target_lender_code,
          loan_balance_aud, val_aud, val_date, val_source, lvr,
          saving_flag, valuation_job_id, pricing_job_id, matrix_job_id
        ) VALUES (
          '01JACMESECRET000001', 'acme', now(), 'seat:acme',
          'client_acme', 'property_acme', 'loan_acme',
          'CBA', 'CBA',
          100000, 200000, '2026-09-11', 'other', 0.5,
          'no', 'job_acme_secret', 'job_acme_secret', 'job_acme_secret'
        )`,
      );

      const store = createPostgresStore(pool);
      const wombatJobs = await store.jobs.list({ firmId: "wombat" });
      expect(wombatJobs.map((job) => job.jobId)).not.toContain("job_acme_secret");
      expect(await store.jobs.get("job_acme_secret", "wombat")).toBeNull();

      const wombatRuns = await store.opportunityRuns.list({ firmId: "wombat" });
      expect(wombatRuns.map((run) => run.runId)).not.toContain("01JACMESECRET000001");
      expect(await store.opportunityRuns.get("01JACMESECRET000001", "wombat")).toBeNull();

      const app = createApi(store);
      const list = await app.request("/v1/firms/wombat/jobs");
      expect(list.status).toBe(200);
      const ids = ((await list.json()) as { jobs: Array<{ jobId: string }> }).jobs.map((job) => job.jobId);
      expect(ids).not.toContain("job_acme_secret");

      expect((await app.request("/v1/firms/wombat/jobs/job_acme_secret")).status).toBe(404);
      expect((await app.request("/v1/firms/acme/jobs")).status).toBe(404);
      expect((await app.request("/v1/firms/acme/opportunity-runs/01JACMESECRET000001")).status).toBe(404);
      expect((await app.request("/v1/firms/wombat/jobs?runId=01JACMESECRET000001")).status).toBe(404);
    } finally {
      await pool.query(`DELETE FROM opportunity_runs WHERE firm_id <> 'wombat'`);
      await pool.query(`DELETE FROM jobs WHERE firm_id <> 'wombat'`);
      await pool.query(`ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_firm_id_phase1`);
      await pool.query(`ALTER TABLE jobs ADD CONSTRAINT jobs_firm_id_phase1 CHECK (firm_id = 'wombat')`);
      await pool.query(`ALTER TABLE opportunity_runs DROP CONSTRAINT IF EXISTS opportunity_runs_firm_id_phase1`);
      await pool.query(
        `ALTER TABLE opportunity_runs ADD CONSTRAINT opportunity_runs_firm_id_phase1 CHECK (firm_id = 'wombat')`,
      );
    }
  });
});
