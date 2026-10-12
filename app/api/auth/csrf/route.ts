import { cookies } from "next/headers";
import {
  CSRF_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/cookies";
import { cookieOptions } from "@/lib/auth/server";
import { authJson } from "@/lib/auth/response";

export async function GET() {
  const store = await cookies();
  let token = store.get(CSRF_COOKIE)?.value;
  if (!token) {
    token = crypto.randomUUID();
    store.set(CSRF_COOKIE, token, {
      ...cookieOptions(false),
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  }
  return authJson({ success: true, data: { token } });
}
