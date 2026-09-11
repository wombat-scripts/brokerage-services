import { z } from "zod";
import { firmIdSchema, type FirmId } from "./firm.js";

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
 * Vendor-agnostic vault. Bitwarden Secrets Manager is the Phase 1 adapter.
 * Implementations must never return passwords to LLM / skills / logs.
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
