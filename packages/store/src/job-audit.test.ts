import { describe, expect, it } from "vitest";
import { JOB_CONTRACT_VERSION, WOMBAT_FIRM_ID, type Job } from "@wombat/contracts";
import { createMemoryStore } from "./memory.js";

function jobWithoutFirmAudit(): Job {
  return {
    jobId: "job_missing_firm_audit",
    firmId: WOMBAT_FIRM_ID,
    kind: "valuation.lender",
    version: JOB_CONTRACT_VERSION,
    status: "queued",
    requestedBy: "seat:andre",
    createdAt: "2026-09-11T06:00:00.000Z",
    updatedAt: "2026-09-11T06:00:00.000Z",
    input: { fixture: true },
    artefacts: [],
    audit: [
      {
        at: "2026-09-11T06:00:00.000Z",
        actor: "seat:andre",
        action: "job.created",
        detail: { kind: "valuation.lender" },
      },
    ],
    subjectRefs: {},
  };
}

describe("job store audit", () => {
  it("rejects create when audit is missing firm_id", async () => {
    const store = createMemoryStore();
    await expect(store.jobs.create(jobWithoutFirmAudit())).rejects.toThrow(/firm_id/);
  });
});
