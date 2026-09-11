import type { Context } from "hono";

export type DeskAuthConfig = {
  /** When set, Desk and job routes require Bearer or X-Api-Key. Unset = local open. */
  apiKey?: string;
};

export function resolveDeskAuthConfig(env: NodeJS.ProcessEnv = process.env): DeskAuthConfig {
  const apiKey = env.DESK_API_KEY?.trim() || env.API_AUTH_TOKEN?.trim() || undefined;
  return { apiKey };
}

export function presentedApiKey(c: Context): string | undefined {
  const headerKey = c.req.header("x-api-key")?.trim();
  if (headerKey) return headerKey;
  const authorization = c.req.header("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice("bearer ".length).trim();
    return token || undefined;
  }
  return undefined;
}

export function requesterFromRequest(c: Context, fallback?: string): string | undefined {
  return c.req.header("x-requested-by")?.trim() || fallback;
}

export function authorizeDeskRequest(
  c: Context,
  config: DeskAuthConfig,
): { ok: true } | { ok: false; status: 401; message: string } {
  if (!config.apiKey) {
    return { ok: true };
  }
  const presented = presentedApiKey(c);
  if (!presented || presented !== config.apiKey) {
    return { ok: false, status: 401, message: "unauthorized" };
  }
  return { ok: true };
}
