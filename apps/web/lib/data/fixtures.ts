import {
  JOB_CONTRACT_VERSION,
  WOMBAT_FIRM_ID,
  computeDeltaBp,
  computeLvr,
  computeSavingFlag,
  type Job,
  type JobKind,
  type JobStatus,
  type OpportunityRun,
  type RankHint,
} from "@wombat/contracts";
import type { DeskMatrixCell, DeskSubject } from "./types";

/** Notion-shaped page ids used by the Phase 1 worker fixture. */
export const PRAI_SUBJECT: DeskSubject = {
  clientPageId: "client_prai",
  clientName: "Prai & Amanda",
  propertyPageId: "property_15_ashley",
  propertyLabel: "15 Ashley Avenue, West Pennant Hills",
  loanPageId: "loan_nab_800k",
  loanLabel: "NAB $800,000",
};

/** Extra household so the grid is a matrix, not a single cell. Clearly demo. */
export const CHEN_SUBJECT: DeskSubject = {
  clientPageId: "client_fixture_chen",
  clientName: "Chen household (fixture)",
  propertyPageId: "property_fixture_parra",
  propertyLabel: "42 Demo Street, Parramatta (fixture)",
  loanPageId: "loan_fixture_cba_620k",
  loanLabel: "CBA $620,000 (fixture)",
};

export const DESK_SUBJECTS: DeskSubject[] = [PRAI_SUBJECT, CHEN_SUBJECT];

const HAPPY_LOAN = 800_000;
const HAPPY_VAL = 1_025_000;
const HAPPY_CURRENT = 0.065;
const HAPPY_NEW = 0.0605;

export const PRAI_NAB_LVR = computeLvr(HAPPY_LOAN, HAPPY_VAL);
export const PRAI_NAB_DELTA_BP = computeDeltaBp(HAPPY_CURRENT, HAPPY_NEW);
export const PRAI_NAB_SAVING = computeSavingFlag({
  currentRate: HAPPY_CURRENT,
  newRate: HAPPY_NEW,
});

const JOB_IDS = {
  valNab: "job_fixture_val_nab",
  priceNab: "job_fixture_price_nab",
  matrixNab: "job_fixture_matrix_nab",
  valCba: "job_fixture_val_cba",
  priceCba: "job_fixture_price_cba",
  matrixCba: "job_fixture_matrix_cba",
  valChen: "job_fixture_val_chen",
  priceChen: "job_fixture_price_chen",
  matrixChen: "job_fixture_matrix_chen",
  priceWbc: "job_fixture_price_wbc",
  corelogicQueued: "job_fixture_val_corelogic",
  bookScanRunning: "job_fixture_book_scan",
  valFailed: "job_fixture_val_failed",
} as const;

const RUN_IDS = {
  praiNabPrior: "run_fixture_prai_nab_20260814",
  praiNab: "run_fixture_prai_nab_20260911",
  praiCba: "run_fixture_prai_cba_20260911",
  chenCba: "run_fixture_chen_cba_20260910",
} as const;

function run(partial: OpportunityRun): OpportunityRun {
  return partial;
}

