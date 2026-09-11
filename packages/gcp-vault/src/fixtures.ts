import { GCP_VAULT_DEFAULTS } from "./defaults.js";

/**
 * CI / local fixture payloads. Obviously fake — must not look like production.
 * Never log these objects without going through redactSecrets.
 */
export const FIXTURE_NAB_ATTENDED_PAYLOAD = {
  username: "fixture-nab-user",
  password: "fixture-nab-password-not-production",
} as const;

export const FIXTURE_NAB_TOTP_PAYLOAD = {
  username: "fixture-nab-totp-user",
  password: "fixture-nab-password-not-production",
  totp_seed: "FIXTURETOTPSEEDNOTPRODUCTION",
} as const;

export const FIXTURE_CORELOGIC_PAYLOAD = {
  portal: "corelogic_property_hub",
  entry_email: "fixture-ops@example.test",
  username: "fixture-corelogic-user",
  password: "fixture-corelogic-password-not-production",
  mfa_mode: "email_attended",
  mfa_email_hint: "fixture-ops@example.test",
} as const;

export function defaultFixtureSecretJson(): Record<string, string> {
  return {
    [GCP_VAULT_DEFAULTS.secrets.nab]: JSON.stringify(FIXTURE_NAB_ATTENDED_PAYLOAD),
    [GCP_VAULT_DEFAULTS.secrets.corelogic]: JSON.stringify(FIXTURE_CORELOGIC_PAYLOAD),
  };
}
