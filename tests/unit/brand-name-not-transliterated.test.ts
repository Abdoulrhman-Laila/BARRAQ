import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Regression guard: the brand name must never be transliterated to Latin
 * script, even in English-locale copy. Found live in this pass: five
 * English entries spelled the brand as "Baraq" (appName, brandName,
 * loginEyebrow, footerBrand, adminFallback) while every one of their
 * Arabic counterparts already correctly used "برّاق" -- one of them
 * ("Baraq Control Center") was rendered directly in the login page's
 * visible logo/eyebrow text, not just metadata. The product name is برّاق
 * regardless of interface locale, the same convention the base document
 * title now also follows (see app/layout.tsx).
 *
 * `dictionary-parity.test.ts` already guards against copy that was left
 * *identical* across both locales; it would not have caught this, since
 * these strings were genuinely translated -- just with the brand name
 * itself mistranslated inside them. Scans every English dictionary value
 * rather than pinning the five locations found this time, so a new
 * English string introduced later that spells out "Baraq" fails here
 * immediately instead of shipping quietly.
 */

const en = getDictionary("en") as Record<string, string>;

const LATIN_BRAND_NAME = /\bBaraq\b/;

describe("the brand name برّاق is never spelled out in Latin script", () => {
  it("no English dictionary entry says \"Baraq\" instead of \"برّاق\"", () => {
    const offenders = Object.entries(en)
      .filter(([, value]) => typeof value === "string" && LATIN_BRAND_NAME.test(value))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);

    expect(offenders).toEqual([]);
  });
});
