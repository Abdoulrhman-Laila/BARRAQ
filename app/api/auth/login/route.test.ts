import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const ENV_KEYS = [
  "NODE_ENV",
  "NEXT_PUBLIC_API_BINDING_ENABLED",
  "API_BINDING_ENABLED",
] as const;
type EnvSnapshot = Partial<
  Record<(typeof ENV_KEYS)[number], string | undefined>
>;

// NODE_ENV is typed read-only by @types/node; vi.stubEnv/unstubAllEnvs is
// the sanctioned way to override it (and any other env var) per-test.
function setEnv(values: EnvSnapshot) {
  for (const key of ENV_KEYS) {
    if (values[key] !== undefined) vi.stubEnv(key, values[key]);
  }
}

function loginRequest() {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "test-request-id",
    },
    body: JSON.stringify({
      email: "someone@example.com",
      password: "whatever",
    }),
  });
}

describe("POST /api/auth/login — offline-bypass safety", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refuses to mint an unauthenticated session in production, even with binding explicitly disabled", async () => {
    setEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_API_BINDING_ENABLED: "false",
    });
    const response = await POST(loginRequest());
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses to mint an unauthenticated session in production when the binding flag is simply unset", async () => {
    setEnv({ NODE_ENV: "production" });
    // With no flag set, isApiBindingEnabled() now defaults to true in
    // production, so this attempts a real backend call. Stub fetch to fail
    // fast instead of actually hitting the network — the point of this test
    // is only that the outcome is never a 200 with offline auth cookies.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unreachable")),
    );

    const response = await POST(loginRequest());
    const body = (await response.json()) as { success: boolean };

    // The exact status now depends on the classified failure kind (502 for a
    // generic network error, 504 for a timeout, 503 as the unclassified
    // fallback — see lib/api/backend-http.ts::classifyBackendError) rather
    // than a single hardcoded 503 for every transport failure. What this
    // test actually guards is the security invariant: never a 2xx, and
    // never an offline-bypass session cookie.
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.status).toBeLessThan(600);
    expect(body.success).toBe(false);
    expect(response.headers.get("set-cookie")).toBeNull();

    vi.unstubAllGlobals();
  });

  it("still allows the offline bypass outside production, for local dev without a backend", async () => {
    setEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_API_BINDING_ENABLED: "false",
    });
    const response = await POST(loginRequest());
    const body = (await response.json()) as {
      success: boolean;
      data: { offline: boolean };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.offline).toBe(true);
    expect(response.headers.get("set-cookie")).toBeTruthy();
  });
});

describe("POST /api/auth/login — backend integration contract", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates secure HttpOnly cookies only after Django confirms admin access", async () => {
    setEnv({ NODE_ENV: "production", API_BINDING_ENABLED: "true" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: { access: "access-token", refresh: "refresh-token" },
        }),
      )
      .mockResolvedValueOnce(Response.json({ data: { id: 1, role: "admin" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(loginRequest());
    const cookies = response.headers.getSetCookie().join("\n");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(cookies).toContain("baraq_access=access-token");
    expect(cookies).toContain("baraq_refresh=refresh-token");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("Secure");
    expect(cookies).toContain("SameSite=lax");
    expect(cookies).toContain("Path=/");
    expect(cookies).toContain("Max-Age=1800");
    expect(cookies).toContain("Max-Age=1209600");

    // The transport must call fetch as (url, init) with an already-serialized
    // string body. Handing fetch a Request object with a stream body is what
    // let Next.js's patched global fetch rebuild the request and drop the
    // credentials — see lib/api/backend-http.ts and tests/wire/.
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.baraqapp.com/api/v1/auth/login/");
    expect(url).not.toBeInstanceOf(Request);
    expect(init.redirect).toBe("manual");
    expect(typeof init.body).toBe("string");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Forwarded-Proto"]).toBe("https");
    expect(headers["X-Request-ID"]).toBe("test-request-id");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "someone@example.com",
      password: "whatever",
    });
  });

  it("preserves Django's 401 semantics when fake credentials reach the canonical login route", async () => {
    setEnv({ NODE_ENV: "production", API_BINDING_ENABLED: "true" });
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        { success: false, message: "Invalid credentials", code: "authentication_error" },
        { status: 401 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(loginRequest());
    const payload = (await response.json()) as { code: string };
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(response.status).toBe(401);
    expect(payload.code).toBe("authentication_error");
    expect(url).toBe("https://api.baraqapp.com/api/v1/auth/login/");
    expect((init.headers as Record<string, string>)["Content-Type"]).toContain(
      "application/json",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      email: "someone@example.com",
      password: "whatever",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a non-admin account without writing cookies", async () => {
    setEnv({ NODE_ENV: "production", API_BINDING_ENABLED: "true" });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            data: { access: "student-access", refresh: "student-refresh" },
          }),
        )
        .mockResolvedValueOnce(
          Response.json({ detail: "Forbidden" }, { status: 403 }),
        ),
    );

    const response = await POST(loginRequest());

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns a gateway error instead of relaying an upstream redirect", async () => {
    setEnv({ NODE_ENV: "production", API_BINDING_ENABLED: "true" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 301, headers: { location: "/login/" } }),
        ),
    );

    const response = await POST(loginRequest());

    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("never writes the submitted password or tokens to failure logs", async () => {
    setEnv({ NODE_ENV: "production", API_BINDING_ENABLED: "true" });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unreachable")),
    );

    await POST(loginRequest());
    const output = JSON.stringify(log.mock.calls);

    expect(output).not.toContain("whatever");
    expect(output).not.toContain("access-token");
    expect(output).not.toContain("refresh-token");
    expect(output).toContain("test-request-id");
  });
});
