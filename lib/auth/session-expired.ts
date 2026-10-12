"use client";

import { ApiError } from "@/lib/api/normalize";

const PUBLIC_AUTH_RE = /^\/(ar|en)\/(login|forgot-password|reset-password)(\/|$)/;

let redirecting = false;

/** True when the browser API client received an unauthenticated (session) response. */
export function isUnauthorizedError(reason: unknown): boolean {
  return reason instanceof ApiError && reason.status === 401;
}

/**
 * Single client entry for expired/invalid session UX.
 * Hard-navigates to login once; middleware remains the page-level gate.
 * Does not clear cookies (BFF / session routes / middleware already do).
 */
export function beginSessionExpiredRedirect(): void {
  if (typeof window === "undefined") return;
  if (redirecting) return;

  const { pathname, search } = window.location;
  if (PUBLIC_AUTH_RE.test(pathname)) return;

  redirecting = true;
  const locale = pathname.startsWith("/en") ? "en" : "ar";
  const next = `${pathname}${search}`;
  const params = new URLSearchParams();
  if (next.startsWith(`/${locale}`)) params.set("next", next);
  const query = params.toString();
  window.location.replace(`/${locale}/login${query ? `?${query}` : ""}`);
}
