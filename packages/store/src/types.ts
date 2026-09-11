import type { Job, JobStatus, OpportunityRun, OpportunityRunStatus } from "@wombat/contracts";

export type ListJobsQuery = {
  firmId: string;
};

export type ListOpportunityRunsQuery = {
  firmId: string;
  client?: string;
  status?: OpportunityRunStatus;
};

export interface JobStore {
  create(job: Job): Promise<Job>;
  get(jobId: string, firmId?: string): Promise<Job | null>;
  update(job: Job): Promise<Job>;
  listByStatus(status: JobStatus, limit?: number): Promise<Job[]>;
  list(query: ListJobsQuery): Promise<Job[]>;
}

export interface OpportunityRunStore {
  append(run: OpportunityRun): Promise<OpportunityRun>;
  get(runId: string, firmId?: string): Promise<OpportunityRun | null>;
  list(query: ListOpportunityRunsQuery): Promise<OpportunityRun[]>;
  voidRun(runId: string, reason: string): Promise<void>;
}

export interface BrokerageStore {
  jobs: JobStore;
  opportunityRuns: OpportunityRunStore;
}
