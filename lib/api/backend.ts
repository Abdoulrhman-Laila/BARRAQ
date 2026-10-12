import "server-only";

const backendUrl = (process.env.BACKEND_API_URL ?? "https://api.baraqapp.com/api/v1").replace(/\/+$/, "");
const timeoutMs = Number(process.env.BACKEND_API_TIMEOUT_MS ?? "15000");

export function getBackendUrl(path: string): string {
  return `${backendUrl}/${path.replace(/^\/+/, "")}`;
}

/**
 * All dashboard-to-backend traffic is server-side. In production Compose the
 * URL is the private `backend` service, while Django still needs to know the
 * original browser connection was HTTPS to avoid a redirect to the public DNS.
 */
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (backendUrl.startsWith("http://")) headers.set("X-Forwarded-Proto", "https");

  return fetch(getBackendUrl(path), {
    ...init,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: init.signal ?? AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 15000)
  });
}
