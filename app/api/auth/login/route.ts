import { NextResponse } from "next/server";
import {
  backendJson,
  logBackendFailure,
  logBackendResponseFailure,
} from "@/lib/api/backend-http";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/cookies";
import { cookieOptions } from "@/lib/auth/server";
import { authJson } from "@/lib/auth/response";

function withAuthCookies(
  response: NextResponse,
  access: string,
  refresh: string,
) {
  const csrf = crypto.randomUUID();
  response.cookies.set(ACCESS_COOKIE, access, {
    ...cookieOptions(true),
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE, refresh, {
    ...cookieOptions(true),
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(CSRF_COOKIE, csrf, {
    ...cookieOptions(false),
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authJson(
      { success: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Never issue session cookies without a live backend auth check in production.
  if (!isApiBindingEnabled()) {
    // Outside production only: a local offline session, for dev without a live backend.
    if (process.env.NODE_ENV !== "production") {
      const response = authJson({
        success: true,
        data: { authenticated: true, offline: true },
        message: "Signed in (API binding paused)",
      });
      return withAuthCookies(response, "offline-access", "offline-refresh");
    }
    return authJson(bindingDisabledPayload(), { status: 503 });
  }

  const startedAt = Date.now();
  try {
    const upstream = await backendJson<Record<string, unknown>>("auth/login/", {
      method: "POST",
      data: body,
      headers: requestId ? { "X-Request-ID": requestId } : undefined,
    });
    const payload = (
      upstream.data && typeof upstream.data === "object"
        ? upstream.data
        : { success: false, message: "Authentication failed" }
    ) as Record<string, unknown>;
    if (upstream.status < 200 || upstream.status >= 300) {
      logBackendResponseFailure("auth/login", upstream.status, startedAt, requestId);
      return authJson(payload, { status: upstream.status });
    }

    const root = payload;
    const data = (
      root.data && typeof root.data === "object" ? root.data : root
    ) as Record<string, unknown>;
    const access =
      typeof data.access === "string"
        ? data.access
        : typeof data.access_token === "string"
          ? data.access_token
          : null;
    const refresh =
      typeof data.refresh === "string"
        ? data.refresh
        : typeof data.refresh_token === "string"
          ? data.refresh_token
          : null;
    if (!access || !refresh) {
      console.error("[backend:auth/login] malformed token response", {
        upstreamHost: new URL(
          process.env.BACKEND_API_URL ?? "https://api.baraqapp.com/api/v1",
        ).host,
        status: upstream.status,
        requestId: requestId || undefined,
      });
      return authJson(
        {
          success: false,
          message: "Authentication service response was invalid",
        },
        { status: 502 },
      );
    }

    // Authentication alone is insufficient: students must never receive a
    // dashboard session. Confirm RBAC access before writing auth cookies.
    const adminCheck = await backendJson("admin/me/", {
      headers: {
        Authorization: `Bearer ${access}`,
        ...(requestId ? { "X-Request-ID": requestId } : {}),
      },
    });
    if (adminCheck.status < 200 || adminCheck.status >= 300) {
      logBackendResponseFailure("auth/admin-check", adminCheck.status, startedAt, requestId);
      return authJson(
        {
          success: false,
          message: "هذا الحساب غير مخوّل للوصول إلى لوحة التحكم",
          code: "ADMIN_ACCESS_REQUIRED",
        },
        { status: adminCheck.status === 401 ? 401 : 403 },
      );
    }

    const response = authJson({
      success: true,
      data: { authenticated: true },
      message: "Signed in",
    });
    return withAuthCookies(response, access, refresh);
  } catch (error) {
    const { status, code } = logBackendFailure(
      "auth/login",
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
