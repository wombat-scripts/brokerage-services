import { describe, expect, it } from "vitest";
import { WOMBAT_FIRM_ID } from "./firm.js";
import {
  assertAuditHasFirmScope,
  createAuditEvent,
} from "./job.js";

describe("job audit firm scope", () => {
  it("rejects an event missing firm_id", () => {
    expect(() =>
      assertAuditHasFirmScope({
        requester: "seat:andre",
        detail: { kind: "valuation.lender" },
      }),
    ).toThrow(/firm_id/);
  });

  it("rejects createAuditEvent without firmId", () => {
    expect(() =>
      createAuditEvent({
        actor: "seat:andre",
        action: "job.created",
        firmId: "",
        requester: "seat:andre",
      }),
    ).toThrow(/firm_id/);
  });

  it("stamps firm_id and requester on create/complete events", () => {
    const event = createAuditEvent({
      actor: "system",
      action: "job.succeeded",
      firmId: WOMBAT_FIRM_ID,
      requester: "seat:andre",
      detail: { kind: "valuation.lender" },
    });
    expect(event.firmId).toBe(WOMBAT_FIRM_ID);
    expect(event.requester).toBe("seat:andre");
    expect(event.detail).toMatchObject({
      firm_id: WOMBAT_FIRM_ID,
      requester: "seat:andre",
      kind: "valuation.lender",
    });
  });
});
