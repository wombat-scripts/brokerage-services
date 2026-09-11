import type {
  LoanOpportunityType,
  OpportunityRun,
  PatchLoanOpportunityArgs,
  PatchPropertySummaryArgs,
} from "@wombat/contracts";

export const NOTION_PROPERTIES = {
  estimatedValue: "Estimated Value",
  valueDate: "Value Date",
  opportunityStatus: "Opportunity Status",
  doThisNext: "Do This Next",
  notes: "Notes",
} as const;

export const NOTION_LOANS = {
  opportunityType: "Opportunity Type",
  opportunityStatus: "Opportunity Status",
  doThisNext: "Do This Next",
  notes: "Notes",
  interestRate: "Interest Rate",
} as const;

/** Fields this adapter is allowed to write on Loans. Interest Rate is intentionally absent. */
export const LOAN_WRITABLE_FIELDS: readonly string[] = [
  NOTION_LOANS.opportunityType,
  NOTION_LOANS.opportunityStatus,
  NOTION_LOANS.doThisNext,
  NOTION_LOANS.notes,
];

export function citationLine(sourceRunId: string, at = new Date()): string {
  return `[brokerage-services run ${sourceRunId} ${at.toISOString().slice(0, 10)}]`;
}

export function appendCitation(existingNotes: string | undefined, sourceRunId: string): string {
  const line = citationLine(sourceRunId);
  const current = existingNotes?.trim() ?? "";
  if (current.includes(line)) return current;
  return current.length > 0 ? `${current}\n${line}` : line;
}

function richText(content: string) {
  return { rich_text: [{ type: "text" as const, text: { content: content.slice(0, 2000) } }] };
}

function numberProp(value: number) {
  return { number: value };
}

function dateProp(isoDate: string) {
  return { date: { start: isoDate.slice(0, 10) } };
}

function statusProp(name: string) {
  return { status: { name } };
}

function titleProp(content: string) {
  return { title: [{ type: "text" as const, text: { content } }] };
}

function relationProp(pageId: string) {
  return { relation: [{ id: pageId }] };
}

function multiSelectProp(names: string[]) {
  return { multi_select: names.map((name) => ({ name })) };
}

export function mergeOpportunityTypes(
  existing: LoanOpportunityType[] | undefined,
  add: LoanOpportunityType[] | undefined,
): LoanOpportunityType[] {
  return [...new Set([...(existing ?? []), ...(add ?? [])])];
}

export function buildPropertySummaryProperties(args: {
  patch: PatchPropertySummaryArgs;
  existingNotes?: string;
}): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  if (args.patch.estimatedValueAud !== undefined) {
    properties[NOTION_PROPERTIES.estimatedValue] = numberProp(args.patch.estimatedValueAud);
  }
  if (args.patch.valueDate) {
    properties[NOTION_PROPERTIES.valueDate] = dateProp(args.patch.valueDate);
  }
  if (args.patch.opportunityStatus) {
    properties[NOTION_PROPERTIES.opportunityStatus] = statusProp(args.patch.opportunityStatus);
  }
  if (args.patch.doThisNext !== undefined) {
    properties[NOTION_PROPERTIES.doThisNext] = richText(args.patch.doThisNext);
  }
  properties[NOTION_PROPERTIES.notes] = richText(
    appendCitation(args.existingNotes, args.patch.sourceRunId),
  );
  return properties;
}

export function buildLoanOpportunityProperties(args: {
  patch: PatchLoanOpportunityArgs;
  existingTypes?: LoanOpportunityType[];
  existingNotes?: string;
}): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const merged = mergeOpportunityTypes(args.existingTypes, args.patch.opportunityTypeAdd);
  if (merged.length > 0) {
    properties[NOTION_LOANS.opportunityType] = multiSelectProp(merged);
  }
  if (args.patch.opportunityStatus) {
    properties[NOTION_LOANS.opportunityStatus] = statusProp(args.patch.opportunityStatus);
  }
  if (args.patch.doThisNext !== undefined) {
    properties[NOTION_LOANS.doThisNext] = richText(args.patch.doThisNext);
  }
  properties[NOTION_LOANS.notes] = richText(appendCitation(args.existingNotes, args.patch.sourceRunId));

  if (NOTION_LOANS.interestRate in properties) {
    throw new Error("adapter refused to write Interest Rate");
  }
  return properties;
}

export function buildOpportunityRunPageProperties(run: OpportunityRun): Record<string, unknown> {
  const title = `${run.targetLenderCode} ${run.savingFlag} ${run.ranAt.slice(0, 10)}`;
  return {
    Name: titleProp(title),
    "Run Id": richText(run.runId),
    "Saving Flag": richText(run.savingFlag),
    "Current Lender": richText(run.currentLenderCode),
    "Target Lender": richText(run.targetLenderCode),
    LVR: numberProp(run.lvr),
    ...(run.deltaBp !== undefined ? { "Delta Bp": numberProp(run.deltaBp) } : {}),
    ...(run.currentRate !== undefined ? { "Current Rate": numberProp(run.currentRate) } : {}),
    ...(run.newRate !== undefined ? { "New Rate": numberProp(run.newRate) } : {}),
    Client: relationProp(run.clientPageId),
    Property: relationProp(run.propertyPageId),
    Loan: relationProp(run.loanPageId),
    Notes: richText(appendCitation(run.notes, run.runId)),
  };
}

export function assertNoInterestRate(properties: Record<string, unknown>): void {
  if (Object.keys(properties).includes(NOTION_LOANS.interestRate)) {
    throw new Error("Notion adapter must never write Interest Rate from a competitor quote");
  }
}
