import "server-only";

const backendBase = (
  process.env.BACKEND_API_URL ?? "https://api.baraqapp.com/api/v1"
).replace(/\/+$/, "");
const backendHost = new URL(backendBase).host;
const configuredTimeoutMs = Number(process.env.BACKEND_API_TIMEOUT_MS ?? 15_000);
const backendTimeoutMs =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : 15_000;

export function getBackendUrl(path: string): string {
  if (!path || /[\\#\u0000-\u001f\u007f]/u.test(path))
    throw new Error("Invalid backend path");

  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : path.slice(queryIndex);
  const segments = pathname.split("/").filter(Boolean);
  if (
    (pathname.startsWith("//") && !pathname.startsWith("///")) ||
    /^[a-z][a-z\d+.-]*:/iu.test(pathname) ||
    segments.some((segment) => {
      try {
        const decoded = decodeURIComponent(segment);
        return (
          decoded === "." ||
          decoded === ".." ||
          decoded.includes("/") ||
          decoded.includes("\\")
        );
      } catch {
        return true;
      }
    })
  ) {
    throw new Error("Invalid backend path");
  }

  const normalizedPath = segments.join("/");
  return `${backendBase}/${normalizedPath ? `${normalizedPath}/` : ""}${search}`;
}

/** Thrown by backendRequest() when the backend responds with an unexpected 3xx, so every caller's existing catch block handles it instead of a raw redirect status leaking to a browser/API client. */
export class BackendRedirectError extends Error {
  constructor(
    public readonly status: number,
    public readonly location: string | undefined,
  ) {
    super(`Unexpected redirect from backend (status ${status})`);
    this.name = "BackendRedirectError";
  }
}

export class BackendResponseError extends Error {
  constructor(public readonly upstreamStatus: number) {
    super(`Unexpected backend response (status ${upstreamStatus})`);
    this.name = "BackendResponseError";
  }
}

/** The subset of an upstream response callers actually read. */
export interface BackendResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

interface BackendRequestInit {
  method?: string;
  /** Undefined values are dropped, so callers can spread optional correlation headers inline. */
  headers?: Record<string, string | undefined> | undefined;
  /**
   * Already-serialized bytes. The transport never serializes on a caller's
   * behalf and never accepts a stream — see the note on sendRequest().
   */
  body?: string | ArrayBuffer | Uint8Array;
  /** "json" parses the response, "arraybuffer" passes the bytes through untouched. */
  responseType?: "json" | "arraybuffer";
  timeoutMs?: number;
}

function headerRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/**
 * The one place this app talks to Django.
 *
 * Native `fetch(url, init)` with an already-materialized body, deliberately —
 * NOT a `Request` object, and never a stream.
 *
 * Next.js replaces `globalThis.fetch` in a server build with its own
 * cache/dedup layer, which inspects the arguments and rebuilds the outgoing
 * request. A `Request` whose body is a `ReadableStream` cannot survive that
 * rebuild: a stream is a one-shot channel, not a copyable value, so the
 * reconstructed request goes out with no body at all. That is precisely how
 * `POST /api/auth/login` reached Django as a bodiless POST and came back
 * `400 {"email":["هذا الحقل مطلوب."],"password":["هذا الحقل مطلوب."]}` while
 * the identical call made directly against `backend:8000` returned a correct
 * 401 — and why it only ever reproduced inside the built container, never
 * under a test runner using the unpatched global fetch.
 *
 * A string/ArrayBuffer body is a plain value, so it copies through any such
 * rebuild intact. tests/wire/ asserts this against a real socket, including
 * under a stand-in for Next's patched fetch.
 */
async function sendRequest<T>(
  path: string,
  init: BackendRequestInit,
): Promise<BackendResponse<T>> {
  const url = getBackendUrl(path);
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  for (const [key, value] of Object.entries(init.headers ?? {})) {
    if (value !== undefined) headers[key] = value;
  }
  Object.assign(headers, {
    // This call goes straight to the internal Django service over the Docker
    // network, bypassing the Caddy gateway that normally sets this header for
    // public traffic. Django trusts X-Forwarded-Proto (SECURE_PROXY_SSL_HEADER)
    // to decide whether a request is "secure"; without it, SECURE_SSL_REDIRECT
    // 301-redirects this plain-HTTP internal call to an HTTPS URL nothing
    // internally serves.
    "X-Forwarded-Proto": "https",
  });

  const hasBody = init.body !== undefined && method !== "GET" && method !== "HEAD";

  const response = await fetch(url, {
    method,
    headers,
    body: hasBody ? (init.body as BodyInit) : undefined,
    cache: "no-store",
    // Never replay a body or an Authorization header at a redirect target.
    // 3xx becomes a classified error below instead.
    redirect: "manual",
    signal: AbortSignal.timeout(init.timeoutMs ?? backendTimeoutMs),
  });

  if (response.status >= 300 && response.status < 400) {
    throw new BackendRedirectError(
      response.status,
      response.headers.get("location") ?? undefined,
    );
  }

  const responseHeaders = headerRecord(response.headers);
  if (init.responseType === "arraybuffer") {
    return {
      status: response.status,
      data: (await response.arrayBuffer()) as T,
      headers: responseHeaders,
    };
  }

  const text = await response.text();
  let data: unknown = undefined;
  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // A non-JSON upstream body (an HTML error page from a misrouted
      // request, say) must not crash the route; callers already handle a
      // non-object payload by falling back to a safe message.
      data = undefined;
    }
  }
  return { status: response.status, data: data as T, headers: responseHeaders };
}

