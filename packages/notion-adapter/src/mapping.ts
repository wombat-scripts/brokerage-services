import type {
  LoanOpportunityType,
  OpportunityRun,
  PatchLoanOpportunityArgs,
  PatchPropertySummaryArgs,
} from "@wombat/contracts";
import { resolveOpportunityRunStatus } from "@wombat/contracts";

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

/** Live Opportunity Runs DB (54120476-0e40-4887-b457-0ff486ecb205). */
export const NOTION_OPPORTUNITY_RUNS = {
  name: "Name",
  runId: "Run ID",
  firmId: "firm_id",
  client: "Client",
  property: "Property",
  loan: "Loan",
  currentLender: "Current Lender",
  targetLender: "Target Lender",
  loanBalanceAud: "Loan Balance AUD",
  valAud: "Val AUD",
  valDate: "Val Date",
  valSource: "Val Source",
  lvr: "LVR",
  currentRate: "Current Rate",
  currentRateSource: "Current Rate Source",
  newRate: "New Rate",
  savingFlag: "Saving Flag",
  deltaBp: "Delta BP",
  deltaAudPa: "Delta AUD PA",
  valuationJobId: "Valuation Job ID",
  pricingJobId: "Pricing Job ID",
  matrixJobId: "Matrix Job ID",
  status: "Status",
  requestedBy: "Requested By",
  ranAt: "Ran At",
  notes: "Notes",
} as const;

export const NOTION_LENDER_SELECT = ["NAB", "MACQ", "STG", "CBA", "ANZ", "Other"] as const;
export const NOTION_VAL_SOURCE_SELECT = [
  "lender_portal",
  "lender_avm_tool",
  "corelogic_avm",
  "fixture",
  "other",
] as const;
export const NOTION_CURRENT_RATE_SOURCE_SELECT = ["notion_loan", "portal", "manual", "fixture"] as const;
export const NOTION_SAVING_FLAG_SELECT = ["yes", "no", "unknown"] as const;
export const NOTION_RUN_STATUS_SELECT = ["succeeded", "failed", "unknown", "voided"] as const;

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

function dateTimeProp(isoDateTime: string) {
  return { date: { start: isoDateTime } };
}

function statusProp(name: string) {
  return { status: { name } };
}

function selectProp(name: string) {
  return { select: { name } };
}

function titleProp(content: string) {
  return { title: [{ type: "text" as const, text: { content } }] };
}

function multiSelectProp(names: string[]) {
  return { multi_select: names.map((name) => ({ name })) };
}

export function mapLenderSelect(code: string): (typeof NOTION_LENDER_SELECT)[number] {
  return (NOTION_LENDER_SELECT as readonly string[]).includes(code)
    ? (code as (typeof NOTION_LENDER_SELECT)[number])
    : "Other";
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
  const properties: Record<string, unknown> = {
    [NOTION_OPPORTUNITY_RUNS.name]: titleProp(title),
    [NOTION_OPPORTUNITY_RUNS.runId]: richText(run.runId),
    [NOTION_OPPORTUNITY_RUNS.firmId]: richText(run.firmId),
    [NOTION_OPPORTUNITY_RUNS.client]: richText(run.clientPageId),
    [NOTION_OPPORTUNITY_RUNS.property]: richText(run.propertyPageId),
    [NOTION_OPPORTUNITY_RUNS.loan]: richText(run.loanPageId),
    [NOTION_OPPORTUNITY_RUNS.currentLender]: selectProp(mapLenderSelect(run.currentLenderCode)),
    [NOTION_OPPORTUNITY_RUNS.targetLender]: selectProp(mapLenderSelect(run.targetLenderCode)),
    [NOTION_OPPORTUNITY_RUNS.loanBalanceAud]: numberProp(run.loanBalanceAud),
    [NOTION_OPPORTUNITY_RUNS.valAud]: numberProp(run.valAud),
    [NOTION_OPPORTUNITY_RUNS.valDate]: dateProp(run.valDate),
    [NOTION_OPPORTUNITY_RUNS.valSource]: selectProp(run.valSource),
    [NOTION_OPPORTUNITY_RUNS.lvr]: numberProp(run.lvr),
    [NOTION_OPPORTUNITY_RUNS.savingFlag]: selectProp(run.savingFlag),
    [NOTION_OPPORTUNITY_RUNS.valuationJobId]: richText(run.valuationJobId),
    [NOTION_OPPORTUNITY_RUNS.pricingJobId]: richText(run.pricingJobId),
    [NOTION_OPPORTUNITY_RUNS.matrixJobId]: richText(run.matrixJobId),
    [NOTION_OPPORTUNITY_RUNS.status]: selectProp(resolveOpportunityRunStatus(run)),
    [NOTION_OPPORTUNITY_RUNS.requestedBy]: richText(run.requestedBy),
    [NOTION_OPPORTUNITY_RUNS.ranAt]: dateTimeProp(run.ranAt),
    [NOTION_OPPORTUNITY_RUNS.notes]: richText(appendCitation(run.notes, run.runId)),
  };

  if (run.currentRate !== undefined) {
    properties[NOTION_OPPORTUNITY_RUNS.currentRate] = numberProp(run.currentRate);
  }
  if (run.currentRateSource) {
    properties[NOTION_OPPORTUNITY_RUNS.currentRateSource] = selectProp(run.currentRateSource);
  }
  if (run.newRate !== undefined) {
    properties[NOTION_OPPORTUNITY_RUNS.newRate] = numberProp(run.newRate);
  }
  if (run.deltaBp !== undefined) {
    properties[NOTION_OPPORTUNITY_RUNS.deltaBp] = numberProp(run.deltaBp);
  }
  if (run.deltaAudPa !== undefined) {
    properties[NOTION_OPPORTUNITY_RUNS.deltaAudPa] = numberProp(run.deltaAudPa);
  }

  return properties;
}

export function assertNoInterestRate(properties: Record<string, unknown>): void {
  if (Object.keys(properties).includes(NOTION_LOANS.interestRate)) {
    throw new Error("Notion adapter must never write Interest Rate from a competitor quote");
  }
}
