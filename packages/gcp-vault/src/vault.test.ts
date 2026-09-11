import { describe, expect, it, vi } from "vitest";
import { WOMBAT_FIRM_ID, vaultSecretMetaSchema } from "@wombat/contracts";
import { createFixtureSecretAccessClient, secretVersionName } from "./client.js";
import { GCP_VAULT_DEFAULTS } from "./defaults.js";
import {
  FIXTURE_CORELOGIC_PAYLOAD,
  FIXTURE_NAB_ATTENDED_PAYLOAD,
  FIXTURE_NAB_TOTP_PAYLOAD,
} from "./fixtures.js";
import {
  parseCorelogicPropertyHubPayload,
  parseNabBrokerPortalPayload,
} from "./payloads.js";
import { redactSecrets } from "./safe-log.js";
import { GcpCredentialVault, createGcpVaultFromEnv } from "./vault.js";

function serializedHasSecretMaterial(value: unknown): boolean {
  const text = JSON.stringify(value);
  return (
    text.includes(FIXTURE_NAB_ATTENDED_PAYLOAD.password) ||
    text.includes(FIXTURE_CORELOGIC_PAYLOAD.password) ||
    text.includes(FIXTURE_NAB_TOTP_PAYLOAD.totp_seed)
  );
}

describe("vault payload shapes", () => {
  it("parses NAB attended and totp fixture JSON", () => {
    const attended = parseNabBrokerPortalPayload(
      JSON.stringify(FIXTURE_NAB_ATTENDED_PAYLOAD),
      GCP_VAULT_DEFAULTS.secrets.nab,
    );
    expect(attended).toEqual({
      username: "fixture-nab-user",
      password: "fixture-nab-password-not-production",
    });
    expect(attended).not.toHaveProperty("totp_seed");

    const totp = parseNabBrokerPortalPayload(
      JSON.stringify(FIXTURE_NAB_TOTP_PAYLOAD),
      GCP_VAULT_DEFAULTS.secrets.nab,
    );
    expect(totp.totp_seed).toBe("FIXTURETOTPSEEDNOTPRODUCTION");
    expect(totp.username).toBe("fixture-nab-totp-user");
  });

  it("parses CoreLogic email_attended fixture JSON", () => {
    const payload = parseCorelogicPropertyHubPayload(
      JSON.stringify(FIXTURE_CORELOGIC_PAYLOAD),
      GCP_VAULT_DEFAULTS.secrets.corelogic,
    );
    expect(payload.portal).toBe("corelogic_property_hub");
    expect(payload.mfa_mode).toBe("email_attended");
    expect(payload.username).toBe("fixture-corelogic-user");
    expect(payload.entry_email).toBe("fixture-ops@example.test");
  });

  it("does not echo passwords when shape parse fails", () => {
    expect(() =>
      parseNabBrokerPortalPayload(
        JSON.stringify({ username: "x", password: "leak-this-password-please" }),
        "wombat-nab-broker-portal",
      ),
    ).not.toThrow();
    expect(() =>
      parseNabBrokerPortalPayload(
        JSON.stringify({ password: "leak-this-password-please" }),
        "wombat-nab-broker-portal",
      ),
    ).toThrow(/Invalid vault payload shape/);
    try {
      parseNabBrokerPortalPayload(
        JSON.stringify({ password: "leak-this-password-please" }),
        "wombat-nab-broker-portal",
      );
    } catch (error) {
      expect(String(error)).not.toContain("leak-this-password-please");
    }
  });
});

