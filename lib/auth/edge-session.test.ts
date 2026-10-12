import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api/binding", () => ({ isApiBindingEnabled: () => true }));

import { resolveEdgeSession } from "./edge-session";

function requestWithCookies(cookies: Record<string, string>): NextRequest {
  const request = new NextRequest("https://dashboard.baraqapp.com/ar/users");
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

describe("resolveEdgeSession", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_API_URL", "http://backend:8000/api/v1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports no session at all when neither cookie is present", async () => {
    const session = await resolveEdgeSession(requestWithCookies({}));
    expect(session).toEqual({ authenticated: false, reason: "anonymous" });
  });

  it("authenticates when the backend confirms admin access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ data: { id: 1 } })),
    );

    const session = await resolveEdgeSession(
      requestWithCookies({ baraq_access: "live-access" }),
    );
    expect(session.authenticated).toBe(true);
  });

  it("rejects the session when Django actively denies admin access", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ detail: "Forbidden" }, { status: 403 })),
    );

    const session = await resolveEdgeSession(
      requestWithCookies({ baraq_access: "student-access" }),
    );
    expect(session).toEqual({ authenticated: false, reason: "rejected" });
  });

  it("treats a transport outage as indeterminate, not as invalid credentials", async () => {
    // Django is momentarily unreachable (restart, deploy, network blip). The
    // admin's refresh token is still perfectly valid; the middleware must not
    // be told to throw it away.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    );

    const session = await resolveEdgeSession(
      requestWithCookies({
        baraq_access: "live-access",
        baraq_refresh: "live-refresh",
      }),
    );
    expect(session).toEqual({ authenticated: false, reason: "unreachable" });
  });

  it("treats an upstream 5xx during refresh as indeterminate too", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        // admin/me with the stale access token
        .mockResolvedValueOnce(new Response(null, { status: 502 }))
        // auth/refresh/
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    );

    const session = await resolveEdgeSession(
      requestWithCookies({
        baraq_access: "stale-access",
        baraq_refresh: "live-refresh",
      }),
    );
    expect(session).toEqual({ authenticated: false, reason: "unreachable" });
  });

  it("still rejects when refresh is genuinely invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(new Response(null, { status: 401 })),
    );

    const session = await resolveEdgeSession(
      requestWithCookies({
        baraq_access: "expired-access",
        baraq_refresh: "revoked-refresh",
      }),
    );
    expect(session).toEqual({ authenticated: false, reason: "rejected" });
  });

  it("never forwards the access or refresh token anywhere but the Authorization header / refresh body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { id: 1 } }));
    vi.stubGlobal("fetch", fetchMock);

    await resolveEdgeSession(requestWithCookies({ baraq_access: "live-access" }));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://backend:8000/api/v1/admin/me/");
    expect(url).not.toContain("live-access");
    expect(init.redirect).toBe("manual");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer live-access",
    );
  });
});

describe("middleware session-cookie handling", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function runMiddleware(reason: "rejected" | "unreachable" | "anonymous") {
    vi.resetModules();
    vi.doMock("@/lib/auth/edge-session", async () => {
      const actual = await vi.importActual<typeof import("./edge-session")>(
        "./edge-session",
      );
      return {
        ...actual,
        resolveEdgeSession: vi.fn(async () => ({
          authenticated: false as const,
          reason,
        })),
      };
    });
    const { middleware } = await import("@/middleware");
    return (await middleware(
      new NextRequest("https://dashboard.baraqapp.com/ar/users", {
        headers: { cookie: "baraq_access=a; baraq_refresh=r" },
      }),
    )) as NextResponse;
  }

  it("clears auth cookies when the backend actively rejected the session", async () => {
    const response = await runMiddleware("rejected");
    const setCookie = response.headers.getSetCookie().join("\n");

    expect(response.status).toBe(307);
    expect(setCookie).toContain("baraq_refresh=;");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("keeps auth cookies intact when the backend was merely unreachable", async () => {
    const response = await runMiddleware("unreachable");
    const setCookie = response.headers.getSetCookie().join("\n");

    // Still fails closed on page access...
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/ar/login");
    // ...but a transient Django outage must not sign every admin out.
    expect(setCookie).not.toContain("baraq_refresh=;");
    expect(setCookie).not.toContain("baraq_access=;");
  });
});
