import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * The dictionary is typed as `Record<keyof typeof ar, string>`, so a
 * *missing* key is already a compile error. What the type cannot see is a
 * key that was copied across untranslated -- which is how every section
 * heading on the Super Admin overview came to read "SYSTEM HEALTH" in
 * Latin capitals above an Arabic page.
 *
 * "Identical in both locales" is not always wrong: "AI", a product name,
 * or a symbol can legitimately match. So this checks the narrower thing it
 * can be sure about -- Arabic copy that contains no Arabic at all.
 */
const ar = getDictionary("ar") as Record<string, string>;
const en = getDictionary("en") as Record<string, string>;

/** Strings that are the same in both languages on purpose. */
const SHARED_BY_DESIGN = new Set([
  "brandName",
  "appName",
  "yes",
  "no",
]);

const ARABIC = /\p{Script=Arabic}/u;
const LATIN_WORD = /[A-Za-z]{2,}/;

describe("dictionary parity", () => {
  it("exposes the same keys in both locales", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty strings", () => {
    const empty = Object.keys(ar).filter((key) => !ar[key]?.trim() || !en[key]?.trim());
    expect(empty).toEqual([]);
  });

  it("does not leave Latin-only text in the Arabic dictionary", () => {
    // The specific regression: eyebrow labels sat in the Arabic dictionary
    // with their English values, so they read as Latin capitals above
    // Arabic headings and were announced in English by a screen reader.
    const untranslated = Object.keys(ar).filter((key) => {
      if (SHARED_BY_DESIGN.has(key)) return false;
      const value = ar[key] ?? "";
      return LATIN_WORD.test(value) && !ARABIC.test(value);
    });

    expect(untranslated).toEqual([]);
  });
});
