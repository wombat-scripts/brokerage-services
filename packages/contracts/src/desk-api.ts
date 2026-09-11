import { z } from "zod";
import { jobSchema } from "./job.js";
import { opportunityRunSchema, opportunityRunStatusSchema } from "./opportunity-run.js";

export const deskOpportunityRunListQuerySchema = z.object({
  client: z.string().min(1).optional(),
  status: opportunityRunStatusSchema.optional(),
});

export type DeskOpportunityRunListQuery = z.infer<typeof deskOpportunityRunListQuerySchema>;

export const deskJobListQuerySchema = z.object({
  runId: z.string().min(1).optional(),
});

export type DeskJobListQuery = z.infer<typeof deskJobListQuerySchema>;

export const deskOpportunityRunListResponseSchema = z.object({
  firmId: z.string().min(1),
  opportunityRuns: z.array(opportunityRunSchema),
});

export type DeskOpportunityRunListResponse = z.infer<typeof deskOpportunityRunListResponseSchema>;

export const deskOpportunityRunResponseSchema = z.object({
  firmId: z.string().min(1),
  opportunityRun: opportunityRunSchema,
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