export const FIXTURE_RUNS: OpportunityRun[] = [
  run({
    runId: RUN_IDS.praiNabPrior,
    firmId: WOMBAT_FIRM_ID,
    ranAt: "2026-08-14T03:10:00.000Z",
    requestedBy: "seat:andre",
    clientPageId: PRAI_SUBJECT.clientPageId,
    propertyPageId: PRAI_SUBJECT.propertyPageId,
    loanPageId: PRAI_SUBJECT.loanPageId,
    currentLenderCode: "NAB",
    targetLenderCode: "NAB",
    loanBalanceAud: HAPPY_LOAN,
    valAud: 1_020_000,
    valDate: "2026-08-14",
    valSource: "other",
    lvr: computeLvr(HAPPY_LOAN, 1_020_000),
    currentRate: HAPPY_CURRENT,
    currentRateSource: "notion_loan",
    newRate: 0.0615,
    savingFlag: "yes",
    deltaBp: computeDeltaBp(HAPPY_CURRENT, 0.0615),
    valuationJobId: "job_fixture_val_nab_prior",
    pricingJobId: "job_fixture_price_nab_prior",
    matrixJobId: "job_fixture_matrix_nab_prior",
    artefactUris: ["fixture:prai-nab-val-prior"],
    notes: "Earlier fixture cell. Saving Yes at 35bp. Flag for Tom, not advice.",
  }),
  run({
    runId: RUN_IDS.praiNab,
    firmId: WOMBAT_FIRM_ID,
    ranAt: "2026-09-11T04:00:00.000Z",
    requestedBy: "seat:andre",
    clientPageId: PRAI_SUBJECT.clientPageId,
    propertyPageId: PRAI_SUBJECT.propertyPageId,
    loanPageId: PRAI_SUBJECT.loanPageId,
    currentLenderCode: "NAB",
    targetLenderCode: "NAB",
    loanBalanceAud: HAPPY_LOAN,
    valAud: HAPPY_VAL,
    valDate: "2026-09-11",
    valSource: "other",
    lvr: PRAI_NAB_LVR,
    currentRate: HAPPY_CURRENT,
    currentRateSource: "notion_loan",
    newRate: HAPPY_NEW,
    savingFlag: PRAI_NAB_SAVING,
    deltaBp: PRAI_NAB_DELTA_BP,
    valuationJobId: JOB_IDS.valNab,
    pricingJobId: JOB_IDS.priceNab,
    matrixJobId: JOB_IDS.matrixNab,
    artefactUris: ["fixture:prai-nab-val", "fixture:prai-nab-price"],
    notes: "Saving Yes. Current 6.50% vs new 6.05% (45bp). Flag for Tom, not advice, not auto-email.",
  }),
  run({
    runId: RUN_IDS.praiCba,
    firmId: WOMBAT_FIRM_ID,
    ranAt: "2026-09-11T04:08:00.000Z",
    requestedBy: "seat:andre",
    clientPageId: PRAI_SUBJECT.clientPageId,
    propertyPageId: PRAI_SUBJECT.propertyPageId,
    loanPageId: PRAI_SUBJECT.loanPageId,
    currentLenderCode: "NAB",
    targetLenderCode: "CBA",
    loanBalanceAud: HAPPY_LOAN,
    valAud: 1_010_000,
    valDate: "2026-09-11",
    valSource: "other",
    lvr: computeLvr(HAPPY_LOAN, 1_010_000),
    currentRate: HAPPY_CURRENT,
    currentRateSource: "notion_loan",
    newRate: 0.0664,
    savingFlag: computeSavingFlag({ currentRate: HAPPY_CURRENT, newRate: 0.0664 }),
    deltaBp: computeDeltaBp(HAPPY_CURRENT, 0.0664),
    valuationJobId: JOB_IDS.valCba,
    pricingJobId: JOB_IDS.priceCba,
    matrixJobId: JOB_IDS.matrixCba,
    artefactUris: ["fixture:prai-cba-val"],
    notes: "Fixture comparison cell. Saving No. Not a live CBA quote.",
  }),
  run({
    runId: RUN_IDS.chenCba,
    firmId: WOMBAT_FIRM_ID,
    ranAt: "2026-09-10T22:40:00.000Z",
    requestedBy: "seat:tom",
    clientPageId: CHEN_SUBJECT.clientPageId,
    propertyPageId: CHEN_SUBJECT.propertyPageId,
    loanPageId: CHEN_SUBJECT.loanPageId,
    currentLenderCode: "CBA",
    targetLenderCode: "CBA",
    loanBalanceAud: 620_000,
    valAud: 890_000,
    valDate: "2026-09-10",
    valSource: "other",
    lvr: computeLvr(620_000, 890_000),
    currentRate: 0.062,
    currentRateSource: "notion_loan",
    newRate: 0.0635,
    savingFlag: computeSavingFlag({ currentRate: 0.062, newRate: 0.0635 }),
    deltaBp: computeDeltaBp(0.062, 0.0635),
    valuationJobId: JOB_IDS.valChen,
    pricingJobId: JOB_IDS.priceChen,
    matrixJobId: JOB_IDS.matrixChen,
    artefactUris: ["fixture:chen-cba"],
    notes: "Demo household so the matrix has a second loan. Saving No. Fixture only.",
  }),
];

