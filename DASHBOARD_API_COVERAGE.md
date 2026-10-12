# مصفوفة تغطية لوحة تحكم برّاق

| المجال | المسار | الحالة في اللوحة |
|---|---|---|
| حساب المدير | `GET /admin/me/` | مفعّل + تحقق جلسة عبر `auth/verify` |
| النظرة العامة | `GET /admin/overview/` | مفعّل بالكامل |
| صحة النظام | `GET /admin/system/health/` | مفعّل بالكامل |
| صحة خدمة AI | `GET /ai/service-health/` | مفعّل في صفحة النظام |
| المستخدمون | `/admin/users/` | قائمة + تعديل PATCH + تفعيل/إيقاف + اشتراك |
| المديرون | `/admin/admin-users/` | قائمة + إنشاء/تعديل/حذف + تعيين أدوار |
| الأدوار | `/admin/roles/` | قائمة + إنشاء/تعديل/حذف (غير النظامية) |
| الصلاحيات | `/admin/permissions/` | قائمة وتصنيف وتفاصيل |
| المراحل | `/admin/education-stages/` | قائمة + إنشاء + تعديل PUT + حذف |
| المواد | `/admin/subjects/` | قائمة + إنشاء + تعديل PUT + حذف |
| المصادر | `/admin/sources/` | قائمة + تفاصيل + حذف |
| المجلدات | `/admin/source-collections/` | قائمة وتفاصيل |
| الخطط | `/admin/study-plans/` | قائمة، فلاتر، تفاصيل |
| الاختبارات | `/admin/quizzes/` | قائمة، فلاتر، تفاصيل |
| المحاولات | `/admin/quiz-attempts/` | قائمة ونتائج وتفاصيل |
| تفاعلات الشخصيات | `/admin/character-interactions/` | تبويب ضمن مخرجات الشخصيات |
| AI Jobs | `/admin/ai-jobs/` | قائمة، فلاتر، تفاصيل وإلغاء |
| AI Metrics | `/admin/ai-jobs/metrics/` | بطاقات ومؤشرات |
| AI Feedback | `/admin/ai-feedback/` | قائمة وفلاتر وتفاصيل |
| Webhooks | `/admin/ai-webhook-events/` | قائمة ومتابعة الأخطاء |
| توصيات رشيد | `/admin/ai-recommendations/` | قائمة وتفاصيل |
| ملخصات خُلاصة | `/admin/ai-summaries/` | قائمة وتفاصيل |
| تفريغات صدى | `/admin/ai-transcriptions/` | قائمة وتفاصيل |
| الباقات | `/admin/subscription-plans/` | قائمة + إنشاء/تعديل/حذف |
| اشتراكات المستخدمين | `/admin/user-subscriptions/` | قائمة + تعديل PATCH |
| الاستهلاك | `/admin/subscription-usage/` | قائمة وتفاصيل |
| الدعم | `/admin/support-tickets/` | إنشاء + خيط رسائل + حل/إغلاق |
| التدقيق | `/admin/audit-logs/` | قائمة، بحث، تفاصيل |

## Auth المشترك

| المسار | الحالة |
|---|---|
| `POST /auth/login/` | عبر `/api/auth/login` |
| `POST /auth/logout/` | عبر `/api/auth/logout` |
| `POST /auth/refresh/` | داخل BFF / server auth |
| `POST /auth/verify/` | عبر `/api/auth/verify` + فحص في `/api/auth/session` عند تحميل اللوحة |
| `POST /auth/change-password/` | UI في Topbar |
| `POST /auth/password-reset/` | forgot-password |
| `POST /auth/password-reset/confirm/` | reset-password |

## خارج نطاق UI التشغيلي

- `GET /admin/` فهرس API فقط (غير مطلوب كشاشة)
- وحدات `missing_expected_capabilities` في العقد (غير موجودة في الباك بعد)
