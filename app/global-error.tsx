"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f6f7fb", color: "#101936" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <section>
            <strong style={{ display: "block", fontSize: 72, color: "#7b2ee8", opacity: 0.25 }}>!</strong>
            <h1>تعذر تشغيل لوحة التحكم</h1>
            <p>حدث خطأ غير متوقع. أعد المحاولة، وإن استمر الخطأ تواصل مع مسؤول النظام.</p>
            <button type="button" onClick={reset} style={{ border: 0, borderRadius: 12, padding: "12px 20px", background: "#7b2ee8", color: "white", cursor: "pointer" }}>
              إعادة المحاولة
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
