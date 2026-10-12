import Link from "next/link";
import { headers } from "next/headers";

import { LOCALE_HEADER } from "@/lib/auth/cookies";

export default async function NotFound() {
  // "Back to the dashboard" has to mean the reader's dashboard. Hardcoding
  // /ar sent an English session to an Arabic page from its own 404.
  const locale = (await headers()).get(LOCALE_HEADER) === "en" ? "en" : "ar";
  const copy =
    locale === "en"
      ? { title: "Page not found", body: "That link is unavailable or has moved.", back: "Back to the dashboard" }
      : { title: "الصفحة غير موجودة", body: "الرابط المطلوب غير متاح أو تم نقله.", back: "العودة إلى لوحة التحكم" };

  return (
    <main className="standalone-state">
      <div className="standalone-state__code">404</div>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <Link className="button button--primary button--md" href={`/${locale}`}>
        {copy.back}
      </Link>
    </main>
  );
}
