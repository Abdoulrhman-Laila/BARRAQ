import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  backendRequest: vi.fn(),
  clearAuthCookies: vi.fn(),
  refreshAccessToken: vi.fn(),
  validateMutationCsrf: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "baraq_access" ? { value: "opaque-access-token" } : undefined,
  })),
}));

vi.mock("@/lib/api/binding", () => ({ isApiBindingEnabled: () => true }));
vi.mock("@/lib/auth/server", () => ({
  clearAuthCookies: mocks.clearAuthCookies,
  refreshAccessToken: mocks.refreshAccessToken,
  validateMutationCsrf: mocks.validateMutationCsrf,
}));
vi.mock("@/lib/api/backend-http", () => ({
  backendRequest: mocks.backendRequest,
  getBackendUrl: (path: string) => {
    if (path.includes("https:") || path.includes("..")) throw new Error("Invalid backend path");
    return `http://backend:8000/api/v1/${path}`;
  },
  logBackendFailure: vi.fn(() => ({ status: 502, code: "upstream_error" })),
}));

import { GET, PATCH, POST, PUT } from "./route";

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe("Dashboard generic BFF transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateMutationCsrf.mockResolvedValue(true);
    mocks.backendRequest.mockResolvedValue({
      status: 200,
      data: new TextEncoder().encode('{"success":true}').buffer,
      headers: { "content-type": "application/json" },
    });
  });

  it.each([
    ["POST", POST],
    ["PUT", PUT],
    ["PATCH", PATCH],
  ] as const)("preserves the exact JSON body and Content-Type for %s", async (method, handler) => {
    const payload = { title: "قيمة اختبار", enabled: true };
    const request = new NextRequest("https://dashboard.baraqapp.com/api/bff/admin/subjects", {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": "csrf" },
      body: JSON.stringify(payload),
    });

    const response = await handler(request, context(["admin", "subjects"]));
    const [targetPath, init] = mocks.backendRequest.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: ArrayBuffer },
    ];

    expect(response.status).toBe(200);
    expect(targetPath).toBe("admin/subjects/");
    expect(init.method).toBe(method);
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(new TextDecoder().decode(init.body))).toEqual(payload);
  });

  it("preserves multipart boundaries and bytes without rebuilding FormData", async () => {
    const form = new FormData();
    form.set("title", "ملف");
    form.set("file", new File(["source-content"], "lesson.txt", { type: "text/plain" }));
    const request = new NextRequest("https://dashboard.baraqapp.com/api/bff/admin/sources", {
      method: "POST",
      body: form,
    });

    await POST(request, context(["admin", "sources"]));
    const [, init] = mocks.backendRequest.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: ArrayBuffer },
    ];
    const contentType = init.headers["Content-Type"];
    const raw = new TextDecoder().decode(init.body);

    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(raw).toContain("lesson.txt");
    expect(raw).toContain("source-content");
  });

  it.each([
    "https://dashboard.baraqapp.com/api/bff/admin/subjects",
    "https://dashboard.baraqapp.com/api/bff/admin/subjects/",
  ])("canonicalizes slash/no-slash browser paths without redirecting: %s", async (url) => {
    const response = await GET(new NextRequest(url), context(["admin", "subjects"]));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.backendRequest).toHaveBeenCalledWith(
      "admin/subjects/",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects an externally-routable path before any upstream request", async () => {
    const response = await GET(
      new NextRequest("https://dashboard.baraqapp.com/api/bff/https:/evil.example/path"),
      context(["https:", "evil.example", "path"]),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.backendRequest).not.toHaveBeenCalled();
  });
});
