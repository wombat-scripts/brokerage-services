import { describe, expect, it } from "vitest";
import {
  WOMBAT_FIRM_ID,
  type DeskJobListResponse,
  type DeskJobResponse,
  type DeskOpportunityRunListResponse,
  type DeskOpportunityRunResponse,
} from "@wombat/contracts";
import {
  PRAI_NAB_DESK_FIXTURE_IDS,
  createMemoryStore,
  seedPraiNabDeskFixtures,
} from "@wombat/store";
import { createApi } from "./app.js";

async function seededApp() {
  const store = createMemoryStore();
  await seedPraiNabDeskFixtures(store);
  return createApi(store);
}

describe("Desk read APIs", () => {
  it("lists the seeded Prai × NAB opportunity run", async () => {
    const app = await seededApp();
    const res = await app.request("/v1/firms/wombat/opportunity-runs");
    expect(res.status).toBe(200);
    const body = (await res.json()) as DeskOpportunityRunListResponse;
    expect(body.firmId).toBe(WOMBAT_FIRM_ID);
    expect(body.opportunityRuns).toHaveLength(1);
    expect(body.opportunityRuns[0]).toMatchObject({
      runId: PRAI_NAB_DESK_FIXTURE_IDS.runId,
      firmId: WOMBAT_FIRM_ID,
      clientPageId: "client_prai",
      loanBalanceAud: 800000,
      valAud: 1025000,
      lvr: 800000 / 1025000,
      currentRate: 0.065,
      newRate: 0.0605,
      savingFlag: "yes",
      deltaBp: 45,
      deltaAudPa: 3600,
      status: "succeeded",
      valuationJobId: PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId,
      pricingJobId: PRAI_NAB_DESK_FIXTURE_IDS.pricingJobId,
      matrixJobId: PRAI_NAB_DESK_FIXTURE_IDS.matrixJobId,
    });
  });

  it("filters runs by client and status", async () => {
    const app = await seededApp();
    const hit = await app.request("/v1/firms/wombat/opportunity-runs?client=client_prai&status=succeeded");
    expect(hit.status).toBe(200);
    expect(((await hit.json()) as DeskOpportunityRunListResponse).opportunityRuns).toHaveLength(1);

    const missClient = await app.request("/v1/firms/wombat/opportunity-runs?client=unknown");
    expect(((await missClient.json()) as DeskOpportunityRunListResponse).opportunityRuns).toHaveLength(0);

    const missStatus = await app.request("/v1/firms/wombat/opportunity-runs?status=voided");
    expect(((await missStatus.json()) as DeskOpportunityRunListResponse).opportunityRuns).toHaveLength(0);
  });

  it("rejects an invalid status filter", async () => {
    const app = await seededApp();
    const res = await app.request("/v1/firms/wombat/opportunity-runs?status=not-a-status");
    expect(res.status).toBe(400);
  });

  it("gets one run by id", async () => {
    const app = await seededApp();
    const res = await app.request(`/v1/firms/wombat/opportunity-runs/${PRAI_NAB_DESK_FIXTURE_IDS.runId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DeskOpportunityRunResponse;
    expect(body.opportunityRun.runId).toBe(PRAI_NAB_DESK_FIXTURE_IDS.runId);
    expect(body.firmId).toBe(WOMBAT_FIRM_ID);
  });

  it("lists linked val/pricing/matrix jobs for the seeded run", async () => {
    const app = await seededApp();
    const all = await app.request("/v1/firms/wombat/jobs");
    expect(all.status).toBe(200);
    expect(((await all.json()) as DeskJobListResponse).jobs).toHaveLength(3);

    const filtered = await app.request(
      `/v1/firms/wombat/jobs?runId=${PRAI_NAB_DESK_FIXTURE_IDS.runId}`,
    );
    const jobs = ((await filtered.json()) as DeskJobListResponse).jobs;
    expect(jobs.map((job) => job.jobId).sort()).toEqual(
      [
        PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId,
        PRAI_NAB_DESK_FIXTURE_IDS.pricingJobId,
        PRAI_NAB_DESK_FIXTURE_IDS.matrixJobId,
      ].sort(),
    );
  });

  it("gets one job by id with the full envelope", async () => {
    const app = await seededApp();
    const res = await app.request(`/v1/firms/wombat/jobs/${PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DeskJobResponse;
    expect(body.job.jobId).toBe(PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId);
    expect(body.job.firmId).toBe(WOMBAT_FIRM_ID);
    expect(body.job.kind).toBe("valuation.lender");
    expect(body.job.output).toMatchObject({ valueAud: 1025000, lenderCode: "NAB" });
  });

  it("returns 404 for unknown firm, run, or job", async () => {
    const app = await seededApp();
    expect((await app.request("/v1/firms/other/opportunity-runs")).status).toBe(404);
    expect((await app.request("/v1/firms/wombat/opportunity-runs/missing")).status).toBe(404);
    expect((await app.request("/v1/firms/wombat/jobs/missing")).status).toBe(404);
  });
});
