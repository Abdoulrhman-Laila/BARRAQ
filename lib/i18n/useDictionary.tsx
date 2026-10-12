"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";

interface DictionaryContextValue {
  locale: Locale;
  dictionary: Dictionary;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  locale,
  dictionary,
  children
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return <DictionaryContext.Provider value={{ locale, dictionary }}>{children}</DictionaryContext.Provider>;
}

export function useLocale(): Locale {
  const context = useContext(DictionaryContext);
  const params = useParams<{ locale?: string }>();
  if (context) return context.locale;
  return params?.locale === "en" ? "en" : "ar";
}

export function useDictionary(): Dictionary {
  const context = useContext(DictionaryContext);
  const locale = useLocale();
  return context?.dictionary ?? getDictionary(locale);
}
