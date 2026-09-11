import { MatrixTable } from "@/components/matrix-table";
import { SavingStamp } from "@/components/stamps";
import { getDeskSource } from "@/lib/data";
import { formatAud, formatLvr, formatRate } from "@/lib/format";

export const metadata = {
  title: "Opportunity Matrix",
};

export default async function MatrixPage() {
  const cells = await getDeskSource().listCells();
  const happy = cells.find((cell) => cell.isHappyPath);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Opportunity Matrix</h1>
          <p>
            One cell per client, property, loan, and target lender. Numbers come from the Phase 1
            fixture book, not a live portal.
          </p>
        </div>
      </div>

      {happy ? (
        <section className="callout" aria-label="Prai NAB happy path">
          <div>
            <h2>
              <SavingStamp flag={happy.savingFlag} /> {happy.subject.clientName} ×{" "}
              {happy.targetLenderCode}
            </h2>
            <p>
              {happy.subject.propertyLabel}. Current lender {happy.currentLenderCode}.{" "}
              {formatAud(800_000)} on {formatAud(happy.valAud ?? 0)} (LVR ~78%).{" "}
              {formatRate(happy.currentRate)} to {formatRate(happy.newRate)} ({happy.deltaBp}bp).
              Rank hint: stay, reprice. Flag for Tom, not advice.
            </p>
            <dl>
              <div>
                <dt>Val</dt>
                <dd className="num">{formatAud(happy.valAud ?? 0)}</dd>
              </div>
              <div>
                <dt>LVR</dt>
                <dd className="num">{formatLvr(happy.lvr)}</dd>
              </div>
              <div>
                <dt>Current / new</dt>
                <dd className="num">
                  {formatRate(happy.currentRate)} / {formatRate(happy.newRate)}
                </dd>
              </div>
              <div>
                <dt>Delta</dt>
                <dd className="num">{happy.deltaBp}bp</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : (
        <div className="empty">
          Happy-path cell is missing from the fixture book. Check{" "}
          <code>apps/web/lib/data/fixtures.ts</code>.
        </div>
      )}

      <MatrixTable cells={cells} />
    </>
  );
}
