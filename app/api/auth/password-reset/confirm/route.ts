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

  const data =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const uid = typeof data.uid === "string" ? data.uid.trim() : "";
  const token = typeof data.token === "string" ? data.token.trim() : "";
  const newPassword =
    typeof data.new_password === "string" ? data.new_password : "";

  if (!uid || !token || !newPassword) {
    return authJson(
      {
        success: false,
        message: "uid, token and new_password are required",
        code: "validation_error",
      },
      { status: 400 },
    );
  }
  if (newPassword.length < 10) {
    return authJson(
      {
        success: false,
        message: "Password must be at least 10 characters",
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
    const upstream = await backendJson("auth/password-reset/confirm/", {
      method: "POST",
      headers: requestId ? { "X-Request-ID": requestId } : undefined,
      data: { uid, token, new_password: newPassword },
    });
    const payload =
      upstream.data && typeof upstream.data === "object"
        ? upstream.data
        : { success: false, message: "Password reset confirmation failed" };
    if (upstream.status < 200 || upstream.status >= 300) {
      logBackendResponseFailure(
        "auth/password-reset/confirm",
        upstream.status,
        startedAt,
        requestId,
      );
    }
    return authJson(payload, { status: upstream.status });
  } catch (error) {
    const { status, code } = logBackendFailure(
      "auth/password-reset/confirm",
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
