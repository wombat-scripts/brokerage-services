import { jobSchema, opportunityRunSchema } from "@wombat/contracts";
import { z } from "zod";

/**
 * Minimal Desk read-response Zod, copied from platform PR #3
 * (`packages/contracts/src/desk-api.ts` on `cursor/phase-1-1-notion-desk-reads-7aab`).
 *
 * That PR is not on main yet, so Desk does not import those wrappers from
 * `@wombat/contracts`. OpportunityRun on main is also missing optional
 * `deltaAudPa` and `status`; extend locally so Phase 1.1 payloads parse.
 * When PR #3 merges, delete this file and import the shared schemas.
 */
export const deskOpportunityRunSchema = opportunityRunSchema.extend({
  deltaAudPa: z.number().optional(),
  status: z.enum(["succeeded", "failed", "unknown", "voided"]).optional(),
});

export const deskOpportunityRunListResponseSchema = z.object({
  firmId: z.string().min(1),
  opportunityRuns: z.array(deskOpportunityRunSchema),
});

export type DeskOpportunityRunListResponse = z.infer<typeof deskOpportunityRunListResponseSchema>;

export const deskOpportunityRunResponseSchema = z.object({
  firmId: z.string().min(1),
  opportunityRun: deskOpportunityRunSchema,
});

export type DeskOpportunityRunResponse = z.infer<typeof deskOpportunityRunResponseSchema>;

export const deskJobListResponseSchema = z.object({
  firmId: z.string().min(1),
  jobs: z.array(jobSchema),
});

export type DeskJobListResponse = z.infer<typeof deskJobListResponseSchema>;

export const deskJobResponseSchema = z.object({
  firmId: z.string().min(1),
  job: jobSchema,
});

export type DeskJobResponse = z.infer<typeof deskJobResponseSchema>;
