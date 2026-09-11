export const DESK_SESSION_COOKIE = "wombat_desk_session";
export const DESK_SESSION_VALUE = "tom";

export function deskGatePassword(): string | undefined {
  const value = process.env.DESK_GATE_PASSWORD;
  return value && value.length > 0 ? value : undefined;
}

export function isDeskGateOpen(): boolean {
  return deskGatePassword() === undefined;
}
