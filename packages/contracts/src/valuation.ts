import { z } from "zod";
import { firmIdSchema } from "./firm.js";

export const australianAddressSchema = z.object({
  line1: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string().min(1),
  postcode: z.string().min(1),
});

export type AustralianAddress = z.infer<typeof australianAddressSchema>;

export const valuationLenderInputSchema = z.object({
  firmId: firmIdSchema,
  address: australianAddressSchema,
  lenderCode: z.string().min(1),
  loanBalanceAud: z.number().nonnegative().optional(),
  propertyPageId: z.string().optional(),
  /** Phase 1 only — skip live portal and return the Prai × NAB fixture. */
  fixture: z.boolean().optional(),
});

export type ValuationLenderInput = z.infer<typeof valuationLenderInputSchema>;

export const valuationSourceSchema = z.enum(["lender_portal", "lender_avm_tool", "other"]);

export const valuationLenderOutputSchema = z.object({
  lenderCode: z.string().min(1),
  valueAud: z.number().positive(),
  valueDate: z.string().min(1),
  source: valuationSourceSchema,
  freeVsPaid: z.enum(["free", "paid", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  rawRef: z.string().optional(),
});

export type ValuationLenderOutput = z.infer<typeof valuationLenderOutputSchema>;

export function computeLvr(loanBalanceAud: number, valueAud: number): number {
  if (valueAud <= 0) {
    throw new Error("valueAud must be positive to compute LVR");
  }
  return loanBalanceAud / valueAud;
}