function job(args: {
  jobId: string;
  kind: JobKind;
  status: JobStatus;
  requestedBy: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  input: unknown;
  output?: unknown;
  error?: Job["error"];
  subjectRefs?: Job["subjectRefs"];
}): Job {
  return {
    jobId: args.jobId,
    firmId: WOMBAT_FIRM_ID,
    kind: args.kind,
    version: JOB_CONTRACT_VERSION,
    status: args.status,
    requestedBy: args.requestedBy,
    createdAt: args.createdAt,
    updatedAt: args.finishedAt ?? args.startedAt ?? args.createdAt,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    input: args.input,
    output: args.output,
    error: args.error,
    artefacts: [],
    audit: [
      {
        at: args.createdAt,
        actor: args.requestedBy,
        action: "job.created",
        detail: { kind: args.kind, fixture: true },
      },
    ],
    subjectRefs: args.subjectRefs ?? {},
  };
}

export const FIXTURE_JOBS: Job[] = [
  job({
    jobId: JOB_IDS.corelogicQueued,
    kind: "valuation.corelogic_avm",
    status: "queued",
    requestedBy: "seat:tom",
    createdAt: "2026-09-11T05:40:00.000Z",
    input: { fixture: true, lenderCode: "CORELOGIC", note: "Queued fixture. No live AVM." },
    subjectRefs: { propertyPageId: PRAI_SUBJECT.propertyPageId },
  }),
  job({
    jobId: JOB_IDS.bookScanRunning,
    kind: "opportunity.book_scan",
    status: "running",
    requestedBy: "seat:andre",
    createdAt: "2026-09-11T05:12:00.000Z",
    startedAt: "2026-09-11T05:12:20.000Z",
    input: { fixture: true, note: "Running fixture. book_scan is out of scope for Phase 1." },
  }),
  job({
    jobId: JOB_IDS.priceWbc,
    kind: "pricing.lender",
    status: "awaiting_attended_mfa",
    requestedBy: "seat:andre",
    createdAt: "2026-09-11T04:20:00.000Z",
    startedAt: "2026-09-11T04:20:30.000Z",
    input: {
      fixture: false,
      lenderCode: "WBC",
      valuationJobId: "job_missing_wbc_val",
      lvr: PRAI_NAB_LVR,
      loanBalanceAud: HAPPY_LOAN,
      currentRate: HAPPY_CURRENT,
      currentRateSource: "notion_loan",
    },
    subjectRefs: {
      clientPageId: PRAI_SUBJECT.clientPageId,
      propertyPageId: PRAI_SUBJECT.propertyPageId,
      loanPageId: PRAI_SUBJECT.loanPageId,
    },
  }),
  job({
    jobId: JOB_IDS.matrixNab,
    kind: "opportunity.matrix_cell",
    status: "succeeded",
    requestedBy: "seat:andre",
    createdAt: "2026-09-11T03:58:00.000Z",
    startedAt: "2026-09-11T03:59:00.000Z",
    finishedAt: "2026-09-11T04:00:00.000Z",
    input: {
      fixture: true,
      firmId: WOMBAT_FIRM_ID,
      clientPageId: PRAI_SUBJECT.clientPageId,
      propertyPageId: PRAI_SUBJECT.propertyPageId,
      loanPageId: PRAI_SUBJECT.loanPageId,
      targetLenderCode: "NAB",
      currentLenderCode: "NAB",
      valuationJobId: JOB_IDS.valNab,
      pricingJobId: JOB_IDS.priceNab,
    },
    output: {
      opportunityRunId: RUN_IDS.praiNab,
      savingFlag: PRAI_NAB_SAVING,
      currentRate: HAPPY_CURRENT,
      newRate: HAPPY_NEW,
      deltaBp: PRAI_NAB_DELTA_BP,
      rankHint: "stay_reprice" satisfies RankHint,
    },
    subjectRefs: {
      clientPageId: PRAI_SUBJECT.clientPageId,
      propertyPageId: PRAI_SUBJECT.propertyPageId,
      loanPageId: PRAI_SUBJECT.loanPageId,
    },
  }),
  job({
    jobId: JOB_IDS.valNab,
    kind: "valuation.lender",
    status: "succeeded",
    requestedBy: "seat:andre",
    createdAt: "2026-09-11T03:50:00.000Z",
    startedAt: "2026-09-11T03:50:10.000Z",
    finishedAt: "2026-09-11T03:51:00.000Z",
    input: {
      fixture: true,
      firmId: WOMBAT_FIRM_ID,
      lenderCode: "NAB",
      loanBalanceAud: HAPPY_LOAN,
      address: {
        line1: "15 Ashley Avenue",
        suburb: "West Pennant Hills",
        state: "NSW",
        postcode: "2125",
      },
    },
    output: {
      lenderCode: "NAB",
      valueAud: HAPPY_VAL,
      valueDate: "2026-09-11",
      source: "other",
      freeVsPaid: "unknown",
      confidence: "medium",
      rawRef: "fixture:prai-nab-val",
    },
    subjectRefs: { propertyPageId: PRAI_SUBJECT.propertyPageId },
  }),
  job({
    jobId: JOB_IDS.valFailed,
    kind: "valuation.lender",
    status: "failed",
    requestedBy: "seat:tom",
    createdAt: "2026-09-11T02:05:00.000Z",
    startedAt: "2026-09-11T02:05:08.000Z",
    finishedAt: "2026-09-11T02:05:40.000Z",
    input: { fixture: true, lenderCode: "ANZ", note: "Failed fixture for the job board." },
    error: {
      code: "FIXTURE_PORTAL_UNAVAILABLE",
      message: "Fixture failure. Live ANZ portal was not called.",
      retryable: true,
    },
    subjectRefs: { propertyPageId: CHEN_SUBJECT.propertyPageId },
  }),
];

