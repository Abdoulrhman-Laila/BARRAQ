"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="standalone-state"><div className="standalone-state__code">!</div><h1>حدث خطأ غير متوقع</h1><p>تم تسجيل الخطأ. حاول إعادة تحميل القسم.</p><Button onClick={reset}>إعادة المحاولة</Button></main>;
}
