export { GcpCredentialVault, createGcpVaultFromEnv } from "./vault.js";
export type { GcpVaultConfig } from "./vault.js";
export {
  createFixtureSecretAccessClient,
  createLiveSecretAccessClient,
  secretVersionName,
} from "./client.js";
export type { SecretAccessClient } from "./client.js";
export { GCP_VAULT_DEFAULTS } from "./defaults.js";
export type { GcpVaultSecretMap } from "./defaults.js";
export {
  FIXTURE_CORELOGIC_PAYLOAD,
  FIXTURE_NAB_ATTENDED_PAYLOAD,
  FIXTURE_NAB_TOTP_PAYLOAD,
  defaultFixtureSecretJson,
} from "./fixtures.js";
export {
  corelogicPropertyHubPayloadSchema,
  describeCorelogicSecret,
  describeNabSecret,
  mfaModeFromPayload,
  nabBrokerPortalPayloadSchema,
  parseCorelogicPropertyHubPayload,
  parseNabBrokerPortalPayload,
  unlockStatusForMfaMode,
} from "./payloads.js";
export type {
  CorelogicPropertyHubPayload,
  NabBrokerPortalPayload,
  ParsedVaultSecret,
  VaultSecretPayload,
} from "./payloads.js";
export { redactSecrets, safeVaultLog } from "./safe-log.js";