export const FIXTURE_CELLS: DeskMatrixCell[] = [
  {
    id: "cell_prai_nab",
    subject: PRAI_SUBJECT,
    currentLenderCode: "NAB",
    targetLenderCode: "NAB",
    valAud: HAPPY_VAL,
    lvr: PRAI_NAB_LVR,
    currentRate: HAPPY_CURRENT,
    newRate: HAPPY_NEW,
    savingFlag: PRAI_NAB_SAVING,
    deltaBp: PRAI_NAB_DELTA_BP,
    rankHint: "stay_reprice",
    latestRunId: RUN_IDS.praiNab,
    isHappyPath: true,
    fixtureNote: "Phase 1 happy path. Current rate from the Notion loan row.",
  },
  {
    id: "cell_prai_cba",
    subject: PRAI_SUBJECT,
    currentLenderCode: "NAB",
    targetLenderCode: "CBA",
    valAud: 1_010_000,
    lvr: computeLvr(HAPPY_LOAN, 1_010_000),
    currentRate: HAPPY_CURRENT,
    newRate: 0.0664,
    savingFlag: "no",
    deltaBp: computeDeltaBp(HAPPY_CURRENT, 0.0664),
    rankHint: "skip",
    latestRunId: RUN_IDS.praiCba,
    isHappyPath: false,
    fixtureNote: "Demo comparison lender. Saving No. Not a live quote.",
  },
  {
    id: "cell_prai_wbc",
    subject: PRAI_SUBJECT,
    currentLenderCode: "NAB",
    targetLenderCode: "WBC",
    currentRate: HAPPY_CURRENT,
    savingFlag: "unknown",
    rankHint: "monitor",
    isHappyPath: false,
    fixtureNote: "Empty cell. Pricing job is awaiting MFA. Live portals are off.",
  },
  {
    id: "cell_chen_cba",
    subject: CHEN_SUBJECT,
    currentLenderCode: "CBA",
    targetLenderCode: "CBA",
    valAud: 890_000,
    lvr: computeLvr(620_000, 890_000),
    currentRate: 0.062,
    newRate: 0.0635,
    savingFlag: "no",
    deltaBp: computeDeltaBp(0.062, 0.0635),
    rankHint: "skip",
    latestRunId: RUN_IDS.chenCba,
    isHappyPath: false,
    fixtureNote: "Second fixture household so the grid reads as a matrix.",
  },
];

export const FIXTURE_GENERATED_AT = "2026-09-11T06:00:00.000Z";
