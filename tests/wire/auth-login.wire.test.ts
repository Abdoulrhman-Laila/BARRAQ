import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startCaptureServer, type CaptureServer } from "./capture-server";

let capture: CaptureServer;

beforeAll(async () => {
  capture = await startCaptureServer();
  // backend-http.ts reads BACKEND_API_URL at module load, so this must be set
  // before the route (and its transport) is ever imported.
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

function loginRequest(body: unknown) {
  return new Request("http://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Request-ID": "wire-test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login — what actually reaches the socket", () => {
  it("puts the submitted credentials on the wire as a JSON body", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    capture.reply(401, {
      success: false,
      message: "Invalid credentials",
      code: "authentication_error",
    });

    const response = await POST(
      loginRequest({ email: "nobody@example.com", password: "NotARealPassword123!" }),
    );

    expect(capture.requests).toHaveLength(1);
    const upstream = capture.requests[0]!;

    // The exact failure this test exists for: a POST arriving with an empty
    // body, which Django answers with "this field is required" for both
    // fields — indistinguishable from the user submitting an empty form.
    expect(upstream.rawBody.byteLength).toBeGreaterThan(0);
    expect(JSON.parse(upstream.text)).toEqual({
      email: "nobody@example.com",
      password: "NotARealPassword123!",
    });

    expect(upstream.method).toBe("POST");
    expect(upstream.url).toBe("/api/v1/auth/login/");
    expect(String(upstream.headers["content-type"])).toContain("application/json");
    expect(Number(upstream.headers["content-length"])).toBe(upstream.rawBody.byteLength);
    expect(upstream.headers["x-forwarded-proto"]).toBe("https");
    expect(upstream.headers["x-request-id"]).toBe("wire-test");

    // Django's real verdict must survive, not collapse into a 400.
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "authentication_error" });
  });

  it("sends the admin RBAC check as a bodiless GET with the bearer token", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    capture.reply(200, { data: { access: "access-token", refresh: "refresh-token" } });
    capture.reply(200, { data: { id: 1, is_superuser: true } });

    const response = await POST(
      loginRequest({ email: "admin@example.com", password: "AlsoNotReal123!" }),
    );

    expect(capture.requests).toHaveLength(2);
    const [login, adminCheck] = capture.requests;

    expect(JSON.parse(login!.text)).toMatchObject({ email: "admin@example.com" });
    expect(adminCheck!.method).toBe("GET");
    expect(adminCheck!.url).toBe("/api/v1/admin/me/");
    expect(adminCheck!.rawBody.byteLength).toBe(0);
    expect(adminCheck!.headers.authorization).toBe("Bearer access-token");

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join("\n")).toContain("baraq_access=access-token");
  });
});

describe("other auth routes — bodies on the wire", () => {
  it("forwards the password-reset email", async () => {
    const { POST } = await import("@/app/api/auth/password-reset/route");
    capture.reply(200, { success: true, message: "sent" });

    await POST(
      new Request("http://127.0.0.1:3000/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "Admin@Example.COM" }),
      }),
    );

    const upstream = capture.requests[0]!;
    expect(upstream.url).toBe("/api/v1/auth/password-reset/");
    expect(JSON.parse(upstream.text)).toEqual({ email: "admin@example.com" });
  });

  it("forwards the password-reset confirmation", async () => {
    const { POST } = await import("@/app/api/auth/password-reset/confirm/route");
    capture.reply(200, { success: true });

    await POST(
      new Request("http://127.0.0.1:3000/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: "MQ",
          token: "reset-token",
          new_password: "BrandNewPassword123!",
        }),
      }),
    );

    const upstream = capture.requests[0]!;
    expect(upstream.url).toBe("/api/v1/auth/password-reset/confirm/");
    expect(JSON.parse(upstream.text)).toEqual({
      uid: "MQ",
      token: "reset-token",
      new_password: "BrandNewPassword123!",
    });
  });
});
