import {
  backendJson,
  logBackendFailure,
  logBackendResponseFailure,
} from "@/lib/api/backend-http";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";
import { authJson } from "@/lib/auth/response";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authJson(
      { success: false, message: "Invalid JSON", code: "validation_error" },
      { status: 400 },
    );
  }

  const email =
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).email === "string"
      ? String((body as Record<string, unknown>).email)
          .trim()
          .toLowerCase()
      : "";
  if (!email) {
    return authJson(
      {
        success: false,
        message: "Email is required",
        code: "validation_error",
      },
      { status: 400 },
    );
  }

  if (!isApiBindingEnabled()) {
    return authJson(bindingDisabledPayload(), { status: 503 });
  }

  const startedAt = Date.now();
  const requestId = request.headers.get("x-request-id");
  try {
    const upstream = await backendJson("auth/password-reset/", {
      method: "POST",
      headers: requestId ? { "X-Request-ID": requestId } : undefined,
      data: { email },
    });
    const payload =
      upstream.data && typeof upstream.data === "object"
        ? upstream.data
        : { success: false, message: "Password reset request failed" };
    if (upstream.status < 200 || upstream.status >= 300) {
      logBackendResponseFailure("auth/password-reset", upstream.status, startedAt, requestId);
    }
    return authJson(payload, { status: upstream.status });
  } catch (error) {
    const { status, code } = logBackendFailure(
      "auth/password-reset",
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
