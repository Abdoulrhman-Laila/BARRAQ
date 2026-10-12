import { notFound } from "next/navigation";
import { AppToaster } from "@/components/providers/AppToaster";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NavigationProgress } from "@/components/shell/NavigationProgress";
import { DictionaryProvider } from "@/lib/i18n/useDictionary";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (raw !== "ar" && raw !== "en") notFound();
  const locale = raw as Locale;
  const dictionary = getDictionary(locale);

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <ThemeProvider>
        <QueryProvider>
          <DictionaryProvider locale={locale} dictionary={dictionary}>
            <NavigationProgress />
            {children}
            <AppToaster />
          </DictionaryProvider>
        </QueryProvider>
      </ThemeProvider>
    </div>
  );
}
