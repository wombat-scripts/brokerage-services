import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WOMBAT_FIRM_ID,
  deskJobListResponseSchema,
  deskJobResponseSchema,
  deskOpportunityRunListResponseSchema,
  deskOpportunityRunResponseSchema,
} from "@wombat/contracts";
import { fixtureDeskSource } from "./fixture-source";
import { PRAI_SUBJECT } from "./fixtures";
import {
  DESK_API_HAPPY_PATH_RUN_ID,
  DeskApiError,
  HttpDeskSource,
  deskApiRequestHeaders,
  subjectForPages,
} from "./http-source";
import { createDeskSource, readDeskApiKey } from "./source";

/** Documented list-runs envelope from docs/desk-api.md. */
const DOCUMENTED_RUN = {
  runId: "01JPHASE11PRAI0001",
  firmId: "wombat",
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
  lvr: 0.7804878048780488,
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
  artefactUris: ["fixture:prai-nab-val", "fixture:prai-nab-price"],
  notes:
    "Phase 1.1 seed. Matches Phase 1 matrix_cell test: 800k / 1.025m → Saving Yes / 45bp. Flag for Tom, not advice.",
} as const;

const DOCUMENTED_VAL_JOB = {
  jobId: "job_val_fixture_prai_nab",
  firmId: "wombat",
  kind: "valuation.lender",
  version: "0.1.0",
  status: "succeeded",
  requestedBy: "platform-andre",
  createdAt: "2026-09-11T05:50:00.000Z",
  updatedAt: "2026-09-11T05:51:00.000Z",
  startedAt: "2026-09-11T05:50:10.000Z",
  finishedAt: "2026-09-11T05:51:00.000Z",
  input: {},
  output: { lenderCode: "NAB", valueAud: 1025000 },
  artefacts: [],
  audit: [],
  subjectRefs: { propertyPageId: "property_15_ashley" },
} as const;

const DOCUMENTED_PRICE_JOB = {
  ...DOCUMENTED_VAL_JOB,
  jobId: "job_price_fixture_prai_nab",
  kind: "pricing.lender",
  createdAt: "2026-09-11T05:52:00.000Z",
  updatedAt: "2026-09-11T05:53:00.000Z",
  startedAt: "2026-09-11T05:52:10.000Z",
  finishedAt: "2026-09-11T05:53:00.000Z",
  output: { lenderCode: "NAB", newRate: 0.0605 },
  subjectRefs: { loanPageId: "loan_nab_800k" },
} as const;

const DOCUMENTED_MATRIX_JOB = {
  ...DOCUMENTED_VAL_JOB,
  jobId: "job_matrix_fixture_prai_nab",
  kind: "opportunity.matrix_cell",
  createdAt: "2026-09-11T05:54:00.000Z",
  updatedAt: "2026-09-11T06:00:00.000Z",
  startedAt: "2026-09-11T05:54:10.000Z",
  finishedAt: "2026-09-11T06:00:00.000Z",
  output: {
    opportunityRunId: "01JPHASE11PRAI0001",
    savingFlag: "yes",
    deltaBp: 45,
    rankHint: "stay_reprice",
  },
  subjectRefs: {
    clientPageId: "client_prai",
    propertyPageId: "property_15_ashley",
    loanPageId: "loan_nab_800k",
  },
} as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Desk API response shapes (docs/desk-api.md)", () => {
  it("parses list runs { firmId, opportunityRuns[] }", () => {
    const parsed = deskOpportunityRunListResponseSchema.safeParse({
      firmId: "wombat",
      opportunityRuns: [DOCUMENTED_RUN],
    });
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.format())).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.opportunityRuns[0]).toMatchObject({
      runId: DESK_API_HAPPY_PATH_RUN_ID,
      loanBalanceAud: 800_000,
      valAud: 1_025_000,
      savingFlag: "yes",
      deltaBp: 45,
      deltaAudPa: 3600,
      status: "succeeded",
    });
  });

  it("parses one run { firmId, opportunityRun }", () => {
    const parsed = deskOpportunityRunResponseSchema.safeParse({
      firmId: "wombat",
      opportunityRun: DOCUMENTED_RUN,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.opportunityRun.runId).toBe(DESK_API_HAPPY_PATH_RUN_ID);
    }
  });

  it("parses list jobs { firmId, jobs[] }", () => {
    const parsed = deskJobListResponseSchema.safeParse({
      firmId: "wombat",
      jobs: [DOCUMENTED_VAL_JOB, DOCUMENTED_PRICE_JOB, DOCUMENTED_MATRIX_JOB],
    });
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.format())).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.jobs.map((job) => job.jobId)).toEqual([
      "job_val_fixture_prai_nab",
      "job_price_fixture_prai_nab",
      "job_matrix_fixture_prai_nab",
    ]);
  });

  it("parses one job { firmId, job }", () => {
    const parsed = deskJobResponseSchema.safeParse({
      firmId: "wombat",
      job: DOCUMENTED_VAL_JOB,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.job.output).toMatchObject({ lenderCode: "NAB", valueAud: 1_025_000 });
    }
  });
});

