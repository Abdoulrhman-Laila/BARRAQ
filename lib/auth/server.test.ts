import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  backendJson: vi.fn(),
  getCookie: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.getCookie, set: mocks.setCookie })),
  headers: vi.fn(async () => new Headers({ host: "dashboard.baraqapp.com" })),
}));
vi.mock("@/lib/api/binding", () => ({ isApiBindingEnabled: () => true }));
vi.mock("@/lib/api/backend-http", () => ({
  BackendResponseError: class BackendResponseError extends Error {
    constructor(public readonly upstreamStatus: number) {
      super(`status ${upstreamStatus}`);
    }
  },
  backendJson: mocks.backendJson,
}));

import { refreshAccessToken } from "./server";

describe("Dashboard refresh transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCookie.mockImplementation((name: string) =>
      name === "baraq_refresh" ? { value: "opaque-refresh" } : undefined,
    );
  });

  it("forwards the refresh token as JSON and rotates secure cookies", async () => {
    mocks.backendJson.mockResolvedValue({
      status: 200,
      data: { data: { access: "new-access", refresh: "new-refresh" } },
    });

    await expect(refreshAccessToken()).resolves.toBe("new-access");
    expect(mocks.backendJson).toHaveBeenCalledWith("auth/refresh/", {
      method: "POST",
      data: { refresh: "opaque-refresh" },
    });
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "baraq_access",
      "new-access",
      expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
    );
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "baraq_refresh",
      "new-refresh",
      expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
    );
  });
});
