import { THEME_COOKIE } from "@/lib/auth/cookies";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "baraq-theme";

export function resolveTheme(value: string | null | undefined): Theme | null {
  return value === "dark" || value === "light" ? value : null;
}

export function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;samesite=lax`;
}
