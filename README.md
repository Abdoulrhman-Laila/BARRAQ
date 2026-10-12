# ⚡ لوحة تحكم برّاق — Baraq Admin Dashboard

<p align="center">
  <img src="public/brand/logo-light-removebg-preview.png" alt="برّاق" width="96" />
</p>

<p align="center">
  <strong>مركز القيادة والإدارة لمنصة برّاق التعليمية</strong><br />
  واجهة إنتاجية آمنة لإدارة المستخدمين، المحتوى، الاشتراكات، الذكاء الاصطناعي والتشغيل.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15.4-black?style=flat-square&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="RTL/LTR" src="https://img.shields.io/badge/i18n-AR%20RTL%20%7C%20EN%20LTR-7B2EE8?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/Private-Internal-0D2E69?style=flat-square" />
</p>

---

## 🧭 نظرة عامة

لوحة تحكم **برّاق** مبنية بـ **Next.js App Router** و**TypeScript**، وتعمل بنمط **BFF** بحيث لا يتصل المتصفح مباشرة بالباك إند.

| العنصر | التفاصيل |
|---|---|
| 🎯 الغرض | إدارة وتشغيل منصة برّاق التعليمية |
| 🧱 المعمارية | Next.js BFF + HttpOnly JWT Cookies |
| 🌐 اللغات | العربية (RTL) · الإنجليزية (LTR) |
| 🎨 المظهر | Light / Dark مع هوية برّاق |
| 🔌 الباك إند | عبر `BACKEND_API_URL` (Server-only) |

```text
BACKEND_API_URL → https://api.baraqapp.com/api/v1
```

> 📄 تغطية واجهات الـ API مفصّلة في [`DASHBOARD_API_COVERAGE.md`](./DASHBOARD_API_COVERAGE.md)

---

## ✨ أبرز الخصائص

- 🔐 **مصادقة آمنة** — JWT داخل Cookies من نوع `HttpOnly` (لا تظهر في JavaScript)
- ♻️ **تجديد تلقائي** — Refresh للـ Access Token عند انتهاء الجلسة
- 🛡️ **حماية CSRF** — Double-Submit Cookie مع فحص Origin
- 👤 **صلاحيات RBAC** — التنقل حسب `AdminMe.permissions` و `allowed_sections`
- 🌍 **ثنائية اللغة** — عربية RTL وإنجليزية LTR
- 🌓 **وضع فاتح / داكن** — تبديل فوري مع حفظ التفضيل (بدون وميض)
- 📊 **جداول تشغيلية** — بحث، فلاتر، ترتيب، ترقيم صفحات، وتفاصيل سجل
- 🤖 **مركز AI** — Jobs، Metrics، Feedback، Webhooks، ومخرجات الشخصيات
- 🔌 **ربط API حي** — عبر `API_BINDING_ENABLED` + `NEXT_PUBLIC_API_BINDING_ENABLED` + `BACKEND_API_URL=/api/v1` (عند التعطيل يُرفض الدخول والـ BFF بدل أي صلاحيات offline)
- 🐳 **جاهزية النشر** — Dockerfile متعدد المراحل ومهيأ لـ Coolify

---

## 🗂️ أقسام اللوحة

| القسم | المحتوى |
|---|---|
| 🏠 النظرة العامة | مؤشرات المنصة وصحة النظام |
| 👥 الحسابات | المستخدمون · المديرون |
| 🔑 الصلاحيات | الأدوار · دليل الصلاحيات |
| 📚 المحتوى | المراحل · المواد · المصادر · المجلدات |
| 🗓️ التعلم | الخطط الدراسية · الاختبارات · المحاولات |
| ✨ الذكاء الاصطناعي | Jobs · Feedback · Webhooks · رشيد · خُلاصة · صدى |
| 💳 الاشتراكات | الباقات · اشتراكات المستخدمين · الاستهلاك |
| 🎧 التشغيل | الدعم الفني · سجل التدقيق |

---

## 🏗️ التقنيات

| الطبقة | التقنية |
|---|---|
| ⚛️ الواجهة | React 19 · Next.js 15 (App Router + Turbopack) |
| 🟦 اللغة | TypeScript 5.8 |
| 🎨 التصميم | CSS مخصص بهوية برّاق (بدون Tailwind/shadcn) |
| 🔤 الخط | Cairo عبر `next/font` |
| 🔗 التكامل | Axios (browser + server) → Auth/BFF → Backend Admin API |

