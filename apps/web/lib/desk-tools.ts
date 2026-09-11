export type DeskTool = {
  title: string;
  blurb: string;
  cue: string;
  href?: "/matrix" | "/runs" | "/jobs";
};

export const DESK_TOOLS: readonly DeskTool[] = [
  {
    title: "Opportunity Matrix",
    blurb: "Client × property × loan × lender. Val, LVR, rates, Saving Yes, rank hint.",
    cue: "Open matrix",
    href: "/matrix",
  },
  {
    title: "Run history",
    blurb: "Append-only Opportunity Runs for a loan. Oldest stays. Fixture book, not Postgres.",
    cue: "Open runs",
    href: "/runs",
  },
  {
    title: "Job status",
    blurb: "Queued, running, awaiting MFA, succeeded, and failed. Fixture mix only.",
    cue: "Open jobs",
    href: "/jobs",
  },
  {
    title: "Valuation",
    blurb: "Lender val jobs will sit here. No fake page.",
    cue: "Coming soon",
  },
  {
    title: "Pricing",
    blurb: "Lender price jobs will sit here. No fake page.",
    cue: "Coming soon",
  },
  {
    title: "Opportunities",
    blurb: "Book scan and later opportunity work. No fake page.",
    cue: "Coming soon",
  },
];
