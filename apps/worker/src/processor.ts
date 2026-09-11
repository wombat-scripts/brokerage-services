import {
  appendJobAudit,
  type CredentialVault,
  type CrmWriteBackAdapter,
  type Job,
} from "@wombat/contracts";
import type { BrokerageStore } from "@wombat/store";
import { handleMatrixCell } from "./handlers/matrix-cell.js";
import { handlePricingLender } from "./handlers/pricing-lender.js";
import { handleValuationCorelogic } from "./handlers/valuation-corelogic.js";
import { handleValuationLender } from "./handlers/valuation-lender.js";
import { touchJob } from "./jobs.js";

export async function processJob(
  job: Job,
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
  vault?: CredentialVault,
): Promise<Job> {
  const started = touchJob(job, {
    status: "running",
    startedAt: job.startedAt ?? new Date().toISOString(),
    audit: appendJobAudit(job, "system", "job.started", { kind: job.kind }),
  });
  await store.jobs.update(started);

  try {
    const processed = await dispatch(started, store, crm, vault);
    await store.jobs.update(processed);
    return processed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = touchJob(started, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: { code: "JOB_FAILED", message, retryable: true },
      audit: appendJobAudit(started, "system", "job.failed", { message }),
    });
    await store.jobs.update(failed);
    return failed;
  }
}

async function dispatch(
  job: Job,
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
  vault?: CredentialVault,
): Promise<Job> {
  switch (job.kind) {
    case "valuation.lender":
      return handleValuationLender(job, vault);
    case "valuation.corelogic_avm":
      return handleValuationCorelogic(job, vault);
    case "pricing.lender":
      return handlePricingLender(job, store.jobs, vault);
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
        audit: appendJobAudit(job, "system", "job.failed", { kind: job.kind }),
      });
  }
}

export async function processQueuedJobs(
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
  vault?: CredentialVault,
  limit = 10,
): Promise<Job[]> {
  const queued = await store.jobs.listByStatus("queued", limit);
  const results: Job[] = [];
  for (const job of queued) {
    results.push(await processJob(job, store, crm, vault));
  }
  return results;
}
