import { randomUUID } from "node:crypto";
import {
  WOMBAT_FIRM_ID,
  assertWombatFirmId,
  type CredentialVault,
  type FirmId,
  type UnlockStatus,
  type VaultSecretMeta,
} from "@wombat/contracts";
import { safeVaultLog } from "./safe-log.js";

export type BitwardenVaultConfig = {
  apiUrl?: string;
  accessToken?: string;
  organizationId?: string;
  projectId?: string;
};

type UnlockRecord = {
  unlockId: string;
  secretId: string;
  jobId: string;
  requester: string;
  status: UnlockStatus;
};

/**
 * Bitwarden Secrets Manager / machine-account adapter.
 * Phase 1 returns awaiting_attended_mfa until machine-account secrets exist.
 * Google Password Manager is not a runtime.
 */
export class BitwardenCredentialVault implements CredentialVault {
  private readonly unlocks = new Map<string, UnlockRecord>();
  private readonly storageState = new Map<string, string>();

  constructor(private readonly config: BitwardenVaultConfig = {}) {}

  async list(firmId: FirmId): Promise<VaultSecretMeta[]> {
    assertWombatFirmId(firmId);
    safeVaultLog("vault.list", { firmId, configured: this.isConfigured() });
    // Metadata only — never passwords. Empty until SM project is populated.
    return [];
  }

  async requestUnlock(args: {
    firmId: FirmId;
    secretId: string;
    jobId: string;
    requester: string;
  }): Promise<{ unlockId: string; status: UnlockStatus }> {
    assertWombatFirmId(args.firmId);
    const unlockId = randomUUID();
    const status: UnlockStatus = "awaiting_attended_mfa";
    this.unlocks.set(unlockId, {
      unlockId,
      secretId: args.secretId,
      jobId: args.jobId,
      requester: args.requester,
      status,
    });
    safeVaultLog("vault.requestUnlock", {
      firmId: WOMBAT_FIRM_ID,
      secretId: args.secretId,
      jobId: args.jobId,
      requester: args.requester,
      unlockId,
      status,
    });
    return { unlockId, status };
  }

  async bindSession(args: {
    unlockId: string;
    jobId: string;
  }): Promise<{ sessionHandle: string; ttlSeconds: number }> {
    const unlock = this.unlocks.get(args.unlockId);
    if (!unlock || unlock.jobId !== args.jobId) {
      throw new Error("vault unlock is not bound to this job");
    }
    if (unlock.status !== "ready") {
      throw new Error("vault session is awaiting attended MFA; runner must not store MFA codes");
    }
    return { sessionHandle: `bw:${args.unlockId}`, ttlSeconds: 900 };
  }

  async getStorageState(args: { firmId: FirmId; secretId: string }): Promise<string | null> {
    assertWombatFirmId(args.firmId);
    return this.storageState.get(storageKey(args.firmId, args.secretId)) ?? null;
  }

  async putStorageState(args: {
    firmId: FirmId;
    secretId: string;
    encryptedState: string;
  }): Promise<void> {
    assertWombatFirmId(args.firmId);
    this.storageState.set(storageKey(args.firmId, args.secretId), args.encryptedState);
    safeVaultLog("vault.putStorageState", {
      firmId: args.firmId,
      secretId: args.secretId,
      bytes: args.encryptedState.length,
    });
  }

  async revoke(unlockId: string): Promise<void> {
    this.unlocks.delete(unlockId);
    safeVaultLog("vault.revoke", { unlockId });
  }

  private isConfigured(): boolean {
    return Boolean(this.config.accessToken && this.config.organizationId);
  }
}

function storageKey(firmId: FirmId, secretId: string): string {
  return `${firmId}:${secretId}`;
}

export function createBitwardenVaultFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): BitwardenCredentialVault {
  return new BitwardenCredentialVault({
    apiUrl: env.BITWARDEN_API_URL,
    accessToken: env.BITWARDEN_ACCESS_TOKEN || undefined,
    organizationId: env.BITWARDEN_ORGANIZATION_ID || undefined,
    projectId: env.BITWARDEN_PROJECT_ID || undefined,
  });
}
