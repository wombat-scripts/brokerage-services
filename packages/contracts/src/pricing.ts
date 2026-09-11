import { z } from "zod";
import { firmIdSchema } from "./firm.js";

export const currentRateSourceSchema = z.enum(["notion_loan", "portal", "manual"]);

export type CurrentRateSource = z.infer<typeof currentRateSourceSchema>;

export const productPrefsSchema = z.object({
  rateType: z.enum(["variable", "fixed", "either"]).optional(),
  repaymentType: z.enum(["pi", "io", "either"]).optional(),
  termYears: z.number().int().positive().optional(),
  ownerOccupied: z.boolean().optional(),
});

export const pricingLenderInputSchema = z.object({
  firmId: firmIdSchema,
  lenderCode: z.string().min(1),
  // REQUIRED: LVR must come from that lender's valuation job — never a generic 80%.
  valuationJobId: z.string().min(1),
  lvr: z.number().positive().max(2),
  loanBalanceAud: z.number().nonnegative(),
  productPrefs: productPrefsSchema.optional(),
  currentRate: z.number().nonnegative().optional(),
  currentRateSource: currentRateSourceSchema.optional(),
  loanPageId: z.string().optional(),
  fixture: z.boolean().optional(),
});

export type PricingLenderInput = z.infer<typeof pricingLenderInputSchema>;

export const pricingLenderOutputSchema = z.object({
  lenderCode: z.string().min(1),
  lvrUsed: z.number().positive(),
  newRate: z.number().nonnegative().optional(),
  comparisonRate: z.number().nonnegative().optional(),
  fees: z
    .object({
      setupAud: z.number().nonnegative().optional(),
      ongoingMonthlyAud: z.number().nonnegative().optional(),
    })
    .optional(),
  offerLabel: z.string().optional(),
  pricedAt: z.string().min(1),
  portalRef: z.string().optional(),
});

export type PricingLenderOutput = z.infer<typeof pricingLenderOutputSchema>;
