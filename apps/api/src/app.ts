import { Hono } from "hono";
import { z } from "zod";
import {
  WOMBAT_FIRM_ID,
  jobKindSchema,
  subjectRefsSchema,
  type CrmWriteBackAdapter,
} from "@wombat/contracts";
import type { BrokerageStore } from "@wombat/store";
import { newJob, processJob } from "@wombat/worker";

const createJobBodySchema = z.object({
  kind: jobKindSchema,
  requestedBy: z.string().min(1),
  firmId: z.literal(WOMBAT_FIRM_ID).optional(),
  input: z.record(z.unknown()),
  subjectRefs: subjectRefsSchema.optional(),
});

export function createApi(store: BrokerageStore, crm?: CrmWriteBackAdapter) {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      ok: true,
      firmId: WOMBAT_FIRM_ID,
      service: "brokerage-services",
    }),
  );

  app.post("/jobs", async (c) => {
    const parsed = createJobBodySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }
    const body = parsed.data;
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
    return c.json({ job }, 201);
  });

  app.get("/jobs/:jobId", async (c) => {
    const job = await store.jobs.get(c.req.param("jobId"));
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

  return app;
}