describe("GcpCredentialVault", () => {
  it("lists metadata only for NAB and CoreLogic", async () => {
    const vault = new GcpCredentialVault();
    const listed = await vault.list(WOMBAT_FIRM_ID);
    expect(listed.map((item) => item.secretId)).toEqual([
      "wombat-nab-broker-portal",
      "wombat-corelogic-property-hub",
    ]);
    expect(listed[0]).toMatchObject({
      kind: "lender_portal",
      label: "NAB Broker Portal",
      usernameHint: "fixture-nab-user",
      mfaMode: "attended",
    });
    expect(listed[1]).toMatchObject({
      kind: "corelogic",
      label: "CoreLogic Property Hub",
      usernameHint: "fixture-corelogic-user",
      mfaMode: "attended",
    });
    for (const item of listed) {
      expect(vaultSecretMetaSchema.parse(item)).toEqual(item);
      expect(item).not.toHaveProperty("password");
      expect(item).not.toHaveProperty("totp_seed");
    }
    expect(serializedHasSecretMaterial(listed)).toBe(false);
  });

  it("surfaces awaiting_attended_mfa for email_attended / attended secrets", async () => {
    const vault = new GcpCredentialVault();
    const nab = await vault.requestUnlock({
      firmId: WOMBAT_FIRM_ID,
      secretId: "wombat-nab-broker-portal",
      jobId: "job_nab",
      requester: "seat:andre",
    });
    expect(nab.status).toBe("awaiting_attended_mfa");
    await expect(vault.bindSession({ unlockId: nab.unlockId, jobId: "job_nab" })).rejects.toThrow(
      /attended MFA/,
    );

    const corelogic = await vault.requestUnlock({
      firmId: WOMBAT_FIRM_ID,
      secretId: "wombat-corelogic-property-hub",
      jobId: "job_cl",
      requester: "seat:andre",
    });
    expect(corelogic.status).toBe("awaiting_attended_mfa");
    expect(serializedHasSecretMaterial(nab)).toBe(false);
    expect(serializedHasSecretMaterial(corelogic)).toBe(false);
  });

  it("marks totp_managed ready when totp_seed is present and binds a session", async () => {
    const vault = new GcpCredentialVault({
      client: createFixtureSecretAccessClient({
        [GCP_VAULT_DEFAULTS.secrets.nab]: JSON.stringify(FIXTURE_NAB_TOTP_PAYLOAD),
        [GCP_VAULT_DEFAULTS.secrets.corelogic]: JSON.stringify(FIXTURE_CORELOGIC_PAYLOAD),
      }),
    });
    const listed = await vault.list(WOMBAT_FIRM_ID);
    expect(listed[0]?.mfaMode).toBe("totp_managed");
    expect(serializedHasSecretMaterial(listed)).toBe(false);

    const unlock = await vault.requestUnlock({
      firmId: WOMBAT_FIRM_ID,
      secretId: "wombat-nab-broker-portal",
      jobId: "job_totp",
      requester: "seat:andre",
    });
    expect(unlock.status).toBe("ready");
    const session = await vault.bindSession({ unlockId: unlock.unlockId, jobId: "job_totp" });
    expect(session.sessionHandle).toMatch(/^gcp:/);
    expect(session.ttlSeconds).toBe(900);
    expect(serializedHasSecretMaterial(unlock)).toBe(false);
    expect(serializedHasSecretMaterial(session)).toBe(false);
  });

  it("stores opaque storageState and redacts secret-shaped keys", async () => {
    const vault = new GcpCredentialVault();
    await vault.putStorageState({
      firmId: WOMBAT_FIRM_ID,
      secretId: "wombat-nab-broker-portal",
      encryptedState: "opaque-blob",
    });
    expect(
      await vault.getStorageState({
        firmId: WOMBAT_FIRM_ID,
        secretId: "wombat-nab-broker-portal",
      }),
    ).toBe("opaque-blob");

    expect(redactSecrets({ password: "hunter2", totp_seed: "abc", jobId: "abc" })).toEqual({
      password: "[redacted]",
      totp_seed: "[redacted]",
      jobId: "abc",
    });
  });

  it("uses the fixture client from env unless GCP_VAULT_MODE=live", () => {
    const vault = createGcpVaultFromEnv({
      GCP_PROJECT_ID: "wombat-brokerage-services",
      GCP_SECRET_NAB: "wombat-nab-broker-portal",
      GCP_SECRET_CORELOGIC: "wombat-corelogic-property-hub",
    });
    expect(vault).toBeInstanceOf(GcpCredentialVault);
  });

  it("builds global secret version names (user-managed AU replication)", () => {
    expect(secretVersionName("wombat-brokerage-services", "wombat-nab-broker-portal")).toBe(
      "projects/wombat-brokerage-services/secrets/wombat-nab-broker-portal/versions/latest",
    );
    expect(
      secretVersionName(
        "wombat-brokerage-services",
        "wombat-nab-broker-portal",
        "australia-southeast1",
      ),
    ).toBe(
      "projects/wombat-brokerage-services/locations/australia-southeast1/secrets/wombat-nab-broker-portal/versions/latest",
    );
  });

  it("does not call a live client from the fixture path", async () => {
    const accessSecretJson = vi.fn(async () => JSON.stringify(FIXTURE_NAB_ATTENDED_PAYLOAD));
    const vault = new GcpCredentialVault({
      client: { accessSecretJson },
      secrets: { nab: "wombat-nab-broker-portal", corelogic: "wombat-corelogic-property-hub" },
    });
    await vault.requestUnlock({
      firmId: WOMBAT_FIRM_ID,
      secretId: "wombat-nab-broker-portal",
      jobId: "job_1",
      requester: "seat:andre",
    });
    expect(accessSecretJson).toHaveBeenCalledWith("wombat-nab-broker-portal");
    expect(accessSecretJson).not.toHaveBeenCalledWith(expect.stringMatching(/secretmanager.googleapis/));
  });
});
