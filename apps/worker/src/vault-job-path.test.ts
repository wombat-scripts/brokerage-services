import { afterEach, describe, expect, it } from "vitest";
import { WOMBAT_FIRM_ID, type CrmWriteBackAdapter, type OpportunityRun } from "@wombat/contracts";
import {
  FIXTURE_CORELOGIC_PAYLOAD,
  FIXTURE_NAB_ATTENDED_PAYLOAD,
  FIXTURE_NAB_TOTP_PAYLOAD,
  GcpCredentialVault,
  createFixtureSecretAccessClient,
  GCP_VAULT_DEFAULTS,
} from "@wombat/gcp-vault";
import { createMemoryStore } from "@wombat/store";
import { newJob } from "./jobs.js";
import { processJob } from "./processor.js";

class UnusedCrm implements CrmWriteBackAdapter {
  readonly firmId = WOMBAT_FIRM_ID;
  readonly provider = "notion" as const;
  async appendOpportunityRun(_run: OpportunityRun): Promise<{ pageId: string }> {
    throw new Error("CRM should not run on vault-only jobs");
  }
  async patchPropertySummary(): Promise<void> {
    throw new Error("CRM should not run on vault-only jobs");
  }
  async patchLoanOpportunity(): Promise<void> {
    throw new Error("CRM should not run on vault-only jobs");
  }
}

const secretMaterial = [
  FIXTURE_NAB_ATTENDED_PAYLOAD.password,
  FIXTURE_NAB_TOTP_PAYLOAD.totp_seed,
  FIXTURE_CORELOGIC_PAYLOAD.password,
];

function assertNoSecretMaterial(value: unknown) {
  const text = JSON.stringify(value);
  for (const fragment of secretMaterial) {
    expect(text).not.toContain(fragment);
  }
}

describe("vault job path", () => {
  const previousFixtures = process.env.PHASE1_FIXTURES;

  afterEach(() => {
    if (previousFixtures === undefined) {
      delete process.env.PHASE1_FIXTURES;
    } else {
      process.env.PHASE1_FIXTURES = previousFixtures;
    }
  });

  it("pauses NAB valuation at awaiting_attended_mfa when the secret is attended", async () => {
    process.env.PHASE1_FIXTURES = "false";
    const store = createMemoryStore();
    const vault = new GcpCredentialVault();
    const queued = await store.jobs.create(
      newJob({
        kind: "valuation.lender",
        requestedBy: "seat:andre",
        input: {
          firmId: WOMBAT_FIRM_ID,
          lenderCode: "NAB",
          address: {
            line1: "15 Ashley Avenue",
            suburb: "West Pennant Hills",
            state: "NSW",
            postcode: "2125",
          },
        },
      }),
    );
    const processed = await processJob(queued, store, new UnusedCrm(), vault);
    expect(processed.status).toBe("awaiting_attended_mfa");
    expect(processed.error?.code).toBe("AWAITING_ATTENDED_MFA");
    const unlock = processed.audit.find((event) => event.action === "vault.unlock");
    expect(unlock?.detail).toMatchObject({
      secretId: "wombat-nab-broker-portal",
      status: "awaiting_attended_mfa",
      mfaMode: "attended",
      path: "attended",
    });
    expect(processed.output).toBeUndefined();
    assertNoSecretMaterial(processed);
  });

  it("marks TOTP-managed NAB unlock ready without leaking the seed", async () => {
    process.env.PHASE1_FIXTURES = "false";
    const store = createMemoryStore();
    const vault = new GcpCredentialVault({
      client: createFixtureSecretAccessClient({
        [GCP_VAULT_DEFAULTS.secrets.nab]: JSON.stringify(FIXTURE_NAB_TOTP_PAYLOAD),
        [GCP_VAULT_DEFAULTS.secrets.corelogic]: JSON.stringify(FIXTURE_CORELOGIC_PAYLOAD),
      }),
    });
    const queued = await store.jobs.create(
      newJob({
        kind: "valuation.lender",
        requestedBy: "seat:andre",
        input: {
          firmId: WOMBAT_FIRM_ID,
          lenderCode: "NAB",
          address: {
            line1: "15 Ashley Avenue",
            suburb: "West Pennant Hills",
            state: "NSW",
            postcode: "2125",
          },
        },
      }),
    );
    const processed = await processJob(queued, store, new UnusedCrm(), vault);
    expect(processed.status).toBe("failed");
    expect(processed.error?.code).toBe("LIVE_PORTAL_OUT_OF_SCOPE");
    const unlock = processed.audit.find((event) => event.action === "vault.unlock");
    expect(unlock?.detail).toMatchObject({
      secretId: "wombat-nab-broker-portal",
      status: "ready",
      mfaMode: "totp_managed",
      path: "totp_managed",
    });
    assertNoSecretMaterial(processed);
    assertNoSecretMaterial(unlock);
  });

  it("pauses CoreLogic AVM at awaiting_attended_mfa for email_attended", async () => {
    process.env.PHASE1_FIXTURES = "false";
    const store = createMemoryStore();
    const vault = new GcpCredentialVault();
    const queued = await store.jobs.create(
      newJob({
        kind: "valuation.corelogic_avm",
        requestedBy: "seat:andre",
        input: { firmId: WOMBAT_FIRM_ID },
      }),
    );
    const processed = await processJob(queued, store, new UnusedCrm(), vault);
    expect(processed.status).toBe("awaiting_attended_mfa");
    expect(processed.error?.code).toBe("AWAITING_ATTENDED_MFA");
    const unlock = processed.audit.find((event) => event.action === "vault.unlock");
    expect(unlock?.detail).toMatchObject({
      secretId: "wombat-corelogic-property-hub",
      status: "awaiting_attended_mfa",
      mfaMode: "attended",
      path: "attended",
    });
    assertNoSecretMaterial(processed);
  });
});
