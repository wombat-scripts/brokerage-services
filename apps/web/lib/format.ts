import type { JobKind, JobStatus, RankHint, SavingFlag } from "@wombat/contracts";

export function formatAud(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRate(value?: number): string {
  if (value === undefined) return "n/a";
  return `${(value * 100).toFixed(2)}%`;
}

export function formatLvr(value?: number): string {
  if (value === undefined) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSavingFlag(flag: SavingFlag): string {
  if (flag === "yes") return "Saving Yes";
  if (flag === "no") return "Saving No";
  return "Unknown";
}

export function formatRankHint(hint?: RankHint): string {
  if (!hint) return "n/a";
  if (hint === "stay_reprice") return "Stay, reprice";
  if (hint === "switch") return "Switch";
  if (hint === "monitor") return "Monitor";
  return "Skip";
}

export function formatJobStatus(status: JobStatus): string {
  if (status === "awaiting_attended_mfa") return "Awaiting MFA";
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "succeeded") return "Succeeded";
  if (status === "failed") return "Failed";
  return "Cancelled";
}

export function formatJobKind(kind: JobKind): string {
  return kind.replaceAll(".", " · ");
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  }).format(new Date(iso));
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeZone: "Australia/Sydney",
  }).format(new Date(iso));
}