describe("HttpDeskSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function sourceWith(
    fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    apiKey?: string,
  ) {
    return new HttpDeskSource({
      baseUrl: "http://127.0.0.1:3000",
      firmId: WOMBAT_FIRM_ID,
      apiKey,
      fetch: fetchImpl as typeof fetch,
    });
  }

  function requestHeaders(fetchImpl: { mock: { calls: unknown[][] } }, call = 0): Record<string, string> {
    const init = fetchImpl.mock.calls[call]?.[1] as RequestInit | undefined;
    return (init?.headers ?? {}) as Record<string, string>;
  }

  it("maps the Prai API run to Saving Yes / 45bp with local labels", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://127.0.0.1:3000/v1/firms/wombat/opportunity-runs") {
        return jsonResponse({ firmId: "wombat", opportunityRuns: [DOCUMENTED_RUN] });
      }
      if (url === "http://127.0.0.1:3000/v1/firms/wombat/jobs") {
        return jsonResponse({
          firmId: "wombat",
          jobs: [DOCUMENTED_VAL_JOB, DOCUMENTED_PRICE_JOB, DOCUMENTED_MATRIX_JOB],
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const book = await sourceWith(fetchImpl).getBook();
    expect(book.source).toBe("http");
    expect(book.runs).toHaveLength(1);
    expect(book.runs[0]?.runId).toBe(DESK_API_HAPPY_PATH_RUN_ID);
    expect(book.jobs).toHaveLength(3);

    const happy = book.cells.find((cell) => cell.isHappyPath);
    expect(happy).toMatchObject({
      subject: PRAI_SUBJECT,
      currentLenderCode: "NAB",
      targetLenderCode: "NAB",
      valAud: 1_025_000,
      currentRate: 0.065,
      newRate: 0.0605,
      savingFlag: "yes",
      deltaBp: 45,
      rankHint: "stay_reprice",
      latestRunId: DESK_API_HAPPY_PATH_RUN_ID,
    });
    expect(happy?.subject.clientName).toBe("Prai & Amanda");
    expect(happy?.subject.propertyLabel).toContain("15 Ashley Avenue");
  });

  it("calls the documented get-one endpoints", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith(`/opportunity-runs/${DESK_API_HAPPY_PATH_RUN_ID}`)) {
        return jsonResponse({ firmId: "wombat", opportunityRun: DOCUMENTED_RUN });
      }
      if (url.endsWith("/jobs/job_val_fixture_prai_nab")) {
        return jsonResponse({ firmId: "wombat", job: DOCUMENTED_VAL_JOB });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const source = sourceWith(fetchImpl);
    await expect(source.getOpportunityRun(DESK_API_HAPPY_PATH_RUN_ID)).resolves.toMatchObject({
      runId: DESK_API_HAPPY_PATH_RUN_ID,
      savingFlag: "yes",
      deltaBp: 45,
    });
    await expect(source.getJob("job_val_fixture_prai_nab")).resolves.toMatchObject({
      jobId: "job_val_fixture_prai_nab",
      kind: "valuation.lender",
    });
  });

  it("filters listRuns by loanPageId and list jobs by runId query", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:3000/v1/firms/wombat/opportunity-runs")) {
        return jsonResponse({ firmId: "wombat", opportunityRuns: [DOCUMENTED_RUN] });
      }
      if (url.includes("/jobs?runId=")) {
        return jsonResponse({ firmId: "wombat", jobs: [DOCUMENTED_VAL_JOB] });
      }
      if (url.endsWith("/jobs")) {
        return jsonResponse({ firmId: "wombat", jobs: [DOCUMENTED_VAL_JOB, DOCUMENTED_PRICE_JOB] });
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const source = sourceWith(fetchImpl);
    await expect(source.listRuns("loan_nab_800k")).resolves.toHaveLength(1);
    await expect(source.listRuns("loan_other")).resolves.toHaveLength(0);
    await expect(source.listJobsByQuery({ runId: DESK_API_HAPPY_PATH_RUN_ID })).resolves.toHaveLength(1);
    expect(String(fetchImpl.mock.calls.at(-1)?.[0])).toContain(`runId=${DESK_API_HAPPY_PATH_RUN_ID}`);
  });

  it("shows unknown page ids when the local label join misses", () => {
    const subject = subjectForPages({
      clientPageId: "client_unknown",
      propertyPageId: "property_unknown",
      loanPageId: "loan_unknown",
    });
    expect(subject).toEqual({
      clientPageId: "client_unknown",
      clientName: "client_unknown",
      propertyPageId: "property_unknown",
      propertyLabel: "property_unknown",
      loanPageId: "loan_unknown",
      loanLabel: "loan_unknown",
    });
  });

  it("throws DeskApiError on HTTP failure", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "missing" } }, 404));
    await expect(sourceWith(fetchImpl).getOpportunityRun("missing")).rejects.toBeInstanceOf(DeskApiError);
  });

  it("sends Authorization Bearer when apiKey is set", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ firmId: "wombat", opportunityRun: DOCUMENTED_RUN }));
    await sourceWith(fetchImpl, "desk-secret").getOpportunityRun(DESK_API_HAPPY_PATH_RUN_ID);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(requestHeaders(fetchImpl)).toEqual({
      accept: "application/json",
      authorization: "Bearer desk-secret",
    });
  });

  it("sends no auth headers when apiKey is unset", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ firmId: "wombat", opportunityRun: DOCUMENTED_RUN }));
    await sourceWith(fetchImpl).getOpportunityRun(DESK_API_HAPPY_PATH_RUN_ID);
    const headers = requestHeaders(fetchImpl);
    expect(headers).toEqual({ accept: "application/json" });
    expect(headers).not.toHaveProperty("authorization");
    expect(headers).not.toHaveProperty("Authorization");
    expect(headers).not.toHaveProperty("x-api-key");
    expect(headers).not.toHaveProperty("X-Api-Key");
  });
});

