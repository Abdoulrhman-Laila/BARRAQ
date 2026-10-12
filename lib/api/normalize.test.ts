import { describe, expect, it } from "vitest";
import { getErrorMessage, normalizeEnvelope, normalizeList } from "./normalize";

describe("normalizeEnvelope", () => {
  it("passes through a payload that already looks like an envelope", () => {
    const payload = { success: true, data: { id: 1 }, meta: { total: 1 }, error: null };
    expect(normalizeEnvelope(payload)).toBe(payload);
  });

  it("wraps a bare payload (e.g. an offline stub without success/data) into an envelope", () => {
    const bare = { id: 1, name: "x" };
    expect(normalizeEnvelope(bare)).toEqual({ success: true, data: bare, meta: {}, error: null });
  });

  it("wraps primitives and null the same way", () => {
    expect(normalizeEnvelope(null)).toEqual({ success: true, data: null, meta: {}, error: null });
    expect(normalizeEnvelope(42)).toEqual({ success: true, data: 42, meta: {}, error: null });
  });

  it("does not treat an object with only 'success' (no 'data') as an envelope", () => {
    // Both keys are required by the real backend envelope shape -- a partial
    // match here would silently swallow a malformed real envelope instead of
    // surfacing it as unnormalized data.
    const partial = { success: true };
    expect(normalizeEnvelope(partial)).toEqual({ success: true, data: partial, meta: {}, error: null });
  });
});

describe("normalizeList", () => {
  it("wraps a bare array (offline stub shape) into a Paginated object", () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(normalizeList(items)).toEqual({ count: 2, next: null, previous: null, results: items });
  });

  it("passes through an already-paginated payload unchanged", () => {
    const page = { count: 5, next: "http://x/?page=2", previous: null, results: [{ id: 1 }] };
    expect(normalizeList(page)).toBe(page);
  });

  it("wraps an empty array as an empty page, not as a falsy passthrough", () => {
    expect(normalizeList([])).toEqual({ count: 0, next: null, previous: null, results: [] });
  });
});

describe("getErrorMessage", () => {
  it("falls back for non-object payloads", () => {
    expect(getErrorMessage(null)).toBe("تعذر تنفيذ الطلب");
    expect(getErrorMessage("plain string")).toBe("تعذر تنفيذ الطلب");
    expect(getErrorMessage(undefined, "custom fallback")).toBe("custom fallback");
  });

  it("prefers a top-level message field", () => {
    expect(getErrorMessage({ message: "top level" })).toBe("top level");
  });

  it("falls back to a nested error.message when there is no top-level message", () => {
    expect(getErrorMessage({ error: { message: "nested" } })).toBe("nested");
  });

  it("falls back to a DRF-style 'detail' field when there is no message anywhere", () => {
    expect(getErrorMessage({ detail: "درف التفصيل" })).toBe("درف التفصيل");
  });

  it("prefers message over error.message over detail, in that priority order", () => {
    expect(getErrorMessage({ message: "m", error: { message: "e" }, detail: "d" })).toBe("m");
    expect(getErrorMessage({ error: { message: "e" }, detail: "d" })).toBe("e");
  });

  it("uses the fallback when none of the known error shapes match", () => {
    expect(getErrorMessage({ unexpected: true })).toBe("تعذر تنفيذ الطلب");
  });

  it("surfaces the first backend field validation message", () => {
    expect(getErrorMessage({ errors: { email: ["البريد مستخدم مسبقاً"] } })).toBe("البريد مستخدم مسبقاً");
  });
});
