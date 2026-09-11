/** Keys that must never be logged. Do not match metadata like secretId or mfaMode. */
const SECRET_KEY_PATTERN =
  /^(password|secret|token|totp|totp_seed|otp|credentials?|authorization|access_key|api_key|seed)$/i;

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redactSecrets(nested);
    }
    return out;
  }
  return value;
}

export function safeVaultLog(message: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(message, redactSecrets(detail));
  } else {
    console.info(message);
  }
}
