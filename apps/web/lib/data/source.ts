import { fixtureDeskSource } from "./fixture-source";
import type { DeskDataSource } from "./types";

/**
 * Desk data seam.
 *
 * Phase A always returns the fixture book. Do not point this at live NAB or
 * CoreLogic portals. When Andre adds list reads (`GET /jobs`, opportunity
 * runs), add an HttpDeskSource here and select it with DESK_DATA_SOURCE=api.
 */
export function getDeskSource(): DeskDataSource {
  return fixtureDeskSource;
}
