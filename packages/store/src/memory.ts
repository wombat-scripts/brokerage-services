import type { Job, JobStatus, OpportunityRun } from "@wombat/contracts";
import { WOMBAT_FIRM_ID, assertWombatFirmId, resolveOpportunityRunStatus } from "@wombat/contracts";
import type {
  BrokerageStore,
  JobStore,
  ListJobsQuery,
  ListOpportunityRunsQuery,
  OpportunityRunStore,
} from "./types.js";

class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, Job>();

  async create(job: Job): Promise<Job> {
    assertWombatFirmId(job.firmId);
    if (this.jobs.has(job.jobId)) {
      throw new Error(`job already exists: ${job.jobId}`);
    }
    const stored: Job = { ...job, firmId: WOMBAT_FIRM_ID };
    this.jobs.set(job.jobId, structuredClone(stored));
    return structuredClone(stored);
  }

  async get(jobId: string): Promise<Job | null> {
    const job = this.jobs.get(jobId);
    return job ? structuredClone(job) : null;
  }

  async update(job: Job): Promise<Job> {
    if (!this.jobs.has(job.jobId)) {
      throw new Error(`job not found: ${job.jobId}`);
    }
    assertWombatFirmId(job.firmId);
    const stored: Job = { ...job, firmId: WOMBAT_FIRM_ID };
    this.jobs.set(job.jobId, structuredClone(stored));
    return structuredClone(stored);
  }

  async listByStatus(status: JobStatus, limit = 50): Promise<Job[]> {
    return [...this.jobs.values()]
      .filter((job) => job.status === status)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit)
      .map((job) => structuredClone(job));
  }

  async list(query: ListJobsQuery): Promise<Job[]> {
    assertWombatFirmId(query.firmId);
    return [...this.jobs.values()]
      .filter((job) => job.firmId === query.firmId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((job) => structuredClone(job));
  }
}

class MemoryOpportunityRunStore implements OpportunityRunStore {
  private readonly runs = new Map<string, OpportunityRun>();

  async append(run: OpportunityRun): Promise<OpportunityRun> {
    assertWombatFirmId(run.firmId);
    if (this.runs.has(run.runId)) {
      throw new Error(`opportunity run already exists: ${run.runId}`);
    }
    const stored = { ...run, firmId: WOMBAT_FIRM_ID };
    this.runs.set(run.runId, structuredClone(stored));
    return structuredClone(stored);
  }

  async get(runId: string): Promise<OpportunityRun | null> {
    const run = this.runs.get(runId);
    return run ? structuredClone(run) : null;
  }

  async list(query: ListOpportunityRunsQuery): Promise<OpportunityRun[]> {
    assertWombatFirmId(query.firmId);
    const clientNeedle = query.client?.trim().toLowerCase();
    return [...this.runs.values()]
      .filter((run) => run.firmId === query.firmId)
      .filter((run) => !clientNeedle || run.clientPageId.toLowerCase().includes(clientNeedle))
      .filter((run) => !query.status || resolveOpportunityRunStatus(run) === query.status)
      .sort((a, b) => b.ranAt.localeCompare(a.ranAt))
      .map((run) => structuredClone(run));
  }

  async voidRun(runId: string, reason: string): Promise<void> {
    const existing = this.runs.get(runId);
    if (!existing) {
      throw new Error(`opportunity run not found: ${runId}`);
    }
    this.runs.set(runId, {
      ...existing,
      voidedAt: new Date().toISOString(),
      voidReason: reason,
    });
  }
}

export function createMemoryStore(): BrokerageStore {
  return {
    jobs: new MemoryJobStore(),
    opportunityRuns: new MemoryOpportunityRunStore(),
  };
}
