import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  backendJson: vi.fn(),
  clearAuthCookies: vi.fn(),
  validateMutationCsrf: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === "baraq_refresh" ? { value: "opaque-refresh" } : undefined),
  })),
}));
vi.mock("@/lib/api/binding", () => ({ isApiBindingEnabled: () => true }));
vi.mock("@/lib/auth/server", () => ({
  clearAuthCookies: mocks.clearAuthCookies,
  validateMutationCsrf: mocks.validateMutationCsrf,
}));
vi.mock("@/lib/api/backend-http", () => ({
  backendJson: mocks.backendJson,
  logBackendFailure: vi.fn(),
  logBackendResponseFailure: vi.fn(),
}));

import { POST } from "./route";

describe("Dashboard logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateMutationCsrf.mockResolvedValue(true);
    mocks.backendJson.mockResolvedValue({ status: 200, data: { success: true } });
  });

  it("revokes the refresh token upstream and always clears local cookies", async () => {
    const response = await POST(
      new Request("https://dashboard.baraqapp.com/api/auth/logout", { method: "POST" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.backendJson).toHaveBeenCalledWith("auth/logout/", {
      method: "POST",
      headers: undefined,
      data: { refresh: "opaque-refresh" },
    });
    expect(mocks.clearAuthCookies).toHaveBeenCalledOnce();
  });
});
