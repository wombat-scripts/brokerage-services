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
            Queued, running, awaiting MFA, succeeded, and failed. Default is the fixture mix. Set{" "}
            <code>DESK_API_BASE_URL</code> to read <code>GET /v1/firms/:firmId/jobs</code>.
          </p>
        </div>
      </div>
      <JobBoard jobs={jobs} />
    </>
  );
}
