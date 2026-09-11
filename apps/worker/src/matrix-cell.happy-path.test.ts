import { describe, expect, it } from "vitest";
import {
  WOMBAT_FIRM_ID,
  computeDeltaBp,
  computeLvr,
  type CrmWriteBackAdapter,
  type OpportunityRun,
} from "@wombat/contracts";
import { createMemoryStore } from "@wombat/store";
import { runFixtureMatrixCell } from "./compose-fixture-cell.js";
import { PRAI_NAB_FIXTURE } from "./fixtures/prai-nab.js";

class RecordingCrm implements CrmWriteBackAdapter {
  readonly firmId = WOMBAT_FIRM_ID;
  readonly provider = "notion" as const;
  runs: OpportunityRun[] = [];
  propertyPatches: unknown[] = [];
  loanPatches: unknown[] = [];

  async appendOpportunityRun(run: OpportunityRun) {
    this.runs.push(run);
    return { pageId: `notion_${run.runId}` };
  }

  async patchPropertySummary(args: unknown) {
    this.propertyPatches.push(args);
  }

  async patchLoanOpportunity(args: unknown) {
    this.loanPatches.push(args);
  }
}

describe("Prai × NAB fixture matrix_cell", () => {
  it("flags Saving Yes at 45bp for $800k / $1,025,000 / 6.50% → 6.05%", async () => {
    const store = createMemoryStore();
    const crm = new RecordingCrm();

    const { valuation, pricing, matrix } = await runFixtureMatrixCell(store, crm, {
      requestedBy: "seat:andre",
      clientPageId: "client_prai",
      propertyPageId: "property_15_ashley",
      loanPageId: "loan_nab_800k",
    });

    expect(valuation.status).toBe("succeeded");
    expect(pricing.status).toBe("succeeded");
    expect(matrix.status).toBe("succeeded");
    expect(matrix.firmId).toBe(WOMBAT_FIRM_ID);

    const lvr = computeLvr(PRAI_NAB_FIXTURE.loanBalanceAud, PRAI_NAB_FIXTURE.valueAud);
    expect(lvr).toBeCloseTo(0.78, 2);
    expect(lvr).toBeCloseTo(800000 / 1025000, 10);

    const deltaBp = computeDeltaBp(PRAI_NAB_FIXTURE.currentRate, PRAI_NAB_FIXTURE.newRate);
    expect(deltaBp).toBe(45);

    expect(matrix.output).toMatchObject({
      savingFlag: "yes",
      currentRate: 0.065,
      newRate: 0.0605,
      deltaBp: 45,
      rankHint: "stay_reprice",
    });

    const run = await store.opportunityRuns.get(matrix.output!.opportunityRunId);
    expect(run).toMatchObject({
      firmId: WOMBAT_FIRM_ID,
      currentLenderCode: "NAB",
      targetLenderCode: "NAB",
      loanBalanceAud: 800000,
      valAud: 1025000,
      lvr,
      currentRate: 0.065,
      currentRateSource: "notion_loan",
      newRate: 0.0605,
      savingFlag: "yes",
      deltaBp: 45,
      valuationJobId: valuation.jobId,
      pricingJobId: pricing.jobId,
      matrixJobId: matrix.jobId,
    });
    expect(run?.notes).toMatch(/Flag for Tom/);

    expect(crm.runs).toHaveLength(1);
    expect(crm.propertyPatches).toHaveLength(1);
    expect(crm.loanPatches).toHaveLength(1);
    expect(JSON.stringify(crm.loanPatches[0])).not.toMatch(/Interest Rate/i);
  });
});
