import type { JobStatus, RankHint, SavingFlag } from "@wombat/contracts";
import { formatJobStatus, formatRankHint, formatSavingFlag } from "@/lib/format";

export function SavingStamp({ flag }: { flag: SavingFlag }) {
  return <span className={`stamp stamp-${flag}`}>{formatSavingFlag(flag)}</span>;
}

export function RankStamp({ hint }: { hint?: RankHint }) {
  if (!hint) return <span className="muted">n/a</span>;
  return <span className="muted">{formatRankHint(hint)}</span>;
}

export function JobStatusStamp({ status }: { status: JobStatus }) {
  const cls =
    status === "awaiting_attended_mfa"
      ? "mfa"
      : status === "cancelled"
        ? "cancelled"
        : status;
  return <span className={`stamp stamp-${cls}`}>{formatJobStatus(status)}</span>;
}
