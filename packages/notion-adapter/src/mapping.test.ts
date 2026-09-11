import { describe, expect, it } from "vitest";
import { buildLoanOpportunityProperties, citationLine, NOTION_LOANS } from "./mapping.js";

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
  });
});