---

## 🚀 التشغيل المحلي

### 1️⃣ الإعداد

```bash
cp .env.example .env.local
npm install
```

### 2️⃣ المتغيرات الأساسية (`.env.local`)

| المتغير | الوصف |
|---|---|
| `BACKEND_API_URL` | عنوان الباك إند مع `/api/v1` (Server-only) |
| `API_BINDING_ENABLED` | `true` للربط الحي · `false` يرفض Auth/BFF (لا جلسات offline) |
| `NEXT_PUBLIC_API_BINDING_ENABLED` | نفس العلم للعميل (يُضمَّن وقت البناء — مطلوب في Docker) |
| `API_BINDING_FORCE_PAUSED` | ثابت في `lib/api/binding.ts` — يجب أن يكون `false` للربط الحي |
| `AUTH_COOKIE_SECURE` | `true` مع HTTPS في الإنتاج |

### 3️⃣ التشغيل

```bash
npm run dev
```

ثم افتح:

```text
http://localhost:3000/ar/login
```

---

## 🧪 بوابات الجودة

```bash
npm run typecheck
npm run build
node scripts/validate-dashboard.cjs
```

| الأمر | الغرض |
|---|---|
| `npm run typecheck` | فحص TypeScript بدون إصدار |
| `npm run build` | بناء إنتاجي |
| `npm run lint` | ESLint |
| `npm run check` | Typecheck + Build معاً |

---

## 🔐 عقد المصادقة

```text
المتصفح  →  POST /api/auth/login
السيرفر   →  POST {BACKEND_API_URL}/auth/login/
النتيجة   →  تخزين access + refresh في Cookies آمنة
الطلبات  →  جميع استدعاءات اللوحة عبر /api/bff/*
```

| المسار المحلي | الدور |
|---|---|
| `POST /api/auth/login` | تسجيل الدخول |
| `POST /api/auth/logout` | تسجيل الخروج |
| `GET /api/auth/session` | حالة الجلسة |
| `GET /api/auth/csrf` | رمز CSRF |
| `/api/bff/[...path]` | وكيل آمن لواجهات Admin |
| `GET /api/health` | صحة تطبيق اللوحة |

⚠️ المتصفح **لا** يتصل مباشرة بالباك إند.

قيم تسجيل الدخول تُقرأ عند الإرسال من `FormData` الفعلي، مع بقاء React state كقيمة
احتياطية. هذا يمنع مديري كلمات المرور من إظهار بريد/كلمة مرور في الحقول بينما يرسل
React قيماً قديمة فارغة. يظل الطلب خاضعاً لكل تحقق backend وRBAC المعتاد.

---

## 🐳 النشر على Coolify

1. 📦 ارفع المشروع إلى مستودع Git خاص
2. 🧩 أنشئ تطبيق Docker Compose في Coolify
3. 🌐 اربط نطاق اللوحة بالخدمة `dashboard` على المنفذ `3000`
4. 🔑 أضف `BACKEND_API_URL` كمتغير Runtime فقط
5. 🚫 لا تضف مفاتيح OpenAI أو AI Service إلى لوحة التحكم
6. 🔒 فعّل HTTPS قبل ضبط `AUTH_COOKIE_SECURE=true`

نطاق مقترح:

```text
https://dashboard.baraqapp.com
```

---

## 📁 هيكل مختصر

```text
app/                 # المسارات، التخطيطات، وواجهات API
components/          # الواجهة، الـ Shell، ومكوّنات البيانات
lib/                 # API client، المصادقة، i18n، التنقل
public/brand/        # شعار برّاق وأصول الهوية
scripts/             # أدوات التحقق
```

---

## ✅ ملاحظة الجاهزية

قبل اعتماد إصدار إنتاجي:

1. شغّل `npm install` ثم `npm run typecheck` و `npm run build`
2. فعّل الربط الحي (`API_BINDING_ENABLED=true`) مع باك Staging
3. نفّذ Smoke Test بحساب مدير حقيقي عبر `/ar/login`

---

<p align="center">
  <strong>برّاق</strong> · لوحة تحكم احترافية لمنصة تعليمية ذكية<br />
  <sub>Built with Next.js · Secured by design · Brand-first UI</sub>
</p>
