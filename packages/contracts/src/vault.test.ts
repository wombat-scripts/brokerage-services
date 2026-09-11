import { describe, expect, it } from "vitest";
import { WOMBAT_FIRM_ID } from "./firm.js";
import { selectVaultSecret, vaultKindForJob, type VaultSecretMeta } from "./vault.js";

const nab: VaultSecretMeta = {
  secretId: "wombat-nab-broker-portal",
  firmId: WOMBAT_FIRM_ID,
  kind: "lender_portal",
  label: "NAB Broker Portal",
  mfaMode: "attended",
};

const corelogic: VaultSecretMeta = {
  secretId: "wombat-corelogic-property-hub",
  firmId: WOMBAT_FIRM_ID,
  kind: "corelogic",
  label: "CoreLogic Property Hub",
  mfaMode: "attended",
};

describe("vault job mapping", () => {
  it("maps NAB lender jobs and CoreLogic AVM to secret kinds", () => {
    expect(vaultKindForJob("valuation.lender", "NAB")).toBe("lender_portal");
    expect(vaultKindForJob("pricing.lender", "NAB")).toBe("lender_portal");
    expect(vaultKindForJob("valuation.corelogic_avm")).toBe("corelogic");
    expect(vaultKindForJob("valuation.lender", "CBA")).toBeUndefined();
    expect(vaultKindForJob("opportunity.matrix_cell")).toBeUndefined();
  });

  it("selects metadata by kind without needing vendor secret names", () => {
    const secrets = [nab, corelogic];
    expect(selectVaultSecret(secrets, "valuation.lender", "NAB")?.secretId).toBe(
      "wombat-nab-broker-portal",
    );
    expect(selectVaultSecret(secrets, "valuation.corelogic_avm")?.secretId).toBe(
      "wombat-corelogic-property-hub",
    );
    expect(selectVaultSecret(secrets, "pricing.lender", "WBC")).toBeUndefined();
  });
});
