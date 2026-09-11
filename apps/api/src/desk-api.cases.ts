import { expect } from "vitest";
import type { Hono } from "hono";
import {
  WOMBAT_FIRM_ID,
  type DeskJobListResponse,
  type DeskJobResponse,
  type DeskOpportunityRunListResponse,
  type DeskOpportunityRunResponse,
} from "@wombat/contracts";
import { PRAI_NAB_DESK_FIXTURE_IDS } from "@wombat/store";

export async function expectPraiNabDeskReads(
  app: Hono,
  headers: Record<string, string> = {},
): Promise<void> {
  const listRuns = await app.request("/v1/firms/wombat/opportunity-runs", { headers });
  expect(listRuns.status).toBe(200);
  const listBody = (await listRuns.json()) as DeskOpportunityRunListResponse;
  expect(listBody.firmId).toBe(WOMBAT_FIRM_ID);
  expect(listBody.opportunityRuns).toHaveLength(1);
  expect(listBody.opportunityRuns[0]).toMatchObject({
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

  const getRun = await app.request(
    `/v1/firms/wombat/opportunity-runs/${PRAI_NAB_DESK_FIXTURE_IDS.runId}`,
    { headers },
  );
  expect(getRun.status).toBe(200);
  expect(((await getRun.json()) as DeskOpportunityRunResponse).opportunityRun.runId).toBe(
    PRAI_NAB_DESK_FIXTURE_IDS.runId,
  );

  const listJobs = await app.request("/v1/firms/wombat/jobs", { headers });
  expect(listJobs.status).toBe(200);
  expect(((await listJobs.json()) as DeskJobListResponse).jobs).toHaveLength(3);

  const byRun = await app.request(
    `/v1/firms/wombat/jobs?runId=${PRAI_NAB_DESK_FIXTURE_IDS.runId}`,
    { headers },
  );
  expect(byRun.status).toBe(200);
  const jobs = ((await byRun.json()) as DeskJobListResponse).jobs;
  expect(jobs.map((job) => job.jobId).sort()).toEqual(
    [
      PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId,
      PRAI_NAB_DESK_FIXTURE_IDS.pricingJobId,
      PRAI_NAB_DESK_FIXTURE_IDS.matrixJobId,
    ].sort(),
  );

  const getJob = await app.request(
    `/v1/firms/wombat/jobs/${PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId}`,
    { headers },
  );
  expect(getJob.status).toBe(200);
  const jobBody = (await getJob.json()) as DeskJobResponse;
  expect(jobBody.job.jobId).toBe(PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId);
  expect(jobBody.job.firmId).toBe(WOMBAT_FIRM_ID);
}

export async function expectCrossFirmIsolation(
  app: Hono,
  headers: Record<string, string> = {},
): Promise<void> {
  const paths = [
    "/v1/firms/acme/opportunity-runs",
    `/v1/firms/acme/opportunity-runs/${PRAI_NAB_DESK_FIXTURE_IDS.runId}`,
    "/v1/firms/acme/jobs",
    `/v1/firms/acme/jobs/${PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId}`,
    `/v1/firms/acme/jobs?runId=${PRAI_NAB_DESK_FIXTURE_IDS.runId}`,
  ];
  for (const path of paths) {
    const res = await app.request(path, { headers });
    expect(res.status, path).toBe(404);
    const body = (await res.json()) as { opportunityRuns?: unknown; jobs?: unknown };
    expect(body.opportunityRuns, path).toBeUndefined();
    expect(body.jobs, path).toBeUndefined();
  }

  const missingRunJobs = await app.request("/v1/firms/wombat/jobs?runId=01JOTHERFIRMRUN000", {
    headers,
  });
  expect(missingRunJobs.status).toBe(404);
}
