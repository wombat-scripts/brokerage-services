import { describe, expect, it } from "vitest";
import { CrmWriteBackError, WOMBAT_FIRM_ID, type OpportunityRun } from "@wombat/contracts";
import { NotionCrmWriteBackAdapter } from "./adapter.js";

const run: OpportunityRun = {
  runId: "run_1",
  firmId: WOMBAT_FIRM_ID,
  ranAt: "2026-09-11T00:00:00.000Z",
  requestedBy: "seat:andre",
  clientPageId: "c1",
  propertyPageId: "p1",
  loanPageId: "l1",
  currentLenderCode: "NAB",
  targetLenderCode: "NAB",
  loanBalanceAud: 800000,
  valAud: 1025000,
  valDate: "2026-09-11",
  valSource: "other",
  lvr: 800000 / 1025000,
  savingFlag: "yes",
  valuationJobId: "v1",
  pricingJobId: "p1",
  matrixJobId: "m1",
  artefactUris: [],
};

describe("NotionCrmWriteBackAdapter", () => {
  it("fail-closes when Notion is not configured", async () => {
    const adapter = new NotionCrmWriteBackAdapter();
    await expect(adapter.appendOpportunityRun(run)).rejects.toMatchObject({
      name: "CrmWriteBackError",
      code: "NOTION_NOT_CONFIGURED",
      retryable: true,
    } satisfies Partial<CrmWriteBackError>);
  });
});
