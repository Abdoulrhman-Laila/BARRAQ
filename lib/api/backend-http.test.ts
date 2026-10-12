import { describe, expect, it } from "vitest";
import {
  BackendResponseError,
  classifyBackendError,
  getBackendUrl,
} from "@/lib/api/backend-http";

describe("getBackendUrl", () => {
  it("normalizes slashes and adds exactly one Django trailing slash", () => {
    expect(getBackendUrl("///auth/login///")).toBe(
      "https://api.baraqapp.com/api/v1/auth/login/",
    );
    expect(getBackendUrl("admin/me")).toBe(
      "https://api.baraqapp.com/api/v1/admin/me/",
    );
  });

  it("preserves an encoded query without re-encoding it", () => {
    expect(
      getBackendUrl("subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2"),
    ).toBe(
      "https://api.baraqapp.com/api/v1/subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2",
    );
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/../admin",
    "/%2e%2e/admin",
    "/safe%2fescape",
    "/safe\\escape",
    "/path#fragment",
    "/bad%encoding",
  ])("rejects unsafe or externally-routable path %s", (path) => {
    expect(() => getBackendUrl(path)).toThrow("Invalid backend path");
  });

  it("classifies the nested cause chain native fetch actually throws", () => {
    // Node's fetch surfaces every transport failure as `TypeError: fetch
    // failed` and hides the real code one or two levels down, sometimes
    // inside an AggregateError when several addresses were tried.
    const refused = Object.assign(new TypeError("fetch failed"), {
      cause: new AggregateError([
        Object.assign(new Error("connect refused"), { code: "ECONNREFUSED" }),
      ]),
    });
    expect(classifyBackendError(refused)).toEqual({
      status: 502,
      code: "upstream_unreachable",
    });

    const dns = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }),
    });
    expect(classifyBackendError(dns)).toEqual({
      status: 502,
      code: "upstream_dns_error",
    });

    // A transport failure whose code we don't recognize is still a transport
    // failure, never a 503 "unknown".
    expect(classifyBackendError(new TypeError("fetch failed"))).toEqual({
      status: 502,
      code: "upstream_unreachable",
    });

    expect(
      classifyBackendError(new DOMException("timed out", "TimeoutError")),
    ).toEqual({ status: 504, code: "upstream_timeout" });

    expect(classifyBackendError(new BackendResponseError(503))).toEqual({
      status: 503,
      code: "upstream_response_error",
    });
  });
});
