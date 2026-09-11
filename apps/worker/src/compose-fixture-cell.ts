import {
  WOMBAT_FIRM_ID,
  computeLvr,
  type CrmWriteBackAdapter,
  type Job,
  type MatrixCellInput,
  type MatrixCellOutput,
  type PricingLenderInput,
  type ValuationLenderInput,
} from "@wombat/contracts";
import type { BrokerageStore } from "@wombat/store";
import { PRAI_NAB_FIXTURE } from "./fixtures/prai-nab.js";
import { newJob } from "./jobs.js";
import { processJob } from "./processor.js";

export type FixtureCellArgs = {
  requestedBy: string;
  clientPageId: string;
  propertyPageId: string;
  loanPageId: string;
  currentRate?: number;
  currentRateSource?: PricingLenderInput["currentRateSource"];
};

export async function runFixtureMatrixCell(
  store: BrokerageStore,
  crm: CrmWriteBackAdapter,
  args: FixtureCellArgs,
): Promise<{
  valuation: Job;
  pricing: Job;
  matrix: Job<MatrixCellInput, MatrixCellOutput>;
}> {
  const valInput: ValuationLenderInput = {
    firmId: WOMBAT_FIRM_ID,
    address: PRAI_NAB_FIXTURE.address,
    lenderCode: PRAI_NAB_FIXTURE.lenderCode,
    loanBalanceAud: PRAI_NAB_FIXTURE.loanBalanceAud,
    propertyPageId: args.propertyPageId,
    fixture: true,
  };
  const valuationQueued = await store.jobs.create(
    newJob({
      kind: "valuation.lender",
      requestedBy: args.requestedBy,
      input: valInput,
      subjectRefs: { propertyPageId: args.propertyPageId },
    }),
  );
  const valuation = await processJob(valuationQueued, store, crm);
  if (valuation.status !== "succeeded" || !valuation.output) {
    throw new Error(`valuation fixture failed: ${valuation.error?.message ?? valuation.status}`);
  }

  const valOut = valuation.output as { valueAud: number };
  const lvr = computeLvr(PRAI_NAB_FIXTURE.loanBalanceAud, valOut.valueAud);
  const priceInput: PricingLenderInput = {
    firmId: WOMBAT_FIRM_ID,
    lenderCode: PRAI_NAB_FIXTURE.lenderCode,
    valuationJobId: valuation.jobId,
    lvr,
    loanBalanceAud: PRAI_NAB_FIXTURE.loanBalanceAud,
    currentRate: args.currentRate ?? PRAI_NAB_FIXTURE.currentRate,
    currentRateSource: args.currentRateSource ?? "notion_loan",
    loanPageId: args.loanPageId,
    fixture: true,
  };
  const pricingQueued = await store.jobs.create(
    newJob({
      kind: "pricing.lender",
      requestedBy: args.requestedBy,
      input: priceInput,
      subjectRefs: { loanPageId: args.loanPageId, propertyPageId: args.propertyPageId },
    }),
  );
  const pricing = await processJob(pricingQueued, store, crm);
  if (pricing.status !== "succeeded") {
    throw new Error(`pricing fixture failed: ${pricing.error?.message ?? pricing.status}`);
  }

  const matrixInput: MatrixCellInput = {
    firmId: WOMBAT_FIRM_ID,
    clientPageId: args.clientPageId,
    propertyPageId: args.propertyPageId,
    loanPageId: args.loanPageId,
    targetLenderCode: PRAI_NAB_FIXTURE.lenderCode,
    currentLenderCode: PRAI_NAB_FIXTURE.lenderCode,
    valuationJobId: valuation.jobId,
    pricingJobId: pricing.jobId,
    fixture: true,
  };
  const matrixQueued = await store.jobs.create(
    newJob({
      kind: "opportunity.matrix_cell",
      requestedBy: args.requestedBy,
      input: matrixInput,
      subjectRefs: {
        clientPageId: args.clientPageId,
        propertyPageId: args.propertyPageId,
        loanPageId: args.loanPageId,
      },
    }),
  );
  const matrix = (await processJob(matrixQueued, store, crm)) as Job<
    MatrixCellInput,
    MatrixCellOutput
  >;
  return { valuation, pricing, matrix };
}
