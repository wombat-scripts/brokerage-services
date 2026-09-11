import {
  WOMBAT_FIRM_ID,
  deskJobListResponseSchema,
  deskJobResponseSchema,
  deskOpportunityRunListResponseSchema,
  deskOpportunityRunResponseSchema,
  rankHintSchema,
  type Job,
  type OpportunityRun,
  type RankHint,
} from "@wombat/contracts";
import { DESK_SUBJECTS, PRAI_SUBJECT } from "./fixtures";
import type { DeskBook, DeskDataSource, DeskMatrixCell, DeskSubject } from "./types";

/** Stable Phase 1.1 Prai × NAB run id from Andre's Desk read API. */
export const DESK_API_HAPPY_PATH_RUN_ID = "01JPHASE11PRAI0001";

export class DeskApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "DeskApiError";
    this.status = status;
  }
}

export type HttpDeskSourceOptions = {
  baseUrl: string;
  firmId?: string;
  /** When set, every request sends `Authorization: Bearer <key>` (Phase 1.2 stub). */
  apiKey?: string;
  fetch?: typeof fetch;
  subjects?: DeskSubject[];
};

/** Headers for Desk HTTP reads. Auth only when `apiKey` is non-empty after trim. */
export function deskApiRequestHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  const key = apiKey?.trim();
  if (key) {
    headers.authorization = `Bearer ${key}`;
  }
  return headers;
}

export function subjectForPages(
  pages: Pick<DeskSubject, "clientPageId" | "propertyPageId" | "loanPageId">,
  known: DeskSubject[] = DESK_SUBJECTS,
): DeskSubject {
  const exact = known.find(
    (subject) =>
      subject.clientPageId === pages.clientPageId &&
      subject.propertyPageId === pages.propertyPageId &&
      subject.loanPageId === pages.loanPageId,
  );
  if (exact) return exact;

  const byClient = known.find((subject) => subject.clientPageId === pages.clientPageId);
  const byProperty = known.find((subject) => subject.propertyPageId === pages.propertyPageId);
  const byLoan = known.find((subject) => subject.loanPageId === pages.loanPageId);

  return {
    clientPageId: pages.clientPageId,
    clientName: byClient?.clientName ?? pages.clientPageId,
    propertyPageId: pages.propertyPageId,
    propertyLabel: byProperty?.propertyLabel ?? pages.propertyPageId,
    loanPageId: pages.loanPageId,
    loanLabel: byLoan?.loanLabel ?? pages.loanPageId,
  };
}

export function isHappyPathRun(run: OpportunityRun): boolean {
  if (run.runId === DESK_API_HAPPY_PATH_RUN_ID) return true;
  return (
    run.clientPageId === PRAI_SUBJECT.clientPageId &&
    run.currentLenderCode === "NAB" &&
    run.targetLenderCode === "NAB" &&
    run.savingFlag === "yes" &&
    run.deltaBp === 45
  );
}

export function rankHintForRun(run: OpportunityRun, jobs: Job[]): RankHint {
  const matrix = jobs.find((job) => job.jobId === run.matrixJobId);
  const parsed = rankHintSchema.safeParse(
    matrix?.output && typeof matrix.output === "object" && matrix.output !== null
      ? (matrix.output as { rankHint?: unknown }).rankHint
      : undefined,
  );
  if (parsed.success) return parsed.data;
  if (run.savingFlag === "yes") {
    return run.currentLenderCode === run.targetLenderCode ? "stay_reprice" : "switch";
  }
  if (run.savingFlag === "no") return "skip";
  return "monitor";
}

export function cellsFromRuns(runs: OpportunityRun[], jobs: Job[], knownSubjects: DeskSubject[]): DeskMatrixCell[] {
  const latest = new Map<string, OpportunityRun>();
  const sorted = [...runs].sort((a, b) => b.ranAt.localeCompare(a.ranAt));
  for (const run of sorted) {
    const key = `${run.loanPageId}::${run.targetLenderCode}`;
    if (!latest.has(key)) latest.set(key, run);
  }

  return [...latest.values()].map((run) => {
    const happy = isHappyPathRun(run);
    return {
      id: `cell_${run.loanPageId}_${run.targetLenderCode}`,
      subject: subjectForPages(run, knownSubjects),
      currentLenderCode: run.currentLenderCode,
      targetLenderCode: run.targetLenderCode,
      valAud: run.valAud,
      lvr: run.lvr,
      currentRate: run.currentRate,
      newRate: run.newRate,
      savingFlag: run.savingFlag,
      deltaBp: run.deltaBp,
      rankHint: rankHintForRun(run, jobs),
      latestRunId: run.runId,
      isHappyPath: happy,
      fixtureNote: happy
        ? "Phase 1 happy path from Desk API. Current rate from the Notion loan row. Not a live portal quote."
        : run.notes,
    };
  });
}

