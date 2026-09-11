import { z } from "zod";
import type { UnlockStatus, VaultSecretMeta } from "@wombat/contracts";

const attendedMfaModes = new Set(["email_attended", "attended", "push"]);

export const nabBrokerPortalPayloadSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totp_seed: z.string().min(1).optional(),
});

export type NabBrokerPortalPayload = z.infer<typeof nabBrokerPortalPayloadSchema>;

export const corelogicPropertyHubPayloadSchema = z.object({
  portal: z.literal("corelogic_property_hub"),
  entry_email: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  mfa_mode: z.enum(["email_attended", "attended", "push", "totp_managed", "none"]),
  mfa_email_hint: z.string().min(1).optional(),
});

export type CorelogicPropertyHubPayload = z.infer<typeof corelogicPropertyHubPayloadSchema>;

export type VaultSecretPayload = NabBrokerPortalPayload | CorelogicPropertyHubPayload;

export type ParsedVaultSecret = {
  secretId: string;
  kind: VaultSecretMeta["kind"];
  label: string;
  usernameHint: string;
  mfaMode: VaultSecretMeta["mfaMode"];
  unlockStatus: UnlockStatus;
};

function asJsonObject(raw: string, secretId: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Vault secret ${secretId} is not JSON`);
  }
}

/**
 * Parse without echoing received values — Zod issues can contain passwords.
 */
export function parseNabBrokerPortalPayload(raw: string, secretId: string): NabBrokerPortalPayload {
  const parsed = nabBrokerPortalPayloadSchema.safeParse(asJsonObject(raw, secretId));
  if (!parsed.success) {
    throw new Error(`Invalid vault payload shape for ${secretId}`);
  }
  return parsed.data;
}

export function parseCorelogicPropertyHubPayload(
  raw: string,
  secretId: string,
): CorelogicPropertyHubPayload {
  const parsed = corelogicPropertyHubPayloadSchema.safeParse(asJsonObject(raw, secretId));
  if (!parsed.success) {
    throw new Error(`Invalid vault payload shape for ${secretId}`);
  }
  return parsed.data;
}

export function mfaModeFromPayload(payload: {
  mfa_mode?: string;
  totp_seed?: string;
}): VaultSecretMeta["mfaMode"] {
  if (payload.mfa_mode && attendedMfaModes.has(payload.mfa_mode)) {
    return "attended";
  }
  if (payload.mfa_mode === "totp_managed" || payload.totp_seed) {
    return "totp_managed";
  }
  if (payload.mfa_mode === "none") {
    return "none";
  }
  return payload.totp_seed ? "totp_managed" : "attended";
}

export function unlockStatusForMfaMode(mfaMode: VaultSecretMeta["mfaMode"]): UnlockStatus {
  return mfaMode === "attended" ? "awaiting_attended_mfa" : "ready";
}

export function describeNabSecret(secretId: string, payload: NabBrokerPortalPayload): ParsedVaultSecret {
  const mfaMode = mfaModeFromPayload(payload);
  return {
    secretId,
    kind: "lender_portal",
    label: "NAB Broker Portal",
    usernameHint: payload.username,
    mfaMode,
    unlockStatus: unlockStatusForMfaMode(mfaMode),
  };
}

export function describeCorelogicSecret(
  secretId: string,
  payload: CorelogicPropertyHubPayload,
): ParsedVaultSecret {
  const mfaMode = mfaModeFromPayload(payload);
  return {
    secretId,
    kind: "corelogic",
    label: "CoreLogic Property Hub",
    usernameHint: payload.username,
    mfaMode,
    unlockStatus: unlockStatusForMfaMode(mfaMode),
  };
}
