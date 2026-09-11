import { Hono } from "hono";
import { z } from "zod";
import {
  WOMBAT_FIRM_ID,
  deskJobListQuerySchema,
  deskOpportunityRunListQuerySchema,
  jobKindSchema,
  subjectRefsSchema,
  type CrmWriteBackAdapter,
} from "@wombat/contracts";
import type { BrokerageStore } from "@wombat/store";
import { newJob, processJob } from "@wombat/worker";
import { authorizeDeskRequest, type DeskAuthConfig } from "./auth.js";

const createJobBodySchema = z.object({
  kind: jobKindSchema,
  requestedBy: z.string().min(1),
  firmId: z.literal(WOMBAT_FIRM_ID).optional(),
  input: z.record(z.unknown()),
  subjectRefs: subjectRefsSchema.optional(),
});

function firmNotFound() {
  return { error: { message: "firm not found" } };
}

function requireWombatFirm(firmId: string): firmId is typeof WOMBAT_FIRM_ID {
  return firmId === WOMBAT_FIRM_ID;
}

function jobLinkedToRun(
  job: { jobId: string; output?: unknown },
  run: { valuationJobId: string; pricingJobId: string; matrixJobId: string; runId: string },
): boolean {
  if (
    job.jobId === run.valuationJobId ||
    job.jobId === run.pricingJobId ||
    job.jobId === run.matrixJobId
  ) {
    return true;
  }
  const output = job.output as { opportunityRunId?: string } | undefined;
  return output?.opportunityRunId === run.runId;
}

async function createFirmJob(
  store: BrokerageStore,
  crm: CrmWriteBackAdapter | undefined,
  body: z.infer<typeof createJobBodySchema>,
) {
  const input = {
    ...body.input,
    firmId: WOMBAT_FIRM_ID,
  };
  let job = await store.jobs.create(
    newJob({
      kind: body.kind,
      requestedBy: body.requestedBy,
      input,
      subjectRefs: body.subjectRefs,
    }),
  );
  if (process.env.INLINE_WORKER === "true" && crm) {
    job = await processJob(job, store, crm);
  }
  return job;
}

export function createApi(
  store: BrokerageStore,
  crm?: CrmWriteBackAdapter,
  auth: DeskAuthConfig = {},
) {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      ok: true,
      firmId: WOMBAT_FIRM_ID,
      service: "brokerage-services",
    }),
  );

  app.use("*", async (c, next) => {
    if (c.req.path === "/health") {
      return next();
    }
    const authorized = authorizeDeskRequest(c, auth);
    if (!authorized.ok) {
      return c.json({ error: { message: authorized.message } }, authorized.status);
    }
    return next();
  });

  app.post("/jobs", async (c) => {
    const parsed = createJobBodySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const job = await createFirmJob(store, crm, parsed.data);
    return c.json({ job }, 201);
  });

  app.get("/jobs/:jobId", async (c) => {
    const job = await store.jobs.get(c.req.param("jobId"), WOMBAT_FIRM_ID);
    if (!job) {
      return c.json({ error: { message: "job not found" } }, 404);
    }
    return c.json({
      jobId: job.jobId,
      kind: job.kind,
      status: job.status,
      firmId: job.firmId,
      error: job.error,
      output: job.output,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    });
  });

  app.post("/v1/firms/:firmId/jobs", async (c) => {
    const firmId = c.req.param("firmId");
    if (!requireWombatFirm(firmId)) {
      return c.json(firmNotFound(), 404);
    }
    const parsed = createJobBodySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    if (parsed.data.firmId && parsed.data.firmId !== firmId) {
      return c.json({ error: { message: "firmId mismatch" } }, 400);
    }
    const job = await createFirmJob(store, crm, parsed.data);
    return c.json({ firmId, job }, 201);
  });

  app.get("/v1/firms/:firmId/opportunity-runs", async (c) => {
    const firmId = c.req.param("firmId");
    if (!requireWombatFirm(firmId)) {
      return c.json(firmNotFound(), 404);
    }
    const parsed = deskOpportunityRunListQuerySchema.safeParse({
      client: c.req.query("client") || undefined,
      status: c.req.query("status") || undefined,
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const opportunityRuns = await store.opportunityRuns.list({
      firmId,
      ...parsed.data,
    });
    return c.json({ firmId, opportunityRuns });
  });

  app.get("/v1/firms/:firmId/opportunity-runs/:runId", async (c) => {
    const firmId = c.req.param("firmId");
    if (!requireWombatFirm(firmId)) {
      return c.json(firmNotFound(), 404);
    }
    const opportunityRun = await store.opportunityRuns.get(c.req.param("runId"), firmId);
    if (!opportunityRun) {
      return c.json({ error: { message: "opportunity run not found" } }, 404);
    }
    return c.json({ firmId, opportunityRun });
  });

  app.get("/v1/firms/:firmId/jobs", async (c) => {
    const firmId = c.req.param("firmId");
    if (!requireWombatFirm(firmId)) {
      return c.json(firmNotFound(), 404);
    }
    const parsed = deskJobListQuerySchema.safeParse({
      runId: c.req.query("runId") || undefined,
    });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    let jobs = await store.jobs.list({ firmId });
    if (parsed.data.runId) {
      const run = await store.opportunityRuns.get(parsed.data.runId, firmId);
      if (!run) {
        return c.json({ error: { message: "opportunity run not found" } }, 404);
      }
      jobs = jobs.filter((job) => jobLinkedToRun(job, run));
    }
    return c.json({ firmId, jobs });
  });

  app.get("/v1/firms/:firmId/jobs/:jobId", async (c) => {
    const firmId = c.req.param("firmId");
    if (!requireWombatFirm(firmId)) {
      return c.json(firmNotFound(), 404);
    }
    const job = await store.jobs.get(c.req.param("jobId"), firmId);
    if (!job) {
      return c.json({ error: { message: "job not found" } }, 404);
    }
    return c.json({ firmId, job });
  });

  return app;
}
