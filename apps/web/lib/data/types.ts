import type { Job, OpportunityRun, RankHint, SavingFlag } from "@wombat/contracts";

export type DeskSubject = {
  clientPageId: string;
  clientName: string;
  propertyPageId: string;
  propertyLabel: string;
  loanPageId: string;
  loanLabel: string;
};

export type DeskMatrixCell = {
  id: string;
  subject: DeskSubject;
  currentLenderCode: string;
  targetLenderCode: string;
  valAud?: number;
  lvr?: number;
  currentRate?: number;
  newRate?: number;
  savingFlag: SavingFlag;
  deltaBp?: number;
  rankHint?: RankHint;
  latestRunId?: string;
  isHappyPath: boolean;
  fixtureNote?: string;
};

export type DeskBook = {
  source: "fixture" | "http";
  generatedAt: string;
  cells: DeskMatrixCell[];
  runs: OpportunityRun[];
  jobs: Job[];
  subjects: DeskSubject[];
};

/**
 * Swap point for Andre's Desk read API.
 * Default: FixtureDeskSource.
 * When DESK_API_BASE_URL is set: HttpDeskSource.
 */
export interface DeskDataSource {
  getBook(): Promise<DeskBook>;
  listCells(): Promise<DeskMatrixCell[]>;
  listRuns(loanPageId?: string): Promise<OpportunityRun[]>;
  listJobs(): Promise<Job[]>;
  findSubject(loanPageId: string): DeskSubject | undefined;
}
