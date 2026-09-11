import { WOMBAT_FIRM_ID } from "@wombat/contracts";
import { fixtureDeskSource } from "./fixture-source";
import { HttpDeskSource } from "./http-source";
import type { DeskDataSource } from "./types";

export type DeskSourceKind = "fixture" | "http";

export type DeskSourceEnv = Record<string, string | undefined>;

export function readDeskApiBaseUrl(env: DeskSourceEnv = process.env): string | undefined {
  const value = env.DESK_API_BASE_URL?.trim();
  return value || undefined;
}

/** Same secret the API checks when `DESK_API_KEY` is set. Unset = no auth headers. */
export function readDeskApiKey(env: DeskSourceEnv = process.env): string | undefined {
  const value = env.DESK_API_KEY?.trim();
  return value || undefined;
}

export function isDeskApiConfigured(env: DeskSourceEnv = process.env): boolean {
  return Boolean(readDeskApiBaseUrl(env));
}

export function deskSourceKind(env: DeskSourceEnv = process.env): DeskSourceKind {
  return isDeskApiConfigured(env) ? "http" : "fixture";
}

/**
 * Desk data seam.
 *
 * Default: local fixture book (offline). When `DESK_API_BASE_URL` is set,
 * read Andre's Phase 1.1 endpoints (`GET /v1/firms/:firmId/opportunity-runs`
 * and `GET /v1/firms/:firmId/jobs`). When `DESK_API_KEY` is also set,
 * every request sends `Authorization: Bearer <key>`. Unset key = no auth
 * headers. Do not point this at live NAB or CoreLogic portals.
 */
export function createDeskSource(env: DeskSourceEnv = process.env): DeskDataSource {
  const baseUrl = readDeskApiBaseUrl(env);
  if (env.DESK_DATA_SOURCE?.trim() === "api" && !baseUrl) {
    throw new Error("DESK_DATA_SOURCE=api requires DESK_API_BASE_URL");
  }
  if (!baseUrl) return fixtureDeskSource;
  return new HttpDeskSource({
    baseUrl,
    firmId: env.DESK_FIRM_ID?.trim() || WOMBAT_FIRM_ID,
    apiKey: readDeskApiKey(env),
  });
}

export function getDeskSource(): DeskDataSource {
  return createDeskSource();
}
