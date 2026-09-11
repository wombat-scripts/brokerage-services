import type { Job, JobStatus } from "@wombat/contracts";
import { formatJobKind, formatWhen } from "@/lib/format";
import { JobStatusStamp } from "./stamps";

const COLUMNS: JobStatus[] = [
  "queued",
  "running",
  "awaiting_attended_mfa",
  "succeeded",
  "failed",
];

export function JobBoard({ jobs }: { jobs: Job[] }) {
  return (
    <div className="board" role="list">
      {COLUMNS.map((status) => {
        const items = jobs.filter((job) => job.status === status);
        return (
          <section className="board-col" key={status} role="listitem">
            <h2>
              <JobStatusStamp status={status} />
              <span className="meta">{items.length}</span>
            </h2>
            {items.length === 0 ? <p className="muted">None.</p> : null}
            {items.map((job) => (
              <article className="job-card" key={job.jobId}>
                <h2>{formatJobKind(job.kind)}</h2>
                <p className="meta">
                  {job.jobId}
                  <br />
                  {job.requestedBy}
                  <br />
                  {formatWhen(job.createdAt)}
                </p>
                {job.error ? (
                  <p className="muted" style={{ margin: "8px 0 0" }}>
                    {job.error.code}. {job.error.message}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
