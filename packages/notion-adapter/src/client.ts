export type NotionPageSnapshot = {
  id: string;
  properties: Record<string, unknown>;
  notes?: string;
  opportunityTypes?: string[];
};

export interface NotionPagesClient {
  createPage(args: {
    parentDatabaseId: string;
    properties: Record<string, unknown>;
  }): Promise<{ id: string }>;
  getPage(pageId: string): Promise<NotionPageSnapshot>;
  updatePage(args: { pageId: string; properties: Record<string, unknown> }): Promise<void>;
}

const NOTION_VERSION = "2022-06-28";

function readRichText(property: unknown): string | undefined {
  if (!property || typeof property !== "object") return undefined;
  const value = property as { rich_text?: Array<{ plain_text?: string }> };
  const text = value.rich_text?.map((part) => part.plain_text ?? "").join("");
  return text && text.length > 0 ? text : undefined;
}

function readMultiSelect(property: unknown): string[] {
  if (!property || typeof property !== "object") return [];
  const value = property as { multi_select?: Array<{ name?: string }> };
  return (value.multi_select ?? []).map((item) => item.name).filter((name): name is string => !!name);
}

export function createNotionRestClient(token: string): NotionPagesClient {
  async function notionFetch(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`https://api.notion.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(`Notion API ${response.status}: ${JSON.stringify({ code: body.code, message: body.message })}`);
    }
    return body;
  }

  return {
    async createPage(args) {
      const body = await notionFetch("/pages", {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: args.parentDatabaseId },
          properties: args.properties,
        }),
      });
      return { id: String(body.id) };
    },
    async getPage(pageId) {
      const body = await notionFetch(`/pages/${pageId}`);
      const properties = (body.properties ?? {}) as Record<string, unknown>;
      return {
        id: String(body.id),
        properties,
        notes: readRichText(properties.Notes),
        opportunityTypes: readMultiSelect(properties["Opportunity Type"]),
      };
    },
    async updatePage(args) {
      await notionFetch(`/pages/${args.pageId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: args.properties }),
      });
    },
  };
}
