import { describe, expect, it } from "vitest";
import {
  WOMBAT_FIRM_ID,
  type DeskOpportunityRunListResponse,
} from "@wombat/contracts";
import {
  PRAI_NAB_DESK_FIXTURE_IDS,
  createMemoryStore,
  seedPraiNabDeskFixtures,
} from "@wombat/store";
import { createApi } from "./app.js";
import { expectCrossFirmIsolation, expectPraiNabDeskReads } from "./desk-api.cases.js";

async function seededApp(auth?: { apiKey?: string }) {
  const store = createMemoryStore();
  await seedPraiNabDeskFixtures(store);
  return { app: createApi(store, undefined, auth), store };
}

describe("Desk read APIs", () => {
  it("lists and gets the seeded Prai × NAB run and jobs (memory)", async () => {
    const { app } = await seededApp();
    await expectPraiNabDeskReads(app);
  });

  it("filters runs by client and status", async () => {
    const { app } = await seededApp();
    const hit = await app.request("/v1/firms/wombat/opportunity-runs?client=client_prai&status=succeeded");
    expect(hit.status).toBe(200);
    expect(((await hit.json()) as DeskOpportunityRunListResponse).opportunityRuns).toHaveLength(1);

    const missClient = await app.request("/v1/firms/wombat/opportunity-runs?client=unknown");
    expect(((await missClient.json()) as DeskOpportunityRunListResponse).opportunityRuns).toHaveLength(0);

    const missStatus = await app.request("/v1/firms/wombat/opportunity-runs?status=voided");
    expect(((await missStatus.json()) as DeskOpportunityRunListResponse).opportunityRuns).toHaveLength(0);
  });

  it("rejects an invalid status filter", async () => {
    const { app } = await seededApp();
    const res = await app.request("/v1/firms/wombat/opportunity-runs?status=not-a-status");
    expect(res.status).toBe(400);
  });

  it("returns 404 for the wrong firm and does not leak lists", async () => {
    const { app } = await seededApp();
    await expectCrossFirmIsolation(app);
  });
});

describe("Desk / job auth stub", () => {
  const apiKey = "test-desk-key";
  const bearer = { Authorization: `Bearer ${apiKey}` };
  const header = { "X-Api-Key": apiKey };

  it("is open when no API key is configured (Amy local / fixture path)", async () => {
    const { app } = await seededApp();
    expect((await app.request("/v1/firms/wombat/jobs")).status).toBe(200);
    expect((await app.request("/health")).status).toBe(200);
  });

  it("requires Bearer or X-Api-Key when a key is configured", async () => {
    const { app } = await seededApp({ apiKey });
    expect((await app.request("/health")).status).toBe(200);
    expect((await app.request("/v1/firms/wombat/jobs")).status).toBe(401);
    expect((await app.request("/v1/firms/wombat/jobs", { headers: { Authorization: "Bearer nope" } })).status).toBe(
      401,
    );
    expect((await app.request("/v1/firms/wombat/jobs", { headers: bearer })).status).toBe(200);
    expect((await app.request("/v1/firms/wombat/jobs", { headers: header })).status).toBe(200);
    expect(
      (await app.request(`/v1/firms/wombat/jobs/${PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId}`, { headers: bearer }))
        .status,
    ).toBe(200);
  });
});

describe("firm-scoped job create + audit", () => {
  it("creates under /v1/firms/:firmId/jobs and stamps firm_id + requester on audit", async () => {
    const { app } = await seededApp();
    const res = await app.request("/v1/firms/wombat/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "valuation.lender",
        requestedBy: "seat:andre",
        input: { fixture: true, lenderCode: "NAB" },
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      firmId: string;
      job: {
        firmId: string;
        requestedBy: string;
        audit: Array<{ firmId?: string; requester?: string; detail?: Record<string, unknown> }>;
      };
    };
    expect(body.firmId).toBe(WOMBAT_FIRM_ID);
    expect(body.job.firmId).toBe(WOMBAT_FIRM_ID);
    expect(body.job.requestedBy).toBe("seat:andre");
    const created = body.job.audit.find((event) => event.detail?.kind === "valuation.lender");
    expect(created?.firmId).toBe(WOMBAT_FIRM_ID);
    expect(created?.requester).toBe("seat:andre");
    expect(created?.detail).toMatchObject({ firm_id: WOMBAT_FIRM_ID, requester: "seat:andre" });
  });

  it("404s create on the wrong firm", async () => {
    const { app } = await seededApp();
    const res = await app.request("/v1/firms/acme/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "valuation.lender",
        requestedBy: "seat:andre",
        input: { fixture: true },
      }),
    });
    expect(res.status).toBe(404);
  });
});
