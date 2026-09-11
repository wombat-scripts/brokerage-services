import Link from "next/link";
import type { DeskMatrixCell } from "@/lib/data";
import { formatAud, formatLvr, formatRate } from "@/lib/format";
import { RankStamp, SavingStamp } from "./stamps";

export function MatrixTable({ cells }: { cells: DeskMatrixCell[] }) {
  if (cells.length === 0) {
    return (
      <div className="empty">
        No matrix cells in this book. Load the Prai fixture or wait for Andre&apos;s API list
        reads.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="matrix">
        <caption className="muted" style={{ captionSide: "bottom", padding: "10px", textAlign: "left" }}>
          Client × property × loan × lender. Highlighted row is the Phase 1 happy path.
        </caption>
        <thead>
          <tr>
            <th>Client</th>
            <th>Property</th>
            <th>Loan</th>
            <th>Lender</th>
            <th>Val</th>
            <th>LVR</th>
            <th>Current</th>
            <th>New</th>
            <th>Saving</th>
            <th>Rank hint</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => (
            <tr
              key={cell.id}
              className={cell.isHappyPath ? "happy" : cell.savingFlag === "unknown" ? "unknown" : undefined}
            >
              <td>
                {cell.subject.clientName}
                {cell.isHappyPath ? <span className="cell-note">Happy path</span> : null}
              </td>
              <td style={{ whiteSpace: "normal", minWidth: 180 }}>{cell.subject.propertyLabel}</td>
              <td>
                <Link href={`/runs?loan=${cell.subject.loanPageId}`}>{cell.subject.loanLabel}</Link>
                <span className="cell-note">Current {cell.currentLenderCode}</span>
              </td>
              <td className="num">{cell.targetLenderCode}</td>
              <td className="num">{cell.valAud !== undefined ? formatAud(cell.valAud) : "n/a"}</td>
              <td className="num">{formatLvr(cell.lvr)}</td>
              <td className="num">{formatRate(cell.currentRate)}</td>
              <td className="num">{formatRate(cell.newRate)}</td>
              <td>
                <SavingStamp flag={cell.savingFlag} />
                {cell.deltaBp !== undefined ? (
                  <span className="cell-note">{cell.deltaBp}bp</span>
                ) : null}
              </td>
              <td>
                <RankStamp hint={cell.rankHint} />
                {cell.fixtureNote ? <span className="cell-note">{cell.fixtureNote}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
