import { cookies } from "next/headers";
import { backendJson, logBackendFailure } from "@/lib/api/backend-http";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies, refreshAccessToken } from "@/lib/auth/server";
import { authJson } from "@/lib/auth/response";

export async function GET(request: Request) {
  const store = await cookies();
  let access = store.get(ACCESS_COOKIE)?.value ?? null;
  const hasRefresh = Boolean(store.get(REFRESH_COOKIE)?.value);
  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id");

  if (!access && !hasRefresh) {
    return authJson({
      success: true,
      data: { authenticated: false, verified: false },
    });
  }

  // Binding disabled: never treat cookie presence as a verified session.
  if (!isApiBindingEnabled()) {
    await clearAuthCookies();
    return authJson({
      success: true,
      data: { authenticated: false, verified: false, binding_disabled: true },
    });
  }

  try {
    // Refresh is an upstream network call too. Keep it inside the same
    // classified error boundary as the admin verification so a DNS/timeout/
    // TLS failure cannot escape as an unhandled 500 when only a refresh
    // cookie remains.
    if (!access) access = await refreshAccessToken();
    if (!access) {
      await clearAuthCookies();
      return authJson({
        success: true,
        data: { authenticated: false, verified: false },
      });
    }

    const correlationHeaders = requestId ? { "X-Request-ID": requestId } : {};
    let upstream = await backendJson("admin/me/", {
      headers: { Authorization: `Bearer ${access}`, ...correlationHeaders },
    });

    if (upstream.status === 401) {
      const renewed = await refreshAccessToken();
      if (renewed) {
        upstream = await backendJson("admin/me/", {
          headers: { Authorization: `Bearer ${renewed}`, ...correlationHeaders },
        });
      }
    }

    if (upstream.status === 401 || upstream.status === 403) {
      await clearAuthCookies();
      return authJson({
        success: true,
        data: { authenticated: false, verified: false },
      });
    }
    if (upstream.status < 200 || upstream.status >= 300) {
      console.error("[backend:auth/session] upstream response failed", {
        status: upstream.status,
        requestId: requestId || undefined,
      });
      return authJson(
        {
          success: false,
          message: "Authentication service is temporarily unavailable",
          code: "upstream_error",
        },
        { status: 502 },
      );
    }

    return authJson({
      success: true,
      data: { authenticated: true, verified: true },
    });
  } catch (error) {
    const { status, code } = logBackendFailure(
      "auth/session",
      error,
      startedAt,
      requestId,
    );
    return authJson(
      {
        success: false,
        message: "Authentication service is temporarily unavailable",
        code,
      },
      { status },
    );
  }
}
