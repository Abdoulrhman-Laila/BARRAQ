import { cookies } from "next/headers";
import {
  backendJson,
  logBackendFailure,
  logBackendResponseFailure,
} from "@/lib/api/backend-http";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies, validateMutationCsrf } from "@/lib/auth/server";
import { authJson } from "@/lib/auth/response";

export async function POST(request: Request) {
  if (!(await validateMutationCsrf(request)))
    return authJson(
      { success: false, message: "CSRF validation failed" },
      { status: 403 },
    );
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  const requestId = request.headers.get("x-request-id");
  // Binding paused: clear local cookies only.
  if (refresh && isApiBindingEnabled()) {
    const startedAt = Date.now();
    try {
      const upstream = await backendJson("auth/logout/", {
        method: "POST",
        headers: requestId ? { "X-Request-ID": requestId } : undefined,
        data: { refresh },
      });
      if (upstream.status < 200 || upstream.status >= 300) {
        logBackendResponseFailure("auth/logout", upstream.status, startedAt, requestId);
      }
    } catch (error) {
      // Local logout remains successful, but retain a safe diagnostic so an
      // upstream revocation outage is visible to operators.
      logBackendFailure(
        "auth/logout",
        error,
        startedAt,
        requestId,
      );
    }
  }
  await clearAuthCookies();
  return authJson({ success: true, data: { authenticated: false } });
}
