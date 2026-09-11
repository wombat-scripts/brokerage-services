import {
  computeLvr,
  createAuditEvent,
  pricingLenderInputSchema,
  type Job,
  type PricingLenderInput,
  type PricingLenderOutput,
  type ValuationLenderOutput,
} from "@wombat/contracts";
import type { JobStore } from "@wombat/store";
import { fixturePricingOutput, PRAI_NAB_FIXTURE } from "../fixtures/prai-nab.js";
import { isFixtureMode } from "../fixture-mode.js";
import { touchJob } from "../jobs.js";

export async function handlePricingLender(
  job: Job<unknown>,
  jobs: JobStore,
): Promise<Job<PricingLenderInput, PricingLenderOutput>> {
  const input = pricingLenderInputSchema.parse(job.input);
  const valuation = await jobs.get(input.valuationJobId);
  if (!valuation) {
    return fail(job, "VALUATION_JOB_MISSING", `valuation job ${input.valuationJobId} not found`, false);
  }
  if (valuation.kind !== "valuation.lender") {
    return fail(job, "VALUATION_JOB_WRONG_KIND", "pricing.lender requires valuation.lender", false);
  }
  if (valuation.status !== "succeeded" || !valuation.output) {
    return fail(
      job,
      "VALUATION_JOB_NOT_SUCCEEDED",
      "pricing.lender requires a succeeded valuation job for this lender",
      true,
    );
  }

  const valOut = valuation.output as ValuationLenderOutput;
  if (valOut.lenderCode !== input.lenderCode) {
    return fail(
      job,
      "VALUATION_LENDER_MISMATCH",
      `pricing lender ${input.lenderCode} must match valuation lender ${valOut.lenderCode}`,
      false,
    );
  }

  const expectedLvr = computeLvr(input.loanBalanceAud, valOut.valueAud);
  if (Math.abs(expectedLvr - input.lvr) > 0.0001) {
    return fail(
      job,
      "LVR_MISMATCH",
      "pricing.lender lvr must equal loanBalance / that lender's valuation (no generic 80%)",
      false,
    );
  }

  if (!isFixtureMode(input)) {
    return touchJob(job as Job<PricingLenderInput, PricingLenderOutput>, {
      status: "awaiting_attended_mfa",
      error: {
        code: "AWAITING_ATTENDED_MFA",
        message:
          "Live lender pricing is out of Phase 1 scope. Set input.fixture=true or PHASE1_FIXTURES=true.",
        retryable: true,
      },
    });
  }

  if (input.lenderCode !== PRAI_NAB_FIXTURE.lenderCode) {
    return fail(
      job,
      "FIXTURE_LENDER_UNSUPPORTED",
      `Phase 1 fixture is ${PRAI_NAB_FIXTURE.lenderCode} only`,
      false,
    );
  }

  const output = fixturePricingOutput(input.lvr);
  return touchJob(job as Job<PricingLenderInput, PricingLenderOutput>, {
    status: "succeeded",
    finishedAt: new Date().toISOString(),
    output,
    error: undefined,
    audit: [
      ...job.audit,
      createAuditEvent("system", "job.succeeded", {
        fixture: true,
        currentRateSource: input.currentRateSource ?? "notion_loan",
      }),
    ],
  });
}

function fail(
  job: Job<unknown>,
  code: string,
  message: string,
  retryable: boolean,
): Job<PricingLenderInput, PricingLenderOutput> {
  return touchJob(job as Job<PricingLenderInput, PricingLenderOutput>, {
    status: "failed",
    finishedAt: new Date().toISOString(),
    error: { code, message, retryable },
  });
}
