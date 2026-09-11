import { describe, expect, it } from "vitest";
import { WOMBAT_FIRM_ID } from "@wombat/contracts";
import { redactSecrets } from "./safe-log.js";
import { BitwardenCredentialVault } from "./vault.js";

describe("BitwardenCredentialVault", () => {
  it("lists metadata only and unlocks into attended MFA", async () => {
    const vault = new BitwardenCredentialVault();
    const listed = await vault.list(WOMBAT_FIRM_ID);
    expect(listed).toEqual([]);

    const unlock = await vault.requestUnlock({
      firmId: WOMBAT_FIRM_ID,
      secretId: "nab-broker-portal",
      jobId: "job_1",
      requester: "seat:andre",
    });
    expect(unlock.status).toBe("awaiting_attended_mfa");
    await expect(vault.bindSession({ unlockId: unlock.unlockId, jobId: "job_1" })).rejects.toThrow(
      /attended MFA/,
    );
  });

  it("redacts secret-shaped keys", () => {
    expect(redactSecrets({ password: "hunter2", jobId: "abc" })).toEqual({
      password: "[redacted]",
      jobId: "abc",
    });
  });
});
