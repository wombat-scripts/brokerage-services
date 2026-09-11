import {
  JOB_CONTRACT_VERSION,
  WOMBAT_FIRM_ID,
  computeDeltaAudPa,
  computeDeltaBp,
  computeLvr,
  type Job,
  type OpportunityRun,
} from "@wombat/contracts";
import type { BrokerageStore } from "./types.js";

/** Stable Phase 1.1 Desk + Notion seed ids (Prai × NAB). */
export const PRAI_NAB_DESK_FIXTURE_IDS = {
  runId: "01JPHASE11PRAI0001",
  valuationJobId: "job_val_fixture_prai_nab",
  pricingJobId: "job_price_fixture_prai_nab",
  matrixJobId: "job_matrix_fixture_prai_nab",
  clientPageId: "client_prai",
  propertyPageId: "property_15_ashley",
  loanPageId: "loan_nab_800k",
} as const;

const LOAN_BALANCE = 800_000;
const VAL_AUD = 1_025_000;
const CURRENT_RATE = 0.065;
const NEW_RATE = 0.0605;
const LVR = computeLvr(LOAN_BALANCE, VAL_AUD);
const DELTA_BP = computeDeltaBp(CURRENT_RATE, NEW_RATE);
const DELTA_AUD_PA = computeDeltaAudPa(LOAN_BALANCE, CURRENT_RATE, NEW_RATE);

const SUBJECT_REFS = {
  clientPageId: PRAI_NAB_DESK_FIXTURE_IDS.clientPageId,
  propertyPageId: PRAI_NAB_DESK_FIXTURE_IDS.propertyPageId,
  loanPageId: PRAI_NAB_DESK_FIXTURE_IDS.loanPageId,
};

export const PRAI_NAB_DESK_RUN: OpportunityRun = {
  runId: PRAI_NAB_DESK_FIXTURE_IDS.runId,
  firmId: WOMBAT_FIRM_ID,
  ranAt: "2026-09-11T06:00:00.000Z",
  requestedBy: "platform-andre",
  clientPageId: PRAI_NAB_DESK_FIXTURE_IDS.clientPageId,
  propertyPageId: PRAI_NAB_DESK_FIXTURE_IDS.propertyPageId,
  loanPageId: PRAI_NAB_DESK_FIXTURE_IDS.loanPageId,
  currentLenderCode: "NAB",
  targetLenderCode: "NAB",
  loanBalanceAud: LOAN_BALANCE,
  valAud: VAL_AUD,
  valDate: "2026-09-11",
  valSource: "other",
  lvr: LVR,
  currentRate: CURRENT_RATE,
  currentRateSource: "notion_loan",
  newRate: NEW_RATE,
  savingFlag: "yes",
  deltaBp: DELTA_BP,
  deltaAudPa: DELTA_AUD_PA,
  status: "succeeded",
  valuationJobId: PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId,
  pricingJobId: PRAI_NAB_DESK_FIXTURE_IDS.pricingJobId,
  matrixJobId: PRAI_NAB_DESK_FIXTURE_IDS.matrixJobId,
  artefactUris: ["fixture:prai-nab-val", "fixture:prai-nab-price"],
  notes:
    "Phase 1.1 seed. Matches Phase 1 matrix_cell test: 800k / 1.025m → Saving Yes / 45bp. Flag for Tom, not advice.",
};

function fixtureJob(args: {
  jobId: string;
  kind: Job["kind"];
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  input: unknown;
  output: unknown;
  subjectRefs: Job["subjectRefs"];
}): Job {
  return {
    jobId: args.jobId,
    firmId: WOMBAT_FIRM_ID,
    kind: args.kind,
    version: JOB_CONTRACT_VERSION,
    status: "succeeded",
    requestedBy: "platform-andre",
    createdAt: args.createdAt,
    updatedAt: args.finishedAt,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
    input: args.input,
    output: args.output,
    artefacts: [],
    audit: [
      {
        at: args.createdAt,
        actor: "platform-andre",
        action: "job.created",
        firmId: WOMBAT_FIRM_ID,
        requester: "platform-andre",
        detail: {
          firm_id: WOMBAT_FIRM_ID,
          requester: "platform-andre",
          kind: args.kind,
          fixture: true,
        },
      },
    ],
    subjectRefs: args.subjectRefs,
  };
}

