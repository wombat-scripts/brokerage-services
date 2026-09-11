import { createAuditEvent, type CrmWriteBackAdapter, type Job } from "@wombat/contracts";
import type { BrokerageStore } from "@wombat/store";
import { handleMatrixCell } from "./handlers/matrix-cell.js";
import { handlePricingLender } from "./handlers/pricing-lender.js";
import { handleValuationLender } from "./handlers/valuation-lender.js";
import { touchJob } from "./jobs.js";

export async function processJob(
  job: Job,
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
): Promise<Job> {
  const started = touchJob(job, {
    status: "running",
    startedAt: job.startedAt ?? new Date().toISOString(),
    audit: [...job.audit, createAuditEvent("system", "job.started", { kind: job.kind })],
  });
  await store.jobs.update(started);

  try {
    const processed = await dispatch(started, store, crm);
    await store.jobs.update(processed);
    return processed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = touchJob(started, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: { code: "JOB_FAILED", message, retryable: true },
    });
    await store.jobs.update(failed);
    return failed;
  }
}

async function dispatch(
  job: Job,
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
): Promise<Job> {
  switch (job.kind) {
    case "valuation.lender":
      return handleValuationLender(job);
    case "pricing.lender":
      return handlePricingLender(job, store.jobs);
    case "opportunity.matrix_cell":
      return handleMatrixCell(job, store, crm);
    default:
      return touchJob(job, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: {
          code: "KIND_NOT_IMPLEMENTED",
          message: `Phase 1 does not run ${job.kind}`,
          retryable: false,
        },
      });
  }
}

export async function processQueuedJobs(
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
  limit = 10,
): Promise<Job[]> {
  const queued = await store.jobs.listByStatus("queued", limit);
  const results: Job[] = [];
  for (const job of queued) {
    results.push(await processJob(job, store, crm));
  }
  return results;
}
