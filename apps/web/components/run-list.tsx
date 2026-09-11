import type { OpportunityRun } from "@wombat/contracts";
import type { DeskSubject } from "@/lib/data";
import { formatAud, formatDay, formatLvr, formatRate, formatWhen } from "@/lib/format";
import { RankStamp, SavingStamp } from "./stamps";

export function RunList({
  runs,
  subjects,
}: {
  runs: OpportunityRun[];
  subjects: DeskSubject[];
}) {
  if (runs.length === 0) {
    return (
      <div className="empty">
        No opportunity runs for this loan in the fixture book. Runs are append-only. Nothing
        here has been voided.
      </div>
    );
  }

  return (
    <div className="run-list">
      {runs.map((run) => {
        const subject = subjects.find((item) => item.loanPageId === run.loanPageId);
        return (
          <article className="run-card" key={run.runId}>
            <header>
              <h2>
                {formatDay(run.ranAt)} · {run.currentLenderCode} → {run.targetLenderCode}
              </h2>
              <SavingStamp flag={run.savingFlag} />
            </header>
            <p className="meta">
              {subject ? `${subject.clientName} · ${subject.propertyLabel}` : run.loanPageId}
              <br />
              {run.runId} · requested by {run.requestedBy} · {formatWhen(run.ranAt)}
              {run.voidedAt ? ` · voided ${formatWhen(run.voidedAt)}` : ""}
            </p>
            <div className="kv">
              <div>
                <span>Loan</span>
                <strong className="num">{formatAud(run.loanBalanceAud)}</strong>
              </div>
              <div>
                <span>Val</span>
                <strong className="num">{formatAud(run.valAud)}</strong>
              </div>
              <div>
                <span>LVR</span>
                <strong className="num">{formatLvr(run.lvr)}</strong>
              </div>
              <div>
                <span>Current</span>
                <strong className="num">{formatRate(run.currentRate)}</strong>
              </div>
              <div>
                <span>New</span>
                <strong className="num">{formatRate(run.newRate)}</strong>
              </div>
              <div>
                <span>Delta</span>
                <strong className="num">{run.deltaBp !== undefined ? `${run.deltaBp}bp` : "n/a"}</strong>
              </div>
              <div>
                <span>Rate source</span>
                <strong>{run.currentRateSource ?? "n/a"}</strong>
              </div>
              <div>
                <span>Rank</span>
                <RankStamp
                  hint={
                    run.savingFlag === "yes"
                      ? run.currentLenderCode === run.targetLenderCode
                        ? "stay_reprice"
                        : "switch"
                      : run.savingFlag === "no"
                        ? "skip"
                        : "monitor"
                  }
                />
              </div>
            </div>
            {run.notes ? <p className="muted" style={{ margin: "12px 0 0" }}>{run.notes}</p> : null}
          </article>
        );
      })}
    </div>
  );
}
