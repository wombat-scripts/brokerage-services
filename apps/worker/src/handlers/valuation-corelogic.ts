import { appendJobAudit, type CredentialVault, type Job } from "@wombat/contracts";
import { touchJob } from "../jobs.js";
import { requestPortalUnlock, vaultUnlockAuditDetail } from "../vault-unlock.js";

/**
 * CoreLogic / Cotality Property Hub path. Resolves vault secret only.
 * Flow (attended, no OTP stored): email gate → Property Hub user/pass → Ping email OTP.
 */
export async function handleValuationCorelogic(
  job: Job<unknown>,
  vault?: CredentialVault,
): Promise<Job> {
  if (!vault) {
    return touchJob(job, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: {
        code: "VAULT_NOT_CONFIGURED",
        message: "CredentialVault is required for CoreLogic Property Hub unlock",
        retryable: true,
      },
    });
  }

  const unlock = await requestPortalUnlock({
    vault,
    job,
    jobKind: "valuation.corelogic_avm",
  });
  if (unlock.outcome === "no_secret") {
    return touchJob(job, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: {
        code: "VAULT_SECRET_NOT_MAPPED",
        message: "No vault secret mapped for valuation.corelogic_avm",
        retryable: false,
      },
    });
  }
  if (unlock.outcome === "awaiting_attended_mfa") {
    return touchJob(job, {
      status: "awaiting_attended_mfa",
      error: {
        code: "AWAITING_ATTENDED_MFA",
        message:
          "CoreLogic Property Hub unlock is email-attended (Cotality gate → hub login → Ping email OTP). Never store OTP codes. No live scrape.",
        retryable: true,
      },
      audit: appendJobAudit(job, "system", "vault.unlock", vaultUnlockAuditDetail(unlock)),
    });
  }
  return touchJob(job, {
    status: "failed",
    finishedAt: new Date().toISOString(),
    error: {
      code: "LIVE_PORTAL_OUT_OF_SCOPE",
      message: "Vault session is ready; live CoreLogic scrape is out of Phase 1.3 scope.",
      retryable: true,
    },
    audit: appendJobAudit(job, "system", "vault.unlock", vaultUnlockAuditDetail(unlock)),
  });
}
