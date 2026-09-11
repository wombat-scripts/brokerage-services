import { describe, expect, it } from "vitest";
import {
  jobSchema,
  opportunityRunSchema,
  computeDeltaBp,
  computeLvr,
  computeSavingFlag,
} from "@wombat/contracts";
import {
  FIXTURE_CELLS,
  FIXTURE_JOBS,
  FIXTURE_RUNS,
  PRAI_NAB_DELTA_BP,
  PRAI_NAB_LVR,
  PRAI_NAB_SAVING,
  PRAI_SUBJECT,
} from "./fixtures";

describe("Wombat Desk fixture book", () => {
  it("keeps the Prai × NAB happy path at Phase 1 numbers", () => {
    expect(PRAI_NAB_LVR).toBeCloseTo(800000 / 1025000, 10);
    expect(PRAI_NAB_LVR).toBeCloseTo(0.78, 2);
    expect(PRAI_NAB_DELTA_BP).toBe(45);
    expect(PRAI_NAB_DELTA_BP).toBe(computeDeltaBp(0.065, 0.0605));
    expect(PRAI_NAB_SAVING).toBe("yes");
    expect(computeSavingFlag({ currentRate: 0.065, newRate: 0.0605 })).toBe("yes");
    expect(computeLvr(800_000, 1_025_000)).toBe(PRAI_NAB_LVR);

    const happy = FIXTURE_CELLS.find((cell) => cell.isHappyPath);
    expect(happy).toMatchObject({
      subject: PRAI_SUBJECT,
      currentLenderCode: "NAB",
      targetLenderCode: "NAB",
      valAud: 1_025_000,
      currentRate: 0.065,
      newRate: 0.0605,
      savingFlag: "yes",
      deltaBp: 45,
      rankHint: "stay_reprice",
    });
  });

  it("includes Saving No and unknown cells so the grid is a matrix", () => {
    const flags = new Set(FIXTURE_CELLS.map((cell) => cell.savingFlag));
    expect(flags.has("yes")).toBe(true);
    expect(flags.has("no")).toBe(true);
    expect(flags.has("unknown")).toBe(true);
    expect(FIXTURE_CELLS.length).toBeGreaterThanOrEqual(3);
  });

  it("shapes runs and jobs to @wombat/contracts", () => {
    for (const run of FIXTURE_RUNS) {
      const parsed = opportunityRunSchema.safeParse(run);
      expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.format())).toBe(
        true,
      );
    }
    for (const job of FIXTURE_JOBS) {
      const parsed = jobSchema.safeParse(job);
      expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.format())).toBe(
        true,
      );
    }
  });

  it("covers queued, running, awaiting MFA, succeeded, and failed jobs", () => {
    const statuses = new Set(FIXTURE_JOBS.map((job) => job.status));
    expect(statuses.has("queued")).toBe(true);
    expect(statuses.has("running")).toBe(true);
    expect(statuses.has("awaiting_attended_mfa")).toBe(true);
    expect(statuses.has("succeeded")).toBe(true);
    expect(statuses.has("failed")).toBe(true);
  });
});
