import { describe, expect, it } from "vitest";
import { nativeTextValue } from "./native-form";

describe("nativeTextValue", () => {
  it("prefers the value visibly present in the submitted native form over stale React state", () => {
    const form = new FormData();
    form.set("email", "visible.admin@example.com");
    form.set("password", "VisiblePassword123!");

    expect(nativeTextValue(form, "email", "")).toBe("visible.admin@example.com");
    expect(nativeTextValue(form, "password", "")).toBe("VisiblePassword123!");
  });

  it("uses controlled state only when the native field is absent", () => {
    expect(nativeTextValue(new FormData(), "email", "state@example.com")).toBe(
      "state@example.com",
    );
  });
});
