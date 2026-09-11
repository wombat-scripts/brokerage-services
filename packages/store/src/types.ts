import type { Job, JobStatus, OpportunityRun } from "@wombat/contracts";

export interface JobStore {
  create(job: Job): Promise<Job>;
  get(jobId: string): Promise<Job | null>;
  update(job: Job): Promise<Job>;
  listByStatus(status: JobStatus, limit?: number): Promise<Job[]>;
}

export interface OpportunityRunStore {
  append(run: OpportunityRun): Promise<OpportunityRun>;
  get(runId: string): Promise<OpportunityRun | null>;
  voidRun(runId: string, reason: string): Promise<void>;
}

export interface BrokerageStore {
  jobs: JobStore;
  opportunityRuns: OpportunityRunStore;
}
