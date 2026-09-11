import { ulid } from "ulid";
import {
  JOB_CONTRACT_VERSION,
  WOMBAT_FIRM_ID,
  createAuditEvent,
  type Job,
  type JobKind,
  type SubjectRefs,
} from "@wombat/contracts";

export function newJob<TInput>(args: {
  kind: JobKind;
  requestedBy: string;
  input: TInput;
  subjectRefs?: SubjectRefs;
}): Job<TInput> {
  const now = new Date().toISOString();
  return {
    jobId: ulid(),
    firmId: WOMBAT_FIRM_ID,
    kind: args.kind,
    version: JOB_CONTRACT_VERSION,
    status: "queued",
    requestedBy: args.requestedBy,
    createdAt: now,
    updatedAt: now,
    input: args.input,
    artefacts: [],
    audit: [createAuditEvent(args.requestedBy, "job.created", { kind: args.kind })],
    subjectRefs: args.subjectRefs ?? {},
  };
}

export function touchJob<TInput, TOutput>(
  job: Job<TInput, TOutput>,
  patch: Partial<Job<TInput, TOutput>>,
): Job<TInput, TOutput> {
  return {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}
