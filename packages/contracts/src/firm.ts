import { z } from "zod";

/** Locked Phase 1 firm. Other firm_ids are reserved and unused until Phase 3. */
export const WOMBAT_FIRM_ID = "wombat" as const;

export const firmIdSchema = z
  .string()
  .min(1)
  .refine((value) => value === WOMBAT_FIRM_ID, {
    message: "Phase 1 only accepts firmId=wombat",
  });

export type FirmId = typeof WOMBAT_FIRM_ID | (string & {});

export function assertWombatFirmId(firmId: string): asserts firmId is typeof WOMBAT_FIRM_ID {
  if (firmId !== WOMBAT_FIRM_ID) {
    throw new Error(`firmId must be "${WOMBAT_FIRM_ID}" (received "${firmId}")`);
  }
}
