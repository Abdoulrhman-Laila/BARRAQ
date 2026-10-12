import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The invitation link is the one thing on the invitations page a manager
 * hands to someone else, so a wrong one fails silently and in public: they
 * believe they sent something that works, and the learner finds out first.
 *
 * `buildJoinLink` reads its origin at module load, so each case re-imports
 * the module with the environment it is describing.
 */
async function loadWith(origin: string | undefined) {
  vi.resetModules();
  if (origin === undefined) delete process.env.NEXT_PUBLIC_STUDENT_WEB_URL;
  else process.env.NEXT_PUBLIC_STUDENT_WEB_URL = origin;
  return import("@/lib/api/join-link");
}

const original = process.env.NEXT_PUBLIC_STUDENT_WEB_URL;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_STUDENT_WEB_URL;
  else process.env.NEXT_PUBLIC_STUDENT_WEB_URL = original;
});

describe("invitation join links", () => {
  it("points at the student app, not at the dashboard", async () => {
    const { buildJoinLink } = await loadWith("https://app.baraqapp.com");

    const link = buildJoinLink("tok_123", "ar");

    expect(link).toBe("https://app.baraqapp.com/ar/join?token=tok_123");
  });

  it("uses the reader's locale rather than a hardcoded one", async () => {
    const { buildJoinLink } = await loadWith("https://app.baraqapp.com");

    expect(buildJoinLink("tok_123", "en")).toContain("/en/join");
    expect(buildJoinLink("tok_123", "ar")).toContain("/ar/join");
  });

  it("escapes the token instead of concatenating it", async () => {
    const { buildJoinLink } = await loadWith("https://app.baraqapp.com");

    const link = buildJoinLink("a b&c=d", "ar");

    // A token is a credential; hand-built query strings are how one ends up
    // truncated at the first & and silently useless.
    expect(link).toContain("token=a+b%26c%3Dd");
    expect(new URL(link as string).searchParams.get("token")).toBe("a b&c=d");
  });

  it("offers no link at all when the student origin is not configured", async () => {
    const { buildJoinLink, studentWebConfigured } = await loadWith(undefined);

    // The code still works. A link quietly pointing at the wrong host does
    // not, and looks like it does.
    expect(buildJoinLink("tok_123", "ar")).toBeNull();
    expect(studentWebConfigured).toBe(false);
  });

  it("offers no link when the configured origin is unusable", async () => {
    const { buildJoinLink } = await loadWith("not a url");

    expect(buildJoinLink("tok_123", "ar")).toBeNull();
  });

  it("offers no link without a token", async () => {
    const { buildJoinLink } = await loadWith("https://app.baraqapp.com");

    expect(buildJoinLink("", "ar")).toBeNull();
  });
});
