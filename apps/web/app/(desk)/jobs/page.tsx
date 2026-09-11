import { JobBoard } from "@/components/job-board";
import { getDeskSource } from "@/lib/data";

export const metadata = {
  title: "Job status",
};

export default async function JobsPage() {
  const jobs = await getDeskSource().listJobs();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Job status</h1>
          <p>
            Fixture mix across queued, running, awaiting MFA, succeeded, and failed. Later this
            page reads <code>GET /jobs</code> from the API. Today it does not.
          </p>
        </div>
      </div>
      <JobBoard jobs={jobs} />
    </>
  );
}
