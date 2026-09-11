import { z } from "zod";
import type { FirmId } from "./firm.js";
import type { OpportunityRun } from "./opportunity-run.js";

/** Live Properties / Loans Opportunity Status (11 Sep 2026). */
export const propertyOpportunityStatusSchema = z.enum([
  "Not assessed",
  "Monitor",
  "Contact now",
  "Contacted",
  "Active deal",
  "No current opportunity",
]);

export type PropertyOpportunityStatus = z.infer<typeof propertyOpportunityStatusSchema>;

export const loanOpportunityStatusSchema = propertyOpportunityStatusSchema;
export type LoanOpportunityStatus = z.infer<typeof loanOpportunityStatusSchema>;

/** Live Loans Opportunity Type multi-select (11 Sep 2026). */
export const loanOpportunityTypeSchema = z.enum([
  "Reprice",
  "Refinance",
  "Equity release",
  "Next purchase",
  "Fixed expiry",
  "IO expiry",
  "Structure review",
  "Retention review",
]);

export type LoanOpportunityType = z.infer<typeof loanOpportunityTypeSchema>;

export type PatchPropertySummaryArgs = {
  propertyPageId: string;
  estimatedValueAud?: number;
  valueDate?: string;
  opportunityStatus?: PropertyOpportunityStatus;
  doThisNext?: string;
  sourceRunId: string;
};

export type PatchLoanOpportunityArgs = {
  loanPageId: string;
  opportunityTypeAdd?: LoanOpportunityType[];
  opportunityStatus?: LoanOpportunityStatus;
  doThisNext?: string;
  sourceRunId: string;
};

/**
 * Only path seats use to mutate CRM from jobs.
 * Never overwrite Loans.Interest Rate from a competitor quote.
 */
export interface CrmWriteBackAdapter {
  firmId: FirmId;
  provider: "notion" | "salesforce" | "hubspot" | "csv";
  appendOpportunityRun(run: OpportunityRun): Promise<{ pageId: string }>;
  patchPropertySummary(args: PatchPropertySummaryArgs): Promise<void>;
  patchLoanOpportunity(args: PatchLoanOpportunityArgs): Promise<void>;
}

export class CrmWriteBackError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(args: { code: string; message: string; retryable: boolean }) {
    super(args.message);
    this.name = "CrmWriteBackError";
    this.code = args.code;
    this.retryable = args.retryable;
  }
}
