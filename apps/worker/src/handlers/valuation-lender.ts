import {
  appendJobAudit,
  valuationLenderInputSchema,
  type CredentialVault,
  type Job,
  type ValuationLenderInput,
  type ValuationLenderOutput,
} from "@wombat/contracts";
import { fixtureValuationOutput, PRAI_NAB_FIXTURE } from "../fixtures/prai-nab.js";
import { touchJob } from "../jobs.js";
import { isFixtureMode } from "../fixture-mode.js";
import { requestPortalUnlock, vaultUnlockAuditDetail } from "../vault-unlock.js";

export async function handleValuationLender(
  job: Job<unknown>,
  vault?: CredentialVault,
): Promise<Job<ValuationLenderInput, ValuationLenderOutput>> {
  const input = valuationLenderInputSchema.parse(job.input);
  if (!isFixtureMode(input)) {
    return pauseForVault(job, input, vault);
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

async function pauseForVault(
  job: Job<unknown>,
  input: ValuationLenderInput,
  vault?: CredentialVault,
): Promise<Job<ValuationLenderInput, ValuationLenderOutput>> {
  const typed = job as Job<ValuationLenderInput, ValuationLenderOutput>;
  if (!vault) {
    return touchJob(typed, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: {
        code: "VAULT_NOT_CONFIGURED",
        message: "CredentialVault is required for live lender valuation (no scrape in this phase)",
        retryable: true,
      },
    });
  }

  const unlock = await requestPortalUnlock({
    vault,
    job,
    jobKind: "valuation.lender",
    lenderCode: input.lenderCode,
  });
  if (unlock.outcome === "no_secret") {
    return touchJob(typed, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: {
        code: "VAULT_SECRET_NOT_MAPPED",
        message: `No vault secret mapped for valuation.lender ${input.lenderCode}`,
        retryable: false,
      },
    });
  }
  if (unlock.outcome === "awaiting_attended_mfa") {
    return touchJob(typed, {
      status: "awaiting_attended_mfa",
      error: {
        code: "AWAITING_ATTENDED_MFA",
        message:
          "Lender portal unlock needs attended MFA. Live scrape is out of scope. Set input.fixture=true or PHASE1_FIXTURES=true.",
        retryable: true,
      },
      audit: appendJobAudit(job, "system", "vault.unlock", vaultUnlockAuditDetail(unlock)),
    });
  }
  return touchJob(typed, {
    status: "failed",
    finishedAt: new Date().toISOString(),
    error: {
      code: "LIVE_PORTAL_OUT_OF_SCOPE",
      message: "Vault TOTP path is ready; live lender scrape is out of Phase 1.3 scope.",
      retryable: true,
    },
    audit: appendJobAudit(job, "system", "vault.unlock", vaultUnlockAuditDetail(unlock)),
  });
}
