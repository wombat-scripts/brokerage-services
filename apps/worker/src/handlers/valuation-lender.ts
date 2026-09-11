import {
  appendJobAudit,
  valuationLenderInputSchema,
  type Job,
  type ValuationLenderInput,
  type ValuationLenderOutput,
} from "@wombat/contracts";
import { fixtureValuationOutput, PRAI_NAB_FIXTURE } from "../fixtures/prai-nab.js";
import { touchJob } from "../jobs.js";
import { isFixtureMode } from "../fixture-mode.js";

export function handleValuationLender(
  job: Job<unknown>,
): Job<ValuationLenderInput, ValuationLenderOutput> {
  const input = valuationLenderInputSchema.parse(job.input);
  if (!isFixtureMode(input)) {
    return touchJob(job as Job<ValuationLenderInput, ValuationLenderOutput>, {
      status: "awaiting_attended_mfa",
      error: {
        code: "AWAITING_ATTENDED_MFA",
        message:
          "Live lender valuation is out of Phase 1 scope. Set input.fixture=true or PHASE1_FIXTURES=true, or complete Bitwarden attended unlock.",
        retryable: true,
      },
      audit: appendJobAudit(job, "system", "vault.unlock", {
        lenderCode: input.lenderCode,
        path: "attended",
      }),
    });
  }

  if (input.lenderCode !== PRAI_NAB_FIXTURE.lenderCode) {
    return touchJob(job as Job<ValuationLenderInput, ValuationLenderOutput>, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: {
        code: "FIXTURE_LENDER_UNSUPPORTED",
        message: `Phase 1 fixture is ${PRAI_NAB_FIXTURE.lenderCode} only (received ${input.lenderCode})`,
        retryable: false,
      },
    });
  }

  const output = fixtureValuationOutput();
  return touchJob(job as Job<ValuationLenderInput, ValuationLenderOutput>, {
    status: "succeeded",
    finishedAt: new Date().toISOString(),
    output,
    error: undefined,
    audit: appendJobAudit(job, "system", "job.succeeded", { fixture: true }),
  });
}
