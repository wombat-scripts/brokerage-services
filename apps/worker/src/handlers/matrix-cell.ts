import { ulid } from "ulid";
import {
  computeDeltaAudPa,
  computeDeltaBp,
  computeLvr,
  computeSavingFlag,
  appendJobAudit,
  matrixCellInputSchema,
  type CrmWriteBackAdapter,
  type Job,
  type LoanOpportunityType,
  type MatrixCellInput,
  type MatrixCellOutput,
  type OpportunityRun,
  type PricingLenderInput,
  type PricingLenderOutput,
  type PropertyOpportunityStatus,
  type RankHint,
  type ValuationLenderOutput,
} from "@wombat/contracts";
import type { BrokerageStore } from "@wombat/store";
import { touchJob } from "../jobs.js";

export async function handleMatrixCell(
  job: Job<unknown>,
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
): Promise<Job<MatrixCellInput, MatrixCellOutput>> {
  const input = matrixCellInputSchema.parse(job.input);
  const valuation = await store.jobs.get(input.valuationJobId);
  const pricing = await store.jobs.get(input.pricingJobId);

  if (!valuation || !pricing) {
    return fail(job, "CHILD_JOB_MISSING", "matrix_cell needs both valuation and pricing jobs", false);
  }
  if (valuation.kind !== "valuation.lender" || pricing.kind !== "pricing.lender") {
    return fail(job, "CHILD_JOB_WRONG_KIND", "matrix_cell children must be val+price lender jobs", false);
  }
  if (valuation.status !== "succeeded" || pricing.status !== "succeeded" || !valuation.output || !pricing.output) {
    return unknownCell(
      job,
      store,
      input,
      "Partial success is forbidden: both valuation and pricing must succeed",
    );
  }

  const valOut = valuation.output as ValuationLenderOutput;
  const priceIn = pricing.input as PricingLenderInput;
  const priceOut = pricing.output as PricingLenderOutput;
  if (valOut.lenderCode !== input.targetLenderCode || priceOut.lenderCode !== input.targetLenderCode) {
    return fail(job, "LENDER_MISMATCH", "child jobs must match targetLenderCode", false);
  }

  const lvr = computeLvr(priceIn.loanBalanceAud, valOut.valueAud);
  const currentRate = priceIn.currentRate;
  const newRate = priceOut.newRate;
  const savingFlag = computeSavingFlag({ currentRate, newRate });
  const deltaBp =
    currentRate !== undefined && newRate !== undefined ? computeDeltaBp(currentRate, newRate) : undefined;
  const deltaAudPa =
    currentRate !== undefined && newRate !== undefined
      ? computeDeltaAudPa(priceIn.loanBalanceAud, currentRate, newRate)
      : undefined;
  const currentLenderCode = input.currentLenderCode ?? input.targetLenderCode;
  const rankHint = rankFor(savingFlag, currentLenderCode, input.targetLenderCode);
  const ranAt = new Date().toISOString();
  const runId = ulid();

  const run: OpportunityRun = {
    runId,
    firmId: input.firmId,
    ranAt,
    requestedBy: job.requestedBy,
    clientPageId: input.clientPageId,
    propertyPageId: input.propertyPageId,
    loanPageId: input.loanPageId,
    currentLenderCode,
    targetLenderCode: input.targetLenderCode,
    loanBalanceAud: priceIn.loanBalanceAud,
    valAud: valOut.valueAud,
    valDate: valOut.valueDate,
    valSource: valOut.source,
    lvr,
    ...(currentRate !== undefined ? { currentRate } : {}),
    ...(priceIn.currentRateSource ? { currentRateSource: priceIn.currentRateSource } : {}),
    ...(newRate !== undefined ? { newRate } : {}),
    savingFlag,
    ...(deltaBp !== undefined ? { deltaBp } : {}),
    ...(deltaAudPa !== undefined ? { deltaAudPa } : {}),
    status: "succeeded",
    valuationJobId: valuation.jobId,
    pricingJobId: pricing.jobId,
    matrixJobId: job.jobId,
    artefactUris: [...valuation.artefacts, ...pricing.artefacts].map((item) => item.uri),
    notes: savingNotes(savingFlag, currentRate, newRate, deltaBp),
  };

  await store.opportunityRuns.append(run);

  const doThisNext = run.notes ?? "Review opportunity run";
  const opportunityStatus = statusFor(savingFlag);
  try {
    await crm.appendOpportunityRun(run);
    await crm.patchPropertySummary({
      propertyPageId: input.propertyPageId,
      estimatedValueAud: valOut.valueAud,
      valueDate: valOut.valueDate,
      opportunityStatus,
      doThisNext,
      sourceRunId: run.runId,
    });
    await crm.patchLoanOpportunity({
      loanPageId: input.loanPageId,
      opportunityTypeAdd: typesFor(savingFlag, currentLenderCode, input.targetLenderCode),
      opportunityStatus,
      doThisNext,
      sourceRunId: run.runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(job, "CRM_WRITE_FAILED", message, true);
  }

  const output: MatrixCellOutput = {
    opportunityRunId: run.runId,
    savingFlag,
    ...(currentRate !== undefined ? { currentRate } : {}),
    ...(newRate !== undefined ? { newRate } : {}),
    ...(deltaBp !== undefined ? { deltaBp } : {}),
    ...(deltaAudPa !== undefined ? { deltaAudPaEstimate: deltaAudPa } : {}),
    ...(rankHint ? { rankHint } : {}),
  };

  return touchJob(job as Job<MatrixCellInput, MatrixCellOutput>, {
    status: "succeeded",
    finishedAt: ranAt,
    output,
    error: undefined,
    audit: appendJobAudit(job, "system", "writeback.applied", { sourceRunId: run.runId }),
  });
}

function statusFor(flag: OpportunityRun["savingFlag"]): PropertyOpportunityStatus {
  if (flag === "yes") return "Contact now";
  if (flag === "no") return "Monitor";
  return "Not assessed";
}

function typesFor(
  flag: OpportunityRun["savingFlag"],
  currentLender: string,
  targetLender: string,
): LoanOpportunityType[] {
  if (flag !== "yes") return [];
  if (currentLender === targetLender) return ["Reprice", "Retention review"];
  return ["Refinance"];
}

function rankFor(
  flag: OpportunityRun["savingFlag"],
  currentLender: string,
  targetLender: string,
): RankHint {
  if (flag === "unknown") return "monitor";
  if (flag === "no") return "skip";
  return currentLender === targetLender ? "stay_reprice" : "switch";
}

function savingNotes(
  flag: OpportunityRun["savingFlag"],
  currentRate?: number,
  newRate?: number,
  deltaBp?: number,
): string {
  const rates =
    currentRate !== undefined && newRate !== undefined
      ? ` current ${(currentRate * 100).toFixed(2)}% vs new ${(newRate * 100).toFixed(2)}%` +
        (deltaBp !== undefined ? ` (${deltaBp}bp)` : "")
      : "";
  return `Saving ${flag === "yes" ? "Yes" : flag === "no" ? "No" : "Unknown"}${rates}. Flag for Tom — not advice, not auto-email.`;
}

function fail(
  job: Job<unknown>,
  code: string,
  message: string,
  retryable: boolean,
): Job<MatrixCellInput, MatrixCellOutput> {
  return touchJob(job as Job<MatrixCellInput, MatrixCellOutput>, {
    status: "failed",
    finishedAt: new Date().toISOString(),
    error: { code, message, retryable },
  });
}

async function unknownCell(
  job: Job<unknown>,
  _store: BrokerageStore,
  input: MatrixCellInput,
  reason: string,
): Promise<Job<MatrixCellInput, MatrixCellOutput>> {
  return touchJob(job as Job<MatrixCellInput, MatrixCellOutput>, {
    status: "succeeded",
    finishedAt: new Date().toISOString(),
    output: {
      opportunityRunId: "unknown",
      savingFlag: "unknown",
    },
    audit: appendJobAudit(job, "system", "job.succeeded", {
      savingFlag: "unknown",
      reason,
      valuationJobId: input.valuationJobId,
      pricingJobId: input.pricingJobId,
    }),
  });
}
