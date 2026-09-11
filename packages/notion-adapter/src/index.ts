export {
  DryRunCrmWriteBackAdapter,
  NotionCrmWriteBackAdapter,
  createNotionAdapterFromEnv,
} from "./adapter.js";
export type { NotionAdapterOptions } from "./adapter.js";
export { createNotionRestClient } from "./client.js";
export type { NotionPagesClient, NotionPageSnapshot } from "./client.js";
export {
  LOAN_WRITABLE_FIELDS,
  NOTION_LOANS,
  NOTION_PROPERTIES,
  appendCitation,
  assertNoInterestRate,
  buildLoanOpportunityProperties,
  buildOpportunityRunPageProperties,
  buildPropertySummaryProperties,
  citationLine,
  mergeOpportunityTypes,
} from "./mapping.js";
