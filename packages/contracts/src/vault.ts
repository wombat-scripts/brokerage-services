import { z } from "zod";
import { firmIdSchema, type FirmId } from "./firm.js";
import type { JobKind } from "./job.js";

export const vaultSecretKindSchema = z.enum(["lender_portal", "corelogic", "quickli", "other"]);

export type VaultSecretKind = z.infer<typeof vaultSecretKindSchema>;

export const vaultSecretMetaSchema = z.object({
  secretId: z.string().min(1),
  firmId: firmIdSchema,
  kind: vaultSecretKindSchema,
  label: z.string().min(1),
  usernameHint: z.string().optional(),
  mfaMode: z.enum(["none", "attended", "totp_managed"]),
  lastUnlockedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type VaultSecretMeta = z.infer<typeof vaultSecretMetaSchema>;

export type UnlockStatus = "ready" | "awaiting_attended_mfa";

/**
 * Vendor-agnostic vault. GCP Secret Manager is the Phase 1 adapter.
 * Implementations must never return passwords or totp seeds to LLM / skills / logs.
 */
export interface CredentialVault {
  list(firmId: FirmId): Promise<VaultSecretMeta[]>;

  requestUnlock(args: {
    firmId: FirmId;
    secretId: string;
    jobId: string;
    requester: string;
  }): Promise<{ unlockId: string; status: UnlockStatus }>;

  bindSession(args: {
    unlockId: string;
    jobId: string;
  }): Promise<{ sessionHandle: string; ttlSeconds: number }>;

  getStorageState?(args: { firmId: FirmId; secretId: string }): Promise<string | null>;
  putStorageState?(args: {
    firmId: FirmId;
    secretId: string;
    encryptedState: string;
  }): Promise<void>;

  revoke(unlockId: string): Promise<void>;
}

/** Map a job to the vault secret kind. Phase 1: NAB portal + CoreLogic Property Hub only. */
export function vaultKindForJob(jobKind: JobKind, lenderCode?: string): VaultSecretKind | undefined {
  if (jobKind === "valuation.corelogic_avm") {
    return "corelogic";
  }
  if (
    (jobKind === "valuation.lender" || jobKind === "pricing.lender") &&
    lenderCode === "NAB"
  ) {
    return "lender_portal";
  }
  return undefined;
}

export function selectVaultSecret(
  secrets: VaultSecretMeta[],
  jobKind: JobKind,
  lenderCode?: string,
): VaultSecretMeta | undefined {
  const kind = vaultKindForJob(jobKind, lenderCode);
  if (!kind) return undefined;
  return secrets.find((secret) => secret.kind === kind);
}
