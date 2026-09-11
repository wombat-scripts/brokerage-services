import { describe, expect, it } from "vitest";
import { DESK_TOOLS } from "./desk-tools";

describe("desk tools hub", () => {
  it("links only live modules to existing routes", () => {
    const live = DESK_TOOLS.filter((tool) => tool.href);
    const later = DESK_TOOLS.filter((tool) => !tool.href);

    expect(live.map((tool) => [tool.title, tool.href])).toEqual([
      ["Opportunity Matrix", "/matrix"],
      ["Run history", "/runs"],
      ["Job status", "/jobs"],
    ]);
    expect(later.map((tool) => tool.title)).toEqual(["Valuation", "Pricing", "Opportunities"]);
    expect(later.every((tool) => tool.cue === "Coming soon")).toBe(true);
  });
});
