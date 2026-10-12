import type { ApiEnvelope, ListPayload, Paginated } from "@/types/api";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { status: number; code?: string; requestId?: string; details?: unknown }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export function normalizeEnvelope<T>(payload: unknown): ApiEnvelope<T> {
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return payload as ApiEnvelope<T>;
  }
  return {
    success: true,
    data: payload as T,
    meta: {},
    error: null
  };
}

export function normalizeList<T>(payload: ListPayload<T>): Paginated<T> {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload };
  }
  return payload;
}

/** Surfaces the first backend field-validation message, without the field-name prefix (end users see the message, not the API's internal field key). */
function formatFieldErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && value.length) return String(value[0]);
    if (value && typeof value === "object") {
      const nested = formatFieldErrors(value);
      if (nested) return nested;
    }
  }
  return null;
}

export function getErrorMessage(payload: unknown, fallback = "تعذر تنفيذ الطلب"): string {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as Record<string, unknown>;

  if (typeof value.message === "string" && value.message.trim()) return value.message;

  if (value.error && typeof value.error === "object") {
    const error = value.error as Record<string, unknown>;
    if (typeof error.message === "string" && error.message.trim()) return error.message;
  }

  const fieldErrors = formatFieldErrors(value.errors);
  if (fieldErrors) return fieldErrors;

  if (typeof value.detail === "string" && value.detail.trim()) return value.detail;
  if (Array.isArray(value.detail)) return value.detail.map(String).join(" · ");

  return fallback;
}

export function getErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const value = payload as Record<string, unknown>;
  if (typeof value.code === "string") return value.code;
  if (value.error && typeof value.error === "object") {
    const error = value.error as Record<string, unknown>;
    if (typeof error.code === "string") return error.code;
  }
  return undefined;
}

export function getRequestId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const value = payload as Record<string, unknown>;
  return typeof value.request_id === "string" ? value.request_id : undefined;
}

export function toApiError(payload: unknown, status: number, fallback?: string): ApiError {
  const message = getErrorMessage(payload, fallback ?? `HTTP ${status}`);
  return new ApiError(message, {
    status,
    code: getErrorCode(payload),
    requestId: getRequestId(payload),
    details: payload && typeof payload === "object" ? (payload as Record<string, unknown>).errors : undefined
  });
}
