import { cookies } from "next/headers";
import {
  backendJson,
  logBackendFailure,
  logBackendResponseFailure,
} from "@/lib/api/backend-http";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies, refreshAccessToken } from "@/lib/auth/server";
import { authJson } from "@/lib/auth/response";

export async function POST(request: Request) {
  let bodyToken: string | null = null;
  try {
    const body = await request.json().catch(() => null);
    if (
      body &&
      typeof body === "object" &&
      typeof (body as Record<string, unknown>).token === "string"
    ) {
      bodyToken = String((body as Record<string, unknown>).token);
    }
  } catch {
    bodyToken = null;
  }

  if (!isApiBindingEnabled()) {
    await clearAuthCookies();
    return authJson(bindingDisabledPayload(), { status: 503 });
  }

  const store = await cookies();
  let token = bodyToken ?? store.get(ACCESS_COOKIE)?.value ?? null;
  if (!token) token = await refreshAccessToken();
  if (!token) {
    await clearAuthCookies();
    return authJson(
      {
        success: false,
        message: "Authentication required",
        code: "UNAUTHENTICATED",
      },
      { status: 401 },
    );
  }

  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id");
  const correlationHeaders = requestId ? { "X-Request-ID": requestId } : undefined;
  try {
    const upstream = await backendJson("auth/verify/", {
      method: "POST",
      headers: correlationHeaders,
      data: { token },
    });

    if (upstream.status === 401) {
      const renewed = await refreshAccessToken();
      if (renewed) {
        const retry = await backendJson("auth/verify/", {
          method: "POST",
          headers: correlationHeaders,
          data: { token: renewed },
        });
        if (retry.status < 200 || retry.status >= 300) {
          logBackendResponseFailure("auth/verify-retry", retry.status, startedAt, requestId);
          await clearAuthCookies();
          return authJson(
            {
              success: false,
              message: "Token invalid",
              code: "authentication_error",
            },
            { status: 401 },
          );
        }
        return authJson({
          success: true,
          data: { valid: true },
          message: "Token verified",
        });
      }
      await clearAuthCookies();
      return authJson(
        {
          success: false,
          message: "Token invalid",
          code: "authentication_error",
        },
        { status: 401 },
      );
    }

    if (upstream.status < 200 || upstream.status >= 300) {
      logBackendResponseFailure("auth/verify", upstream.status, startedAt, requestId);
      const payload =
        upstream.data && typeof upstream.data === "object"
          ? upstream.data
          : { success: false, message: "Token verification failed" };
      return authJson(payload, { status: upstream.status });
    }

    return authJson({
      success: true,
      data: { valid: true },
      message: "Token verified",
    });
  } catch (error) {
    const { status, code } = logBackendFailure(
      "auth/verify",
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
