import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
  clearAuthCookies: vi.fn(),
  logBackendFailure: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "baraq_refresh" ? { value: "opaque-refresh-token" } : undefined,
  })),
}));

vi.mock("@/lib/api/binding", () => ({ isApiBindingEnabled: () => true }));

vi.mock("@/lib/auth/server", () => ({
  clearAuthCookies: mocks.clearAuthCookies,
  refreshAccessToken: mocks.refreshAccessToken,
}));

vi.mock("@/lib/api/backend-http", () => ({
  backendJson: vi.fn(),
  logBackendFailure: mocks.logBackendFailure,
}));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("classifies a refresh transport failure instead of leaking an unhandled 500", async () => {
    mocks.refreshAccessToken.mockRejectedValueOnce(new Error("connect failed"));
    mocks.logBackendFailure.mockReturnValueOnce({
      status: 502,
      code: "upstream_unreachable",
    });

    const response = await GET(
      new Request("https://dashboard.baraqapp.com/api/auth/session", {
        headers: { "X-Request-ID": "session-test-request" },
      }),
    );
    const body = (await response.json()) as {
      success: boolean;
      code: string;
    };

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toMatchObject({
      success: false,
      code: "upstream_unreachable",
    });
    expect(mocks.logBackendFailure).toHaveBeenCalledWith(
      "auth/session",
      expect.any(Error),
      expect.any(Number),
      "session-test-request",
    );
  });
});
