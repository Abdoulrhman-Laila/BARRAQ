export const ACCESS_COOKIE = "baraq_access";
export const REFRESH_COOKIE = "baraq_refresh";
export const CSRF_COOKIE = "baraq_csrf";
export const LOCALE_COOKIE = "baraq_locale";
export const THEME_COOKIE = "baraq_theme";

// Keep browser-cookie expiry aligned with Django SimpleJWT defaults in
// config/settings.py. The token remains the source of truth; these limits
// only prevent stale cookies from lingering longer than the token itself.
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 30;
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

/** Set by middleware so the root layout can render <html dir> server-side. */
export const LOCALE_HEADER = "x-baraq-locale";
