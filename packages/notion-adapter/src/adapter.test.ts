import { describe, expect, it, vi } from "vitest";
import { CrmWriteBackError, WOMBAT_FIRM_ID, type OpportunityRun } from "@wombat/contracts";
import { NotionCrmWriteBackAdapter } from "./adapter.js";
import { NOTION_LOANS, NOTION_OPPORTUNITY_RUNS } from "./mapping.js";
import type { NotionPagesClient } from "./client.js";

const run: OpportunityRun = {
  runId: "01JPHASE11PRAI0001",
  firmId: WOMBAT_FIRM_ID,
  ranAt: "2026-09-11T06:00:00.000Z",
  requestedBy: "platform-andre",
  clientPageId: "client_prai",
  propertyPageId: "property_15_ashley",
  loanPageId: "loan_nab_800k",
  currentLenderCode: "NAB",
  targetLenderCode: "NAB",
  loanBalanceAud: 800000,
  valAud: 1025000,
  valDate: "2026-09-11",
  valSource: "other",
  lvr: 800000 / 1025000,
  currentRate: 0.065,
  currentRateSource: "notion_loan",
  newRate: 0.0605,
  savingFlag: "yes",
  deltaBp: 45,
  deltaAudPa: 3600,
  status: "succeeded",
  valuationJobId: "job_val_fixture_prai_nab",
  pricingJobId: "job_price_fixture_prai_nab",
  matrixJobId: "job_matrix_fixture_prai_nab",
  artefactUris: [],
};

function mockPages(overrides: Partial<NotionPagesClient> = {}): NotionPagesClient {
  return {
    createPage: vi.fn(async () => ({ id: "page_created" })),
    getPage: vi.fn(async (pageId: string) => ({
      id: pageId,
      properties: {},
      notes: "existing",
      opportunityTypes: ["Retention review"],
    })),
    updatePage: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("NotionCrmWriteBackAdapter", () => {
  it("fail-closes when Notion is not configured", async () => {
    const adapter = new NotionCrmWriteBackAdapter();
    await expect(adapter.appendOpportunityRun(run)).rejects.toMatchObject({
      name: "CrmWriteBackError",
      code: "NOTION_NOT_CONFIGURED",
      retryable: true,
    } satisfies Partial<CrmWriteBackError>);
  });

  it("fail-closes when the Opportunity Runs database id is missing", async () => {
    const pages = mockPages();
    const adapter = new NotionCrmWriteBackAdapter({ pages });
    await expect(adapter.appendOpportunityRun(run)).rejects.toMatchObject({
      name: "CrmWriteBackError",
      code: "NOTION_RUNS_DB_MISSING",
      retryable: false,
    } satisfies Partial<CrmWriteBackError>);
    expect(pages.createPage).not.toHaveBeenCalled();
  });

  it("creates a page on the live Opportunity Runs database", async () => {
    const pages = mockPages();
    const adapter = new NotionCrmWriteBackAdapter({
      pages,
      opportunityRunsDatabaseId: "54120476-0e40-4887-b457-0ff486ecb205",
    });

    await expect(adapter.appendOpportunityRun(run)).resolves.toEqual({ pageId: "page_created" });

    expect(pages.createPage).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(pages.createPage).mock.calls[0]?.[0];
    expect(payload?.parentDatabaseId).toBe("54120476-0e40-4887-b457-0ff486ecb205");
    expect(payload?.properties[NOTION_OPPORTUNITY_RUNS.runId]).toEqual({
      rich_text: [{ type: "text", text: { content: "01JPHASE11PRAI0001" } }],
    });
    expect(payload?.properties[NOTION_OPPORTUNITY_RUNS.firmId]).toEqual({
      rich_text: [{ type: "text", text: { content: "wombat" } }],
    });
    expect(payload?.properties[NOTION_OPPORTUNITY_RUNS.savingFlag]).toEqual({
      select: { name: "yes" },
    });
    expect(payload?.properties[NOTION_OPPORTUNITY_RUNS.status]).toEqual({
      select: { name: "succeeded" },
    });
    expect(payload?.properties[NOTION_OPPORTUNITY_RUNS.deltaBp]).toEqual({ number: 45 });
    expect(Object.keys(payload?.properties ?? {})).not.toContain(NOTION_LOANS.interestRate);
  });

  it("fail-closes when Notion createPage rejects", async () => {
    const pages = mockPages({
      createPage: vi.fn(async () => {
        throw new Error("Notion API 400: validation_error");
      }),
    });
    const adapter = new NotionCrmWriteBackAdapter({
      pages,
      opportunityRunsDatabaseId: "54120476-0e40-4887-b457-0ff486ecb205",
    });

    await expect(adapter.appendOpportunityRun(run)).rejects.toMatchObject({
      name: "CrmWriteBackError",
      code: "NOTION_WRITE_FAILED",
      retryable: true,
    } satisfies Partial<CrmWriteBackError>);
  });

  it("does not write Interest Rate on property or loan patches", async () => {
    const pages = mockPages();
    const adapter = new NotionCrmWriteBackAdapter({ pages });

    await adapter.patchPropertySummary({
      propertyPageId: "property_15_ashley",
      estimatedValueAud: 1025000,
      sourceRunId: run.runId,
    });
    await adapter.patchLoanOpportunity({
      loanPageId: "loan_nab_800k",
      opportunityTypeAdd: ["Reprice"],
      sourceRunId: run.runId,
    });

    const propertyPayload = vi.mocked(pages.updatePage).mock.calls[0]?.[0];
    const loanPayload = vi.mocked(pages.updatePage).mock.calls[1]?.[0];
    expect(Object.keys(propertyPayload?.properties ?? {})).not.toContain(NOTION_LOANS.interestRate);
    expect(Object.keys(loanPayload?.properties ?? {})).not.toContain(NOTION_LOANS.interestRate);
    expect(JSON.stringify(propertyPayload)).not.toMatch(/Interest Rate/i);
    expect(JSON.stringify(loanPayload)).not.toMatch(/Interest Rate/i);
  });
});
