import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/shell/DashboardShell";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";

export default async function DashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (raw !== "ar" && raw !== "en") notFound();
  const locale = raw as Locale;
  return <DashboardShell locale={locale} dictionary={getDictionary(locale)}>{children}</DashboardShell>;
}