/**
 * Raw passthrough transport: forwards already-buffered bytes exactly as
 * received, preserving the caller's Content-Type (including a browser-
 * generated multipart boundary, which must never be rebuilt).
 */
export async function backendRequest<T = unknown>(
  path: string,
  init: BackendRequestInit = {},
): Promise<BackendResponse<T>> {
  return sendRequest<T>(path, init);
}

/**
 * JSON transport. Serializes with an explicit `JSON.stringify` and sets
 * Content-Type itself, so what goes on the wire is a plain string this
 * function can be held to — not something a client library decided later.
 */
export async function backendJson<T = unknown>(
  path: string,
  init: Omit<BackendRequestInit, "body"> & { data?: unknown } = {},
): Promise<BackendResponse<T>> {
  const { data, headers, ...rest } = init;
  const method = (rest.method ?? "GET").toUpperCase();
  const sendsBody = data !== undefined && method !== "GET" && method !== "HEAD";
  return sendRequest<T>(path, {
    ...rest,
    headers: sendsBody
      ? { "Content-Type": "application/json", ...headers }
      : headers,
    body: sendsBody ? JSON.stringify(data) : undefined,
  });
}

function errorCodes(error: unknown): Set<string> {
  const codes = new Set<string>();
  const seen = new Set<object>();
  const pending: unknown[] = [error];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as { code?: unknown; cause?: unknown; errors?: unknown };
    if (typeof record.code === "string") codes.add(record.code);
    if (record.cause) pending.push(record.cause);
    if (Array.isArray(record.errors)) pending.push(...record.errors);
  }
  return codes;
}

/**
 * Classifies a thrown backendRequest()/backendJson() error for an accurate
 * (but non-sensitive) HTTP status and error code — never the same flat
 * status for every failure kind.
 */
export function classifyBackendError(error: unknown): {
  status: number;
  code: string;
} {
  if (error instanceof BackendRedirectError) {
    return { status: 502, code: "upstream_redirect" };
  }
  if (error instanceof BackendResponseError) {
    return {
      status: error.upstreamStatus,
      code: "upstream_response_error",
    };
  }
  // AbortSignal.timeout() rejects with a DOMException, not an Error subclass
  // carrying a code.
  if (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return { status: 504, code: "upstream_timeout" };
  }

  const codes = errorCodes(error);
  if (
    codes.has("ECONNABORTED") ||
    codes.has("ETIMEDOUT") ||
    codes.has("UND_ERR_CONNECT_TIMEOUT") ||
    codes.has("UND_ERR_HEADERS_TIMEOUT") ||
    codes.has("UND_ERR_BODY_TIMEOUT")
  ) {
    return { status: 504, code: "upstream_timeout" };
  }
  if (
    [
      "ERR_TLS_CERT_ALTNAME_INVALID",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "EPROTO",
    ].some((code) => codes.has(code))
  ) {
    return { status: 502, code: "upstream_tls_error" };
  }
  if (["ENOTFOUND", "EAI_AGAIN"].some((code) => codes.has(code))) {
    return { status: 502, code: "upstream_dns_error" };
  }
  if (
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "UND_ERR_SOCKET",
    ].some((code) => codes.has(code))
  ) {
    return { status: 502, code: "upstream_unreachable" };
  }
  // Native fetch reports every transport failure as a TypeError whose `cause`
  // carries the real code; an unrecognized one is still a transport failure.
  if (error instanceof TypeError) {
    return { status: 502, code: "upstream_unreachable" };
  }
  return { status: 503, code: "unknown_error" };
}

/** Logs a safe, structured record of a backend-call failure (operation, error code/status, duration — never the request body, credentials, or tokens) and returns the status/code to respond with. */
export function logBackendFailure(
  operation: string,
  error: unknown,
  startedAt: number,
  requestId?: string | null,
): { status: number; code: string } {
  const classified = classifyBackendError(error);
  console.error(`[backend:${operation}] request failed`, {
    code: classified.code,
    status: classified.status,
    upstreamHost: backendHost,
    durationMs: Date.now() - startedAt,
    requestId: requestId || undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return classified;
}

/** Records a completed non-2xx upstream response without logging its payload. */
export function logBackendResponseFailure(
  operation: string,
  status: number,
  startedAt: number,
  requestId?: string | null,
): void {
  console.error(`[backend:${operation}] upstream response failed`, {
    status,
    upstreamHost: backendHost,
    durationMs: Date.now() - startedAt,
    requestId: requestId || undefined,
  });
}
