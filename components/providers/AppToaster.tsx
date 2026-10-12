"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useLocale } from "@/lib/i18n/useDictionary";

/**
 * Global Sonner host. Mount once under ThemeProvider + DictionaryProvider
 * so toasts follow locale direction and light/dark theme.
 */
export function AppToaster() {
  const { theme } = useTheme();
  const locale = useLocale();
  const isRtl = locale === "ar";

  return (
    <Toaster
      theme={theme === "dark" ? "dark" : "light"}
      dir={isRtl ? "rtl" : "ltr"}
      position={isRtl ? "top-left" : "top-right"}
      richColors
      closeButton
      expand={false}
      visibleToasts={4}
      gap={10}
      offset={16}
      toastOptions={{
        className: "baraq-toast",
        classNames: {
          toast: "baraq-toast__item",
          title: "baraq-toast__title",
          description: "baraq-toast__description",
          actionButton: "baraq-toast__action",
          cancelButton: "baraq-toast__cancel",
          closeButton: "baraq-toast__close",
          success: "baraq-toast--success",
          error: "baraq-toast--error",
          warning: "baraq-toast--warning",
          info: "baraq-toast--info"
        }
      }}
    />
  );
}
