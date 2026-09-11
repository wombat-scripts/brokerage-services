import {
  CrmWriteBackError,
  WOMBAT_FIRM_ID,
  assertWombatFirmId,
  type CrmWriteBackAdapter,
  type LoanOpportunityType,
  type OpportunityRun,
  type PatchLoanOpportunityArgs,
  type PatchPropertySummaryArgs,
} from "@wombat/contracts";
import { createNotionRestClient, type NotionPagesClient } from "./client.js";
import {
  assertNoInterestRate,
  buildLoanOpportunityProperties,
  buildOpportunityRunPageProperties,
  buildPropertySummaryProperties,
} from "./mapping.js";

export type NotionAdapterOptions = {
  token?: string;
  opportunityRunsDatabaseId?: string;
  pages?: NotionPagesClient;
};

function failClosed(code: string, message: string, retryable = true): never {
  throw new CrmWriteBackError({ code, message, retryable });
}

export class NotionCrmWriteBackAdapter implements CrmWriteBackAdapter {
  readonly firmId = WOMBAT_FIRM_ID;
  readonly provider = "notion" as const;
  private readonly pages: NotionPagesClient | undefined;
  private readonly opportunityRunsDatabaseId: string | undefined;

  constructor(options: NotionAdapterOptions = {}) {
    this.opportunityRunsDatabaseId = options.opportunityRunsDatabaseId;
    if (options.pages) {
      this.pages = options.pages;
    } else if (options.token) {
      this.pages = createNotionRestClient(options.token);
    }
  }

  async appendOpportunityRun(run: OpportunityRun): Promise<{ pageId: string }> {
    try {
      assertWombatFirmId(run.firmId);
      const pages = this.requirePages();
      const databaseId = this.opportunityRunsDatabaseId;
      if (!databaseId) {
        failClosed(
          "NOTION_RUNS_DB_MISSING",
          "NOTION_OPPORTUNITY_RUNS_DATABASE_ID is required to append an Opportunity Run",
          false,
        );
      }
      const properties = buildOpportunityRunPageProperties(run);
      assertNoInterestRate(properties);
      const created = await pages.createPage({ parentDatabaseId: databaseId, properties });
      return { pageId: created.id };
    } catch (error) {
      this.rethrow(error, "appendOpportunityRun");
    }
  }

  async patchPropertySummary(args: PatchPropertySummaryArgs): Promise<void> {
    try {
      if (!args.sourceRunId) {
        failClosed("MISSING_SOURCE_RUN", "sourceRunId is required for Property write-back", false);
      }
      const pages = this.requirePages();
      const existing = await pages.getPage(args.propertyPageId);
      const properties = buildPropertySummaryProperties({
        patch: args,
        existingNotes: existing.notes,
      });
      assertNoInterestRate(properties);
      await pages.updatePage({ pageId: args.propertyPageId, properties });
    } catch (error) {
      this.rethrow(error, "patchPropertySummary");
    }
  }

  async patchLoanOpportunity(args: PatchLoanOpportunityArgs): Promise<void> {
    try {
      if (!args.sourceRunId) {
        failClosed("MISSING_SOURCE_RUN", "sourceRunId is required for Loan write-back", false);
      }
      const pages = this.requirePages();
      const existing = await pages.getPage(args.loanPageId);
      const properties = buildLoanOpportunityProperties({
        patch: args,
        existingTypes: existing.opportunityTypes as LoanOpportunityType[] | undefined,
        existingNotes: existing.notes,
      });
      assertNoInterestRate(properties);
      await pages.updatePage({ pageId: args.loanPageId, properties });
    } catch (error) {
      this.rethrow(error, "patchLoanOpportunity");
    }
  }

  private requirePages(): NotionPagesClient {
    if (!this.pages) {
      failClosed(
        "NOTION_NOT_CONFIGURED",
        "Notion write-back is not configured (missing NOTION_TOKEN); fail closed",
        true,
      );
    }
    return this.pages;
  }

  private rethrow(error: unknown, action: string): never {
    if (error instanceof CrmWriteBackError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new CrmWriteBackError({
      code: "NOTION_WRITE_FAILED",
      message: `${action} failed: ${message}`,
      retryable: true,
    });
  }
}

export class DryRunCrmWriteBackAdapter implements CrmWriteBackAdapter {
  readonly firmId = WOMBAT_FIRM_ID;
  readonly provider = "notion" as const;

  async appendOpportunityRun(run: OpportunityRun): Promise<{ pageId: string }> {
    assertWombatFirmId(run.firmId);
    console.info("notion dry-run appendOpportunityRun", { runId: run.runId, sourceRunId: run.runId });
    return { pageId: `dry-run:${run.runId}` };
  }

  async patchPropertySummary(args: PatchPropertySummaryArgs): Promise<void> {
    if (!args.sourceRunId) {
      failClosed("MISSING_SOURCE_RUN", "sourceRunId is required for Property write-back", false);
    }
    console.info("notion dry-run patchPropertySummary", {
      propertyPageId: args.propertyPageId,
      sourceRunId: args.sourceRunId,
    });
  }

  async patchLoanOpportunity(args: PatchLoanOpportunityArgs): Promise<void> {
    if (!args.sourceRunId) {
      failClosed("MISSING_SOURCE_RUN", "sourceRunId is required for Loan write-back", false);
    }
    console.info("notion dry-run patchLoanOpportunity", {
      loanPageId: args.loanPageId,
      sourceRunId: args.sourceRunId,
    });
  }
}

export function createNotionAdapterFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): CrmWriteBackAdapter {
  if (env.NOTION_DRY_RUN === "true") {
    return new DryRunCrmWriteBackAdapter();
  }
  return new NotionCrmWriteBackAdapter({
    token: env.NOTION_TOKEN || undefined,
    opportunityRunsDatabaseId: env.NOTION_OPPORTUNITY_RUNS_DATABASE_ID || undefined,
  });
}
