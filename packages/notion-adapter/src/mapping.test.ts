import { describe, expect, it } from "vitest";
import { WOMBAT_FIRM_ID, type OpportunityRun } from "@wombat/contracts";
import {
  NOTION_LOANS,
  NOTION_OPPORTUNITY_RUNS,
  assertNoInterestRate,
  buildLoanOpportunityProperties,
  buildOpportunityRunPageProperties,
  buildPropertySummaryProperties,
  citationLine,
  mapLenderSelect,
} from "./mapping.js";

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
  notes: "Flag for Tom — not advice.",
};

describe("loan write-back mapping", () => {
  it("never includes Interest Rate", () => {
    const properties = buildLoanOpportunityProperties({
      patch: {
        loanPageId: "loan_1",
        opportunityTypeAdd: ["Reprice"],
        opportunityStatus: "Contact now",
        doThisNext: "Flag Saving Yes for Tom",
        sourceRunId: "run_1",
      },
      existingTypes: ["Retention review"],
      existingNotes: "existing",
    });

    expect(Object.keys(properties)).not.toContain(NOTION_LOANS.interestRate);
    expect(properties[NOTION_LOANS.opportunityType]).toEqual({
      multi_select: [{ name: "Retention review" }, { name: "Reprice" }],
    });
    expect(JSON.stringify(properties)).toContain(citationLine("run_1"));
    expect(JSON.stringify(properties)).not.toMatch(/Interest Rate/i);
  });
});

describe("property write-back mapping", () => {
  it("never includes Interest Rate", () => {
    const properties = buildPropertySummaryProperties({
      patch: {
        propertyPageId: "property_1",
        estimatedValueAud: 1025000,
        valueDate: "2026-09-11",
        opportunityStatus: "Contact now",
        doThisNext: "Flag Saving Yes for Tom",
        sourceRunId: "run_1",
      },
    });

    expect(Object.keys(properties)).not.toContain(NOTION_LOANS.interestRate);
    expect(JSON.stringify(properties)).not.toMatch(/Interest Rate/i);
    assertNoInterestRate(properties);
  });
});

describe("opportunity run page mapping", () => {
  it("maps Phase 0 fields to the live Opportunity Runs property names", () => {
    const properties = buildOpportunityRunPageProperties(run);

    expect(properties[NOTION_OPPORTUNITY_RUNS.name]).toEqual({
      title: [{ type: "text", text: { content: "NAB yes 2026-09-11" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.runId]).toEqual({
      rich_text: [{ type: "text", text: { content: "01JPHASE11PRAI0001" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.firmId]).toEqual({
      rich_text: [{ type: "text", text: { content: "wombat" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.client]).toEqual({
      rich_text: [{ type: "text", text: { content: "client_prai" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.property]).toEqual({
      rich_text: [{ type: "text", text: { content: "property_15_ashley" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.loan]).toEqual({
      rich_text: [{ type: "text", text: { content: "loan_nab_800k" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.currentLender]).toEqual({ select: { name: "NAB" } });
    expect(properties[NOTION_OPPORTUNITY_RUNS.targetLender]).toEqual({ select: { name: "NAB" } });
    expect(properties[NOTION_OPPORTUNITY_RUNS.loanBalanceAud]).toEqual({ number: 800000 });
    expect(properties[NOTION_OPPORTUNITY_RUNS.valAud]).toEqual({ number: 1025000 });
    expect(properties[NOTION_OPPORTUNITY_RUNS.valDate]).toEqual({ date: { start: "2026-09-11" } });
    expect(properties[NOTION_OPPORTUNITY_RUNS.valSource]).toEqual({ select: { name: "other" } });
    expect(properties[NOTION_OPPORTUNITY_RUNS.lvr]).toEqual({ number: 800000 / 1025000 });
    expect(properties[NOTION_OPPORTUNITY_RUNS.currentRate]).toEqual({ number: 0.065 });
    expect(properties[NOTION_OPPORTUNITY_RUNS.currentRateSource]).toEqual({
      select: { name: "notion_loan" },
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.newRate]).toEqual({ number: 0.0605 });
    expect(properties[NOTION_OPPORTUNITY_RUNS.savingFlag]).toEqual({ select: { name: "yes" } });
    expect(properties[NOTION_OPPORTUNITY_RUNS.deltaBp]).toEqual({ number: 45 });
    expect(properties[NOTION_OPPORTUNITY_RUNS.deltaAudPa]).toEqual({ number: 3600 });
    expect(properties[NOTION_OPPORTUNITY_RUNS.valuationJobId]).toEqual({
      rich_text: [{ type: "text", text: { content: "job_val_fixture_prai_nab" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.pricingJobId]).toEqual({
      rich_text: [{ type: "text", text: { content: "job_price_fixture_prai_nab" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.matrixJobId]).toEqual({
      rich_text: [{ type: "text", text: { content: "job_matrix_fixture_prai_nab" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.status]).toEqual({ select: { name: "succeeded" } });
    expect(properties[NOTION_OPPORTUNITY_RUNS.requestedBy]).toEqual({
      rich_text: [{ type: "text", text: { content: "platform-andre" } }],
    });
    expect(properties[NOTION_OPPORTUNITY_RUNS.ranAt]).toEqual({
      date: { start: "2026-09-11T06:00:00.000Z" },
    });

    expect(Object.keys(properties)).not.toContain(NOTION_LOANS.interestRate);
    expect(Object.keys(properties)).not.toContain("Run Id");
    expect(Object.keys(properties)).not.toContain("Delta Bp");
    expect(JSON.stringify(properties)).not.toMatch(/Interest Rate/i);
    assertNoInterestRate(properties);
  });

  it("maps unknown lenders to Other so Notion select write-back stays valid", () => {
    expect(mapLenderSelect("WBC")).toBe("Other");
    expect(mapLenderSelect("NAB")).toBe("NAB");
  });
});
