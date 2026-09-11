import { FIXTURE_CELLS, FIXTURE_GENERATED_AT, FIXTURE_JOBS, FIXTURE_RUNS, DESK_SUBJECTS } from "./fixtures";
import type { DeskBook, DeskDataSource, DeskSubject } from "./types";

export class FixtureDeskSource implements DeskDataSource {
  async getBook(): Promise<DeskBook> {
    return {
      source: "fixture",
      generatedAt: FIXTURE_GENERATED_AT,
      cells: FIXTURE_CELLS,
      runs: [...FIXTURE_RUNS].sort((a, b) => b.ranAt.localeCompare(a.ranAt)),
      jobs: [...FIXTURE_JOBS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      subjects: DESK_SUBJECTS,
    };
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
    return DESK_SUBJECTS.find((subject) => subject.loanPageId === loanPageId);
  }
}

export const fixtureDeskSource = new FixtureDeskSource();
