import {
  selectVaultSecret,
  type CredentialVault,
  type Job,
  type JobKind,
  type UnlockStatus,
  type VaultSecretMeta,
} from "@wombat/contracts";

export type PortalUnlockResult =
  | { outcome: "no_secret" }
  | {
      outcome: "awaiting_attended_mfa" | "ready";
      secretId: string;
      unlockId: string;
      status: UnlockStatus;
      mfaMode: VaultSecretMeta["mfaMode"];
      sessionHandle?: string;
    };

/**
 * Resolve the vault secret for a job kind and request unlock.
 * Returns metadata + unlock status only — never password / totp_seed.
 */
export async function requestPortalUnlock(args: {
  vault: CredentialVault;
  job: Job;
  jobKind: JobKind;
  lenderCode?: string;
}): Promise<PortalUnlockResult> {
  const secrets = await args.vault.list(args.job.firmId);
  const secret = selectVaultSecret(secrets, args.jobKind, args.lenderCode);
  if (!secret) {
    return { outcome: "no_secret" };
  }
  const unlock = await args.vault.requestUnlock({
    firmId: args.job.firmId,
    secretId: secret.secretId,
    jobId: args.job.jobId,
    requester: args.job.requestedBy,
  });
  if (unlock.status === "awaiting_attended_mfa") {
    return {
      outcome: "awaiting_attended_mfa",
      secretId: secret.secretId,
      unlockId: unlock.unlockId,
      status: unlock.status,
      mfaMode: secret.mfaMode,
    };
  }
  const session = await args.vault.bindSession({
    unlockId: unlock.unlockId,
    jobId: args.job.jobId,
  });
  return {
    outcome: "ready",
    secretId: secret.secretId,
    unlockId: unlock.unlockId,
    status: unlock.status,
    mfaMode: secret.mfaMode,
    sessionHandle: session.sessionHandle,
  };
}

export function vaultUnlockAuditDetail(result: Exclude<PortalUnlockResult, { outcome: "no_secret" }>) {
  return {
    secretId: result.secretId,
    unlockId: result.unlockId,
    status: result.status,
    mfaMode: result.mfaMode,
    path: result.mfaMode === "totp_managed" ? "totp_managed" : "attended",
  };
}
