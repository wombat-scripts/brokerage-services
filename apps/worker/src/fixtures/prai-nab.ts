import type { AustralianAddress, PricingLenderOutput, ValuationLenderOutput } from "@wombat/contracts";

/** Prai & Amanda · 15 Ashley Avenue, West Pennant Hills · current lender NAB. */
export const PRAI_NAB_FIXTURE = {
  clientName: "Prai & Amanda",
  address: {
    line1: "15 Ashley Avenue",
    suburb: "West Pennant Hills",
    state: "NSW",
    postcode: "2125",
  } satisfies AustralianAddress,
  lenderCode: "NAB",
  loanBalanceAud: 800_000,
  valueAud: 1_025_000,
  valueDate: "2026-09-11",
  currentRate: 0.065,
  currentRateSource: "notion_loan" as const,
  newRate: 0.0605,
  comparisonRate: 0.0612,
  offerLabel: "NAB fixture variable OO (Phase 1 — not a live portal quote)",
};

export const PRAI_NAB_LVR = PRAI_NAB_FIXTURE.loanBalanceAud / PRAI_NAB_FIXTURE.valueAud;

export function fixtureValuationOutput(): ValuationLenderOutput {
  return {
    lenderCode: PRAI_NAB_FIXTURE.lenderCode,
    valueAud: PRAI_NAB_FIXTURE.valueAud,
    valueDate: PRAI_NAB_FIXTURE.valueDate,
    source: "other",
    freeVsPaid: "unknown",
    confidence: "medium",
    rawRef: "fixture:prai-nab-val",
  };
}

export function fixturePricingOutput(lvrUsed: number): PricingLenderOutput {
  return {
    lenderCode: PRAI_NAB_FIXTURE.lenderCode,
    lvrUsed,
    newRate: PRAI_NAB_FIXTURE.newRate,
    comparisonRate: PRAI_NAB_FIXTURE.comparisonRate,
    offerLabel: PRAI_NAB_FIXTURE.offerLabel,
    pricedAt: new Date().toISOString(),
    portalRef: "fixture:prai-nab-price",
  };
}
