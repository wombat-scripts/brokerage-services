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
  source: "fixture";
  generatedAt: string;
  cells: DeskMatrixCell[];
  runs: OpportunityRun[];
  jobs: Job[];
  subjects: DeskSubject[];
};

/**
 * Swap point for Andre's API.
 * Today: FixtureDeskSource.
 * Later: HTTP reads against GET /jobs and opportunity-run list endpoints once they exist.
 */
export interface DeskDataSource {
  getBook(): Promise<DeskBook>;
  listCells(): Promise<DeskMatrixCell[]>;
  listRuns(loanPageId?: string): Promise<OpportunityRun[]>;
  listJobs(): Promise<Job[]>;
  findSubject(loanPageId: string): DeskSubject | undefined;
}