export const PRAI_NAB_DESK_JOBS: Job[] = [
  fixtureJob({
    jobId: PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId,
    kind: "valuation.lender",
    createdAt: "2026-09-11T05:50:00.000Z",
    startedAt: "2026-09-11T05:50:10.000Z",
    finishedAt: "2026-09-11T05:51:00.000Z",
    input: {
      fixture: true,
      firmId: WOMBAT_FIRM_ID,
      lenderCode: "NAB",
      loanBalanceAud: LOAN_BALANCE,
      propertyPageId: PRAI_NAB_DESK_FIXTURE_IDS.propertyPageId,
      address: {
        line1: "15 Ashley Avenue",
        suburb: "West Pennant Hills",
        state: "NSW",
        postcode: "2125",
      },
    },
    output: {
      lenderCode: "NAB",
      valueAud: VAL_AUD,
      valueDate: "2026-09-11",
      source: "other",
      freeVsPaid: "unknown",
      confidence: "medium",
      rawRef: "fixture:prai-nab-val",
    },
    subjectRefs: { propertyPageId: PRAI_NAB_DESK_FIXTURE_IDS.propertyPageId },
  }),
  fixtureJob({
    jobId: PRAI_NAB_DESK_FIXTURE_IDS.pricingJobId,
    kind: "pricing.lender",
    createdAt: "2026-09-11T05:52:00.000Z",
    startedAt: "2026-09-11T05:52:10.000Z",
    finishedAt: "2026-09-11T05:53:00.000Z",
    input: {
      fixture: true,
      firmId: WOMBAT_FIRM_ID,
      lenderCode: "NAB",
      valuationJobId: PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId,
      lvr: LVR,
      loanBalanceAud: LOAN_BALANCE,
      currentRate: CURRENT_RATE,
      currentRateSource: "notion_loan",
      loanPageId: PRAI_NAB_DESK_FIXTURE_IDS.loanPageId,
    },
    output: {
      lenderCode: "NAB",
      lvrUsed: LVR,
      newRate: NEW_RATE,
      comparisonRate: 0.0612,
      offerLabel: "NAB fixture variable OO (Phase 1 — not a live portal quote)",
      pricedAt: "2026-09-11T05:53:00.000Z",
      portalRef: "fixture:prai-nab-price",
    },
    subjectRefs: {
      propertyPageId: PRAI_NAB_DESK_FIXTURE_IDS.propertyPageId,
      loanPageId: PRAI_NAB_DESK_FIXTURE_IDS.loanPageId,
    },
  }),
  fixtureJob({
    jobId: PRAI_NAB_DESK_FIXTURE_IDS.matrixJobId,
    kind: "opportunity.matrix_cell",
    createdAt: "2026-09-11T05:54:00.000Z",
    startedAt: "2026-09-11T05:54:10.000Z",
    finishedAt: "2026-09-11T06:00:00.000Z",
    input: {
      fixture: true,
      firmId: WOMBAT_FIRM_ID,
      ...SUBJECT_REFS,
      targetLenderCode: "NAB",
      currentLenderCode: "NAB",
      valuationJobId: PRAI_NAB_DESK_FIXTURE_IDS.valuationJobId,
      pricingJobId: PRAI_NAB_DESK_FIXTURE_IDS.pricingJobId,
    },
    output: {
      opportunityRunId: PRAI_NAB_DESK_FIXTURE_IDS.runId,
      savingFlag: "yes",
      currentRate: CURRENT_RATE,
      newRate: NEW_RATE,
      deltaBp: DELTA_BP,
      deltaAudPaEstimate: DELTA_AUD_PA,
      rankHint: "stay_reprice",
    },
    subjectRefs: SUBJECT_REFS,
  }),
];

export async function seedPraiNabDeskFixtures(store: BrokerageStore): Promise<void> {
  for (const job of PRAI_NAB_DESK_JOBS) {
    const existing = await store.jobs.get(job.jobId);
    if (!existing) {
      await store.jobs.create(job);
    }
  }
  const existingRun = await store.opportunityRuns.get(PRAI_NAB_DESK_RUN.runId);
  if (!existingRun) {
    await store.opportunityRuns.append(PRAI_NAB_DESK_RUN);
  }
}
