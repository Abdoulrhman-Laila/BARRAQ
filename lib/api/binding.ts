/**
 * API binding switch.
 *
 * Set API_BINDING_FORCE_PAUSED = true to hard-disable backend traffic,
 * regardless of env flags. When paused/disabled, auth and BFF refuse
 * access — no offline login cookies and no privileged stubs.
 *
 * Live binding requires:
 * 1) API_BINDING_FORCE_PAUSED = false
 * 2) API_BINDING_ENABLED=true
 * 3) NEXT_PUBLIC_API_BINDING_ENABLED=true (baked at build for the browser)
 * 4) BACKEND_API_URL ending with /api/v1 (see dashboard_api_contract.json)
 */
const API_BINDING_FORCE_PAUSED = false;

function flagTrue(value: string | undefined): boolean {
  return (value ?? "false").toLowerCase() === "true";
}

/** In production, an unconfigured flag defaults to enabled (fail toward the real API, not an offline bypass); elsewhere it defaults to disabled. */
function defaultFlag(): string {
  return process.env.NODE_ENV === "production" ? "true" : "false";
}

/**
 * Binding is enabled based on whichever relevant flag is explicitly set.
 * Server: NEXT_PUBLIC_API_BINDING_ENABLED wins when set (even "false", so a
 * deliberate pause is honored); otherwise falls back to API_BINDING_ENABLED;
 * otherwise defaults per NODE_ENV.
 * Browser: only NEXT_PUBLIC_API_BINDING_ENABLED is available (inlined at build),
 * falling back to the same NODE_ENV default when unset.
 */
export function isApiBindingEnabled(): boolean {
  if (API_BINDING_FORCE_PAUSED) return false;

  const publicRaw = process.env.NEXT_PUBLIC_API_BINDING_ENABLED;
  if (typeof window !== "undefined") return flagTrue(publicRaw ?? defaultFlag());

  const serverRaw = process.env.API_BINDING_ENABLED;
  return flagTrue(publicRaw ?? serverRaw ?? defaultFlag());
}

export function bindingDisabledPayload() {
  return {
    success: false as const,
    message: "API binding is disabled. Live backend authentication is required.",
    code: "api_binding_disabled",
    data: { authenticated: false, verified: false }
  };
}