describe("deskApiRequestHeaders / readDeskApiKey", () => {
  it("omits auth when the key is blank or whitespace", () => {
    expect(deskApiRequestHeaders(undefined)).toEqual({ accept: "application/json" });
    expect(deskApiRequestHeaders("")).toEqual({ accept: "application/json" });
    expect(deskApiRequestHeaders("   ")).toEqual({ accept: "application/json" });
    expect(readDeskApiKey({})).toBeUndefined();
    expect(readDeskApiKey({ DESK_API_KEY: "  " })).toBeUndefined();
    expect(readDeskApiKey({ DESK_API_KEY: "desk-secret" })).toBe("desk-secret");
  });
});

describe("createDeskSource", () => {
  it("defaults to fixtures when DESK_API_BASE_URL is unset", () => {
    expect(createDeskSource({})).toBe(fixtureDeskSource);
    expect(createDeskSource({ DESK_API_KEY: "desk-secret" })).toBe(fixtureDeskSource);
  });

  it("selects HttpDeskSource when DESK_API_BASE_URL is set", () => {
    const source = createDeskSource({ DESK_API_BASE_URL: "http://127.0.0.1:3000/" });
    expect(source).toBeInstanceOf(HttpDeskSource);
    expect((source as HttpDeskSource).baseUrl).toBe("http://127.0.0.1:3000");
    expect((source as HttpDeskSource).firmId).toBe("wombat");
  });

  it("refuses DESK_DATA_SOURCE=api without a base URL", () => {
    expect(() => createDeskSource({ DESK_DATA_SOURCE: "api" })).toThrow(/DESK_API_BASE_URL/);
  });
});
