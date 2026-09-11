import { z } from "zod";
import { firmIdSchema } from "./firm.js";
import { currentRateSourceSchema } from "./pricing.js";
import { savingFlagSchema } from "./matrix-cell.js";

export const opportunityValSourceSchema = z.enum([
  "lender_portal",
  "lender_avm_tool",
  "corelogic_avm",
  "other",
]);

export type OpportunityValSource = z.infer<typeof opportunityValSourceSchema>;

/** Notion Opportunity Runs Status select (Phase 1.1 live DB). */
export const opportunityRunStatusSchema = z.enum(["succeeded", "failed", "unknown", "voided"]);

export type OpportunityRunStatus = z.infer<typeof opportunityRunStatusSchema>;

export const opportunityRunSchema = z.object({
  runId: z.string().min(1),
  firmId: firmIdSchema,
  ranAt: z.string().min(1),
  requestedBy: z.string().min(1),
  clientPageId: z.string().min(1),
  propertyPageId: z.string().min(1),
  loanPageId: z.string().min(1),
  currentLenderCode: z.string().min(1),
  targetLenderCode: z.string().min(1),
  loanBalanceAud: z.number().nonnegative(),
  valAud: z.number().positive(),
  valDate: z.string().min(1),
  valSource: opportunityValSourceSchema,
  lvr: z.number().positive(),
  currentRate: z.number().optional(),
  currentRateSource: currentRateSourceSchema.optional(),
  newRate: z.number().optional(),
  savingFlag: savingFlagSchema,
  deltaBp: z.number().optional(),
  deltaAudPa: z.number().optional(),
  status: opportunityRunStatusSchema.optional(),
  valuationJobId: z.string().min(1),
  pricingJobId: z.string().min(1),
  matrixJobId: z.string().min(1),
  artefactUris: z.array(z.string()),
  notes: z.string().optional(),
  voidedAt: z.string().optional(),
  voidReason: z.string().optional(),
});

export type OpportunityRun = z.infer<typeof opportunityRunSchema>;

export function resolveOpportunityRunStatus(run: OpportunityRun): OpportunityRunStatus {
  if (run.voidedAt) return "voided";
  return run.status ?? "succeeded";
}
