import type { Locale } from "@/types/api";

/**
 * Where the student application lives.
 *
 * The dashboard and the student app are separate origins in every
 * environment, so an invitation link cannot be built from the dashboard's
 * own `window.location.origin` -- that produces a URL pointing at a join
 * page the dashboard does not serve. It has to be configured.
 */
const STUDENT_WEB_URL = process.env.NEXT_PUBLIC_STUDENT_WEB_URL?.trim();

/**
 * The join URL a learner should receive, or null when we cannot build one.
 *
 * Returning null rather than guessing is the point. A copied link that
 * silently points at the wrong host is worse than no link at all: the
 * manager believes they have sent something that works, and the learner is
 * the one who finds out otherwise. The invitation code is always available
 * and always works, so there is a correct path forward either way.
 */
export function buildJoinLink(token: string, locale: Locale): string | null {
  if (!STUDENT_WEB_URL || !token) return null;

  try {
    // `new URL` both validates the configured origin and escapes the token,
    // which is a credential and has no business being concatenated by hand.
    const url = new URL(`/${locale}/join`, STUDENT_WEB_URL);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    // A misconfigured origin is a deployment problem, not a reason to hand
    // the operator a broken link.
    return null;
  }
}

export const studentWebConfigured = Boolean(STUDENT_WEB_URL);
