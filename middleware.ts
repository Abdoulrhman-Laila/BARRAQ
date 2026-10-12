import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_HEADER } from "@/lib/auth/cookies";
import { clearAuthCookiesOn, resolveEdgeSession } from "@/lib/auth/edge-session";

const locales = ["ar", "en"] as const;

function withLocaleCookie(response: NextResponse, locale: "ar" | "en") {
  response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const segment = pathname.split("/")[1];
  if (!locales.includes(segment as (typeof locales)[number])) {
    const locale = request.cookies.get(LOCALE_COOKIE)?.value === "en" ? "en" : "ar";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = segment as "ar" | "en";
  const publicAuthPaths = new Set([
    `/${locale}/login`,
    `/${locale}/forgot-password`,
    `/${locale}/reset-password`
  ]);
  const isPublicAuth = publicAuthPaths.has(pathname);
  const session = await resolveEdgeSession(request);

  // Every denial fails closed on page access. Only a denial Django actually
  // issued justifies destroying the cookies: when the backend simply could
  // not be reached, the admin's refresh token is probably still valid, and
  // wiping it would turn a momentary outage into a forced re-login for
  // everyone. See lib/auth/edge-session.ts::EdgeSessionDenialReason.
  const mayClearCookies = !session.authenticated && session.reason !== "unreachable";

  if (!session.authenticated && !isPublicAuth) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    if (mayClearCookies) clearAuthCookiesOn(response);
    return response;
  }

  if (session.authenticated && pathname === `/${locale}/login`) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    const response = NextResponse.redirect(url);
    session.attach?.(response);
    return withLocaleCookie(response, locale);
  }

  // The root layout sits above [locale] and cannot read the route segment,
  // so the locale is forwarded as a request header. Without it <html> has
  // no dir and the whole document lays out left-to-right -- Arabic text
  // still reads correctly because of bidi, but every logical property
  // resolves the wrong way round, which is why the sidebar was being
  // placed by margin-inline-start as if this were an English page.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (session.authenticated) {
    session.attach?.(response);
  } else if (mayClearCookies) {
    // Public auth pages: drop forged / stale auth cookies.
    clearAuthCookiesOn(response);
  }
  return withLocaleCookie(response, locale);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
