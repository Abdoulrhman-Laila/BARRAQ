"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/providers/AdminProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ChangePasswordModal } from "@/components/shell/ChangePasswordModal";
import { Icon } from "@/components/ui/Icon";
import { authApi } from "@/lib/api/auth-client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";

export function Topbar({
  locale,
  dictionary,
  onMenu,
  menuOpen = false
}: {
  locale: Locale;
  dictionary: Dictionary;
  onMenu: () => void;
  menuOpen?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { admin } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  // Which tenant this session acts on. A scoped operator seeing an empty
  // list is looking at a real answer -- the backend grants nothing without
  // a scope -- so it says so rather than leaving the field blank.
  const scopeLabel = admin?.is_superuser
    ? dictionary.scopeGlobal
    : (admin?.scopes ?? []).length === 0
      ? dictionary.noScope
      : (admin?.scopes ?? [])
          .map((scope) =>
            scope.type === "global"
              ? dictionary.scopeGlobal
              : (scope.classroom?.name ?? scope.organization?.name ?? scope.type)
          )
          .join("، ");
  const [busy, setBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const switchLocale = () => {
    const current = window.location.pathname;
    const nextLocale = locale === "ar" ? "en" : "ar";
    const nextPath = current.replace(/^\/(ar|en)(?=\/|$)/, `/${nextLocale}`);
    document.cookie = `baraq_locale=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    window.location.assign(nextPath);
  };

  const logout = async () => {
    setBusy(true);
    try {
      await authApi.logout();
    } finally {
      // Drop all server-state so the next login cannot reuse RBAC/list caches.
      queryClient.clear();
      router.replace(`/${locale}/login`);
      router.refresh();
      setBusy(false);
    }
  };

  const displayName = admin?.full_name ?? dictionary.adminFallback;
  const initial = displayName.slice(0, 1);
  const roleLabel = admin?.role || (admin?.is_superuser ? "Super Admin" : "Admin");

  return (
    <>
      <header className="topbar">
        <div className="topbar__bar" aria-hidden="true" />

        <div className="topbar__start">
          <button
            type="button"
            className="icon-button topbar__menu"
            onClick={onMenu}
            aria-label={dictionary.menu}
            aria-expanded={menuOpen}
            aria-controls="dashboard-sidebar"
          >
            <Icon name="menu" />
          </button>

          <label className="topbar__search">
            <span className="topbar__search-icon" aria-hidden="true">
              <Icon name="search" />
            </span>
            <input type="search" placeholder={dictionary.search} aria-label={dictionary.search} />
            <kbd className="topbar__search-kbd">
              <span>⌘</span>
              <span>K</span>
            </kbd>
          </label>
        </div>

        <div className="topbar__end">
          <div className="topbar__tools" role="group" aria-label={dictionary.quickTools}>
            <button
              type="button"
              className="topbar__tool topbar__tool--lang"
              onClick={switchLocale}
              aria-label={locale === "ar" ? dictionary.switchToEnglish : dictionary.switchToArabic}
              title={locale === "ar" ? "English" : "العربية"}
            >
              <span className="topbar__tool-label">{locale === "ar" ? "EN" : "ع"}</span>
            </button>

            <button
              type="button"
              className="topbar__tool"
              onClick={toggleTheme}
              aria-label={dictionary.toggleTheme}
              title={theme === "dark" ? dictionary.lightMode : dictionary.darkMode}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>

            <button
              type="button"
              className="topbar__tool"
              onClick={() => setPasswordOpen(true)}
              aria-label={dictionary.changePassword}
              title={dictionary.changePassword}
            >
              <Icon name="shield" />
            </button>

            <button
              type="button"
              className="topbar__tool notification-button"
              aria-label={dictionary.notifications}
              title={dictionary.notifications}
            >
              <Icon name="bell" />
              <span className="notification-button__dot" aria-hidden="true" />
            </button>
          </div>

          <div className="topbar__user">
            <div className="topbar__identity" title={admin?.email ?? displayName}>
              <span className="avatar topbar__avatar" aria-hidden="true">
                {initial}
              </span>
              <div className="topbar__identity-text">
                <strong>{displayName}</strong>
                <small>
                  <span className="topbar__role">{roleLabel}</span>
                  {scopeLabel ? <span className="topbar__scope">{scopeLabel}</span> : null}
                  {admin?.email ? <span className="topbar__email">{admin.email}</span> : null}
                </small>
              </div>
            </div>

            <button
              type="button"
              className="topbar__logout"
              onClick={logout}
              disabled={busy}
              aria-busy={busy}
              title={dictionary.logout}
            >
              <Icon name="logout" />
              <span>{dictionary.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
