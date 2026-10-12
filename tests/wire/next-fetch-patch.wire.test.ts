import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startCaptureServer, type CaptureServer } from "./capture-server";

const cookieJar = vi.hoisted(() => new Map<string, { value: string }>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
  headers: async () => new Headers({ host: "dashboard.baraqapp.com" }),
}));

let capture: CaptureServer;

beforeAll(async () => {
  capture = await startCaptureServer();
  process.env.BACKEND_API_URL = capture.backendApiUrl;
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("API_BINDING_ENABLED", "true");
});

afterAll(async () => {
  await capture.close();
});

beforeEach(() => {
  capture.requests.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Stands in for Next.js's instrumented `globalThis.fetch`.
 *
 * Next.js replaces the global fetch in a server build to add its cache/dedup
 * layer. That layer inspects the incoming arguments and rebuilds the outgoing
 * request. This reproduces the part that matters: when it is handed a
 * `Request` *object* (rather than `(url, init)`), it reads properties off it
 * and constructs a fresh request to send.
 *
 * A `Request` whose body is a stream cannot survive that: the body is not a
 * copyable value, it is a one-shot ReadableStream, so the rebuilt request goes
 * out empty. A plain string body copies through untouched. This is the exact
 * difference between a route that works under vitest (raw global fetch) and
 * the same route losing its body inside a built Next.js server.
 */
function installNextStyleFetchPatch() {
  const native = globalThis.fetch;
  const patched = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) {
      const rebuilt = new Request(input.url, {
        method: input.method,
        headers: input.headers,
        // Next's layer copies a *value* body forward. A stream body has no
        // value to copy, so nothing is carried over.
        body: typeof init?.body === "string" ? init.body : undefined,
        redirect: input.redirect,
      });
      return native(rebuilt);
    }
    return native(input, init);
  });
  vi.stubGlobal("fetch", patched);
  return patched;
}

describe("JSON auth transport under a Next.js-style fetch patch", () => {
  it("still puts the credentials on the wire when the global fetch rebuilds the request", async () => {
    installNextStyleFetchPatch();
    const { POST } = await import("@/app/api/auth/login/route");
    capture.reply(401, { success: false, code: "authentication_error" });

    const response = await POST(
      new Request("http://127.0.0.1:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "NotARealPassword123!",
        }),
      }),
    );

    expect(capture.requests).toHaveLength(1);
    const upstream = capture.requests[0]!;
    expect(upstream.rawBody.byteLength).toBeGreaterThan(0);
    expect(JSON.parse(upstream.text)).toEqual({
      email: "nobody@example.com",
      password: "NotARealPassword123!",
    });
    expect(response.status).toBe(401);
  });

  it("keeps the refresh token in the refresh body under the same patch", async () => {
    installNextStyleFetchPatch();
    const { refreshAccessToken } = await import("@/lib/auth/server");
    cookieJar.set("baraq_refresh", { value: "opaque-refresh" });
    capture.reply(200, { data: { access: "new-access", refresh: "new-refresh" } });

    await expect(refreshAccessToken()).resolves.toBe("new-access");

    const upstream = capture.requests[0]!;
    expect(upstream.url).toBe("/api/v1/auth/refresh/");
    expect(JSON.parse(upstream.text)).toEqual({ refresh: "opaque-refresh" });
  });
});
