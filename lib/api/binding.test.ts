import { afterEach, describe, expect, it, vi } from "vitest";
import { bindingDisabledPayload, isApiBindingEnabled } from "./binding";

const ENV_KEYS = ["NEXT_PUBLIC_API_BINDING_ENABLED", "API_BINDING_ENABLED", "NODE_ENV"] as const;
type EnvSnapshot = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

// NODE_ENV is typed read-only by @types/node; vi.stubEnv/unstubAllEnvs is
// the sanctioned way to override it (and any other env var) per-test.
function setEnv(values: EnvSnapshot) {
  for (const key of ENV_KEYS) {
    if (values[key] !== undefined) vi.stubEnv(key, values[key]);
  }
}

describe("isApiBindingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled when neither flag is set", () => {
    setEnv({});
    expect(isApiBindingEnabled()).toBe(false);
  });

  it("is enabled when the public flag is 'true'", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "true" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("is case-insensitive", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "TRUE" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("falls back to the server-only flag when the public one is unset", () => {
    setEnv({ API_BINDING_ENABLED: "true" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("prefers the public flag over the server flag when both are set", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "false", API_BINDING_ENABLED: "true" });
    expect(isApiBindingEnabled()).toBe(false);
  });

  it("treats any non-'true' value as disabled", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "1" });
    expect(isApiBindingEnabled()).toBe(false);
  });

  it("defaults to ENABLED in production when neither flag is set (fail toward real API, not offline bypass)", () => {
    setEnv({ NODE_ENV: "production" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("honors an explicit 'false' flag in production (deliberate pause still refuses offline bypass at the route level)", () => {
    setEnv({ NODE_ENV: "production", NEXT_PUBLIC_API_BINDING_ENABLED: "false" });
    expect(isApiBindingEnabled()).toBe(false);
  });

  it("honors an explicit 'true' flag in production", () => {
    setEnv({ NODE_ENV: "production", API_BINDING_ENABLED: "true" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("still defaults to disabled outside production when neither flag is set", () => {
    setEnv({ NODE_ENV: "development" });
    expect(isApiBindingEnabled()).toBe(false);
  });
});

describe("bindingDisabledPayload", () => {
  it("returns a generic disabled envelope with no privileged data (paused mode no longer serves offline stubs)", () => {
    const payload = bindingDisabledPayload();
    expect(payload.success).toBe(false);
    expect(payload.code).toBe("api_binding_disabled");
    expect(payload.data).toEqual({ authenticated: false, verified: false });
  });
});
