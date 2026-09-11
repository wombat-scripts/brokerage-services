import { z } from "zod";
import { firmIdSchema } from "./firm.js";

export const savingFlagSchema = z.enum(["yes", "no", "unknown"]);

export type SavingFlag = z.infer<typeof savingFlagSchema>;

export const rankHintSchema = z.enum(["stay_reprice", "switch", "monitor", "skip"]);

export type RankHint = z.infer<typeof rankHintSchema>;

export const matrixCellInputSchema = z.object({
  firmId: firmIdSchema,
  clientPageId: z.string().min(1),
  propertyPageId: z.string().min(1),
  loanPageId: z.string().min(1),
  targetLenderCode: z.string().min(1),
  valuationJobId: z.string().min(1),
  pricingJobId: z.string().min(1),
  currentLenderCode: z.string().min(1).optional(),
  fixture: z.boolean().optional(),
});

export type MatrixCellInput = z.infer<typeof matrixCellInputSchema>;

export const matrixCellOutputSchema = z.object({
  opportunityRunId: z.string().min(1),
  savingFlag: savingFlagSchema,
  currentRate: z.number().optional(),
  newRate: z.number().optional(),
  deltaBp: z.number().optional(),
  deltaAudPaEstimate: z.number().optional(),
  rankHint: rankHintSchema.optional(),
});

export type MatrixCellOutput = z.infer<typeof matrixCellOutputSchema>;

/** (current - new) * 10000, rounded to nearest basis point. */
export function computeDeltaBp(currentRate: number, newRate: number): number {
  return Math.round((currentRate - newRate) * 10000);
}

/**
 * Saving Yes is a flag for Tom — not advice and not an auto-email.
 * Positive delta (new rate lower than current) → yes.
 */
export function computeSavingFlag(args: {
  currentRate?: number;
  newRate?: number;
}): SavingFlag {
  if (args.currentRate === undefined || args.newRate === undefined) {
    return "unknown";
  }
  return args.currentRate > args.newRate ? "yes" : "no";
}
