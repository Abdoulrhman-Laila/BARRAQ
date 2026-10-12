import "server-only";

import { NextResponse } from "next/server";

export const AUTH_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
} as const;

/** Authentication responses must never be cached by browsers or intermediaries. */
export function authJson(body: object, init: ResponseInit = {}): NextResponse {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(AUTH_NO_STORE_HEADERS))
    headers.set(key, value);
  return NextResponse.json(body, { ...init, headers });
}
