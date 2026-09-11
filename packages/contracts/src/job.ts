import { z } from "zod";
import { firmIdSchema, type FirmId } from "./firm.js";

export const JOB_CONTRACT_VERSION = "0.1.0";

export const jobKindSchema = z.enum([
  "valuation.lender",
  "valuation.corelogic_avm",
  "pricing.lender",
  "opportunity.matrix_cell",
  "opportunity.book_scan",
  "serviceability.orchestrate",
]);

export type JobKind = z.infer<typeof jobKindSchema>;

export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "awaiting_attended_mfa",
  "succeeded",
  "failed",
  "cancelled",
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ["succeeded", "failed", "cancelled"];

export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

export const artefactKindSchema = z.enum(["pdf", "screenshot", "html_snapshot", "json", "other"]);

export const artefactRefSchema = z.object({
  kind: artefactKindSchema,
  uri: z.string().min(1),
  contentType: z.string().optional(),
  sha256: z.string().optional(),
  capturedAt: z.string().min(1),
  label: z.string().optional(),
});

export type ArtefactRef = z.infer<typeof artefactRefSchema>;

export const auditEventSchema = z.object({
  at: z.string().min(1),
  actor: z.string().min(1),
  action: z.string().min(1),
  detail: z.record(z.unknown()).optional(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;

export const jobErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean(),
});

export type JobError = z.infer<typeof jobErrorSchema>;

export const subjectRefsSchema = z.object({
  clientPageId: z.string().optional(),
  propertyPageId: z.string().optional(),
  loanPageId: z.string().optional(),
});

export type SubjectRefs = z.infer<typeof subjectRefsSchema>;

export function jobEnvelopeSchema<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny>(
  input: TInput,
  output: TOutput,
) {
  return z.object({
    jobId: z.string().min(1),
    firmId: firmIdSchema,
    kind: jobKindSchema,
    version: z.string().min(1),
    status: jobStatusSchema,
    requestedBy: z.string().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    input,
    output: output.optional(),
    error: jobErrorSchema.optional(),
    artefacts: z.array(artefactRefSchema),
    audit: z.array(auditEventSchema),
    subjectRefs: subjectRefsSchema,
  });
}

export const jobSchema = jobEnvelopeSchema(z.unknown(), z.unknown());

export type Job<TInput = unknown, TOutput = unknown> = {
  jobId: string;
  firmId: FirmId;
  kind: JobKind;
  version: string;
  status: JobStatus;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  input: TInput;
  output?: TOutput;
  error?: JobError;
  artefacts: ArtefactRef[];
  audit: AuditEvent[];
  subjectRefs: SubjectRefs;
};

export function createAuditEvent(
  actor: string,
  action: string,
  detail?: Record<string, unknown>,
): AuditEvent {
  return {
    at: new Date().toISOString(),
    actor,
    action,
    ...(detail ? { detail } : {}),
  };
}
