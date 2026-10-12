import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ backendJson: vi.fn() }));

vi.mock("@/lib/api/binding", () => ({ isApiBindingEnabled: () => true }));
vi.mock("@/lib/api/backend-http", () => ({
  backendJson: mocks.backendJson,
  logBackendFailure: vi.fn(),
  logBackendResponseFailure: vi.fn(),
}));

import { POST as requestReset } from "./route";
import { POST as confirmReset } from "./confirm/route";

describe("Dashboard password-reset proxy bodies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.backendJson.mockResolvedValue({
      status: 200,
      data: { success: true },
      headers: {},
    });
  });

  it("forwards the normalized email JSON body to the canonical reset route", async () => {
    const response = await requestReset(
      new Request("https://dashboard.baraqapp.com/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: " Admin@Example.COM " }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.backendJson).toHaveBeenCalledWith(
      "auth/password-reset/",
      expect.objectContaining({ method: "POST", data: { email: "admin@example.com" } }),
    );
  });

  it("forwards uid, token and the exact password to the canonical confirm route", async () => {
    const body = { uid: "uid-123", token: "token-456", new_password: "Exact Password 123!" };
    const response = await confirmReset(
      new Request("https://dashboard.baraqapp.com/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.backendJson).toHaveBeenCalledWith(
      "auth/password-reset/confirm/",
      expect.objectContaining({ method: "POST", data: body }),
    );
  });
});
