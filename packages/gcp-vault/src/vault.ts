import { randomUUID } from "node:crypto";
import {
  WOMBAT_FIRM_ID,
  assertWombatFirmId,
  type CredentialVault,
  type FirmId,
  type UnlockStatus,
  type VaultSecretMeta,
} from "@wombat/contracts";
import {
  createFixtureSecretAccessClient,
  createLiveSecretAccessClient,
  type SecretAccessClient,
} from "./client.js";
import { GCP_VAULT_DEFAULTS, type GcpVaultSecretMap } from "./defaults.js";
import {
  describeCorelogicSecret,
  describeNabSecret,
  parseCorelogicPropertyHubPayload,
  parseNabBrokerPortalPayload,
  type ParsedVaultSecret,
} from "./payloads.js";
import { defaultFixtureSecretJson } from "./fixtures.js";
import { safeVaultLog } from "./safe-log.js";

export type GcpVaultConfig = {
  projectId?: string;
  location?: string;
  secrets?: Partial<GcpVaultSecretMap>;
  client?: SecretAccessClient;
};

type UnlockRecord = {
  unlockId: string;
  secretId: string;
  jobId: string;
  requester: string;
  status: UnlockStatus;
};

/**
 * GCP Secret Manager adapter for CredentialVault.
 * ADC / workload identity on the AU host; optional GOOGLE_APPLICATION_CREDENTIALS for local.
 * Callers receive metadata only — never password or totp_seed.
 */
export class GcpCredentialVault implements CredentialVault {
  private readonly unlocks = new Map<string, UnlockRecord>();
  private readonly storageState = new Map<string, string>();
  private readonly projectId: string;
  private readonly secrets: GcpVaultSecretMap;
  private readonly client: SecretAccessClient;

  constructor(config: GcpVaultConfig = {}) {
    this.projectId = config.projectId ?? GCP_VAULT_DEFAULTS.projectId;
    this.secrets = {
      nab: config.secrets?.nab ?? GCP_VAULT_DEFAULTS.secrets.nab,
      corelogic: config.secrets?.corelogic ?? GCP_VAULT_DEFAULTS.secrets.corelogic,
    };
    this.client = config.client ?? createFixtureSecretAccessClient();
  }

  async list(firmId: FirmId): Promise<VaultSecretMeta[]> {
    assertWombatFirmId(firmId);
    const nab = await this.describeSecret(this.secrets.nab, "nab");
    const corelogic = await this.describeSecret(this.secrets.corelogic, "corelogic");
    safeVaultLog("vault.list", {
      firmId,
      projectId: this.projectId,
      secretIds: [nab.secretId, corelogic.secretId],
      mfaModes: [nab.mfaMode, corelogic.mfaMode],
    });
    return [toMeta(nab), toMeta(corelogic)];
  }

  async requestUnlock(args: {
    firmId: FirmId;
    secretId: string;
    jobId: string;
    requester: string;
  }): Promise<{ unlockId: string; status: UnlockStatus }> {
    assertWombatFirmId(args.firmId);
    const described = await this.describeBySecretId(args.secretId);
    const unlockId = randomUUID();
    const status = described.unlockStatus;
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
      mfaMode: described.mfaMode,
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
    return { sessionHandle: `gcp:${args.unlockId}`, ttlSeconds: 900 };
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

  private async describeBySecretId(secretId: string): Promise<ParsedVaultSecret> {
    if (secretId === this.secrets.nab) {
      return this.describeSecret(secretId, "nab");
    }
    if (secretId === this.secrets.corelogic) {
      return this.describeSecret(secretId, "corelogic");
    }
    throw new Error(`Unknown vault secretId ${secretId}`);
  }

  private async describeSecret(
    secretId: string,
    which: "nab" | "corelogic",
  ): Promise<ParsedVaultSecret> {
    const raw = await this.client.accessSecretJson(secretId);
    if (which === "nab") {
      return describeNabSecret(secretId, parseNabBrokerPortalPayload(raw, secretId));
    }
    return describeCorelogicSecret(secretId, parseCorelogicPropertyHubPayload(raw, secretId));
  }
}

function toMeta(described: ParsedVaultSecret): VaultSecretMeta {
  return {
    secretId: described.secretId,
    firmId: WOMBAT_FIRM_ID,
    kind: described.kind,
    label: described.label,
    usernameHint: described.usernameHint,
    mfaMode: described.mfaMode,
  };
}

function storageKey(firmId: FirmId, secretId: string): string {
  return `${firmId}:${secretId}`;
}

export function createGcpVaultFromEnv(env: NodeJS.ProcessEnv = process.env): GcpCredentialVault {
  const projectId = env.GCP_PROJECT_ID || GCP_VAULT_DEFAULTS.projectId;
  const secrets: GcpVaultSecretMap = {
    nab: env.GCP_SECRET_NAB || GCP_VAULT_DEFAULTS.secrets.nab,
    corelogic: env.GCP_SECRET_CORELOGIC || GCP_VAULT_DEFAULTS.secrets.corelogic,
  };
  const location = env.GCP_SECRET_LOCATION || undefined;
  const live = env.GCP_VAULT_MODE === "live";
  safeVaultLog("vault.createFromEnv", {
    projectId,
    mode: live ? "live" : "fixture",
    location: location ?? "global-name",
    adcCredentialsPathSet: Boolean(env.GOOGLE_APPLICATION_CREDENTIALS),
    secretIds: [secrets.nab, secrets.corelogic],
  });
  const fixtures = defaultFixtureSecretJson();
  const client = live
    ? createLiveSecretAccessClient({ projectId, location })
    : createFixtureSecretAccessClient({
        [secrets.nab]: fixtures[GCP_VAULT_DEFAULTS.secrets.nab]!,
        [secrets.corelogic]: fixtures[GCP_VAULT_DEFAULTS.secrets.corelogic]!,
      });
  return new GcpCredentialVault({ projectId, location, secrets, client });
}