function subjectsFromRuns(runs: OpportunityRun[], knownSubjects: DeskSubject[]): DeskSubject[] {
  const byLoan = new Map<string, DeskSubject>();
  for (const run of runs) {
    if (!byLoan.has(run.loanPageId)) {
      byLoan.set(run.loanPageId, subjectForPages(run, knownSubjects));
    }
  }
  return [...byLoan.values()];
}

export class HttpDeskSource implements DeskDataSource {
  readonly baseUrl: string;
  readonly firmId: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly knownSubjects: DeskSubject[];
  private bookPromise?: Promise<DeskBook>;

  constructor(options: HttpDeskSourceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.firmId = options.firmId?.trim() || WOMBAT_FIRM_ID;
    this.apiKey = options.apiKey?.trim() || undefined;
    this.fetchImpl = options.fetch ?? fetch;
    this.knownSubjects = options.subjects ?? DESK_SUBJECTS;
  }

  private firmPath(suffix: string): string {
    return `${this.baseUrl}/v1/firms/${this.firmId}${suffix}`;
  }

  private async getJson<T>(
    url: string,
    parse: (json: unknown) => { success: true; data: T } | { success: false; error: { message: string } },
  ): Promise<T> {
    const response = await this.fetchImpl(url, { headers: deskApiRequestHeaders(this.apiKey) });
    if (!response.ok) {
      throw new DeskApiError(`Desk API ${response.status} for ${url}`, response.status);
    }
    const parsed = parse(await response.json());
    if (!parsed.success) {
      throw new DeskApiError(`Desk API response failed contract parse for ${url}: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async listOpportunityRuns(query?: { client?: string; status?: string }): Promise<OpportunityRun[]> {
    const url = new URL(this.firmPath("/opportunity-runs"));
    if (query?.client) url.searchParams.set("client", query.client);
    if (query?.status) url.searchParams.set("status", query.status);
    const body = await this.getJson(url.toString(), (json) => deskOpportunityRunListResponseSchema.safeParse(json));
    return body.opportunityRuns;
  }

  async getOpportunityRun(runId: string): Promise<OpportunityRun> {
    const body = await this.getJson(
      this.firmPath(`/opportunity-runs/${encodeURIComponent(runId)}`),
      (json) => deskOpportunityRunResponseSchema.safeParse(json),
    );
    return body.opportunityRun;
  }

  async listJobsByQuery(query?: { runId?: string }): Promise<Job[]> {
    const url = new URL(this.firmPath("/jobs"));
    if (query?.runId) url.searchParams.set("runId", query.runId);
    const body = await this.getJson(url.toString(), (json) => deskJobListResponseSchema.safeParse(json));
    return body.jobs as Job[];
  }

  async getJob(jobId: string): Promise<Job> {
    const body = await this.getJson(
      this.firmPath(`/jobs/${encodeURIComponent(jobId)}`),
      (json) => deskJobResponseSchema.safeParse(json),
    );
    return body.job as Job;
  }

  private async loadBook(): Promise<DeskBook> {
    const [runs, jobs] = await Promise.all([this.listOpportunityRuns(), this.listJobsByQuery()]);
    const sortedRuns = [...runs].sort((a, b) => b.ranAt.localeCompare(a.ranAt));
    const sortedJobs = [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      source: "http",
      generatedAt: sortedRuns[0]?.ranAt ?? new Date().toISOString(),
      cells: cellsFromRuns(sortedRuns, sortedJobs, this.knownSubjects),
      runs: sortedRuns,
      jobs: sortedJobs,
      subjects: subjectsFromRuns(sortedRuns, this.knownSubjects),
    };
  }

  async getBook(): Promise<DeskBook> {
    this.bookPromise ??= this.loadBook();
    return this.bookPromise;
  }

  async listCells() {
    return (await this.getBook()).cells;
  }

  async listRuns(loanPageId?: string) {
    const runs = (await this.getBook()).runs;
    if (!loanPageId) return runs;
    return runs.filter((run) => run.loanPageId === loanPageId);
  }

  async listJobs() {
    return (await this.getBook()).jobs;
  }

  findSubject(loanPageId: string): DeskSubject | undefined {
    return this.knownSubjects.find((subject) => subject.loanPageId === loanPageId);
  }
}
