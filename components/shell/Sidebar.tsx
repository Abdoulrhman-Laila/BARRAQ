"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { navigation, navigationGroups, type NavItem } from "@/lib/navigation";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";
import { useAdmin } from "@/components/providers/AdminProvider";

/** Presentation-only grouping — routes, permissions, and items stay unchanged. */
const MOBILE_SHELL_MQ = "(max-width: 820px)";

export function Sidebar({
  locale,
  dictionary,
  open,
  onClose
}: {
  locale: Locale;
  dictionary: Dictionary;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { admin, loading, can } = useAdmin();
  const base = `/${locale}`;

  const visibleItems = navigation.filter((item) => !loading && can(item.permission, item.section));
  const visibleByKey = new Map(visibleItems.map((item) => [item.key, item]));

  useEffect(() => {
    if (!open) return;

    const mq = window.matchMedia(MOBILE_SHELL_MQ);

    const syncBodyLock = () => {
      // Desktop keeps normal scroll even if open state lingers after resize.
      document.body.style.overflow = mq.matches ? "hidden" : "";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mq.matches) onClose();
    };

    syncBodyLock();
    mq.addEventListener("change", syncBodyLock);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      mq.removeEventListener("change", syncBodyLock);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      <aside
        id="dashboard-sidebar"
        className={`sidebar ${open ? "sidebar--open" : ""}`}
        aria-label={dictionary.sidebarNav}
      >
        <div className="sidebar__brand">
          <div className="sidebar__brand-logo">
            <Image src="/brand/logo-light-removebg-preview.png" width={56} height={56} alt="برّاق" priority />
          </div>
          <div className="sidebar__brand-text">
            <strong>{dictionary.appName}</strong>
            <span>{dictionary.controlCenter}</span>
          </div>
          <button type="button" className="icon-button sidebar__close" onClick={onClose} aria-label={dictionary.close}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label={dictionary.mainNav}>
          {navigationGroups.map((group) => {
            const items = group.keys.map((key) => visibleByKey.get(key)).filter(Boolean) as NavItem[];
            if (!items.length) return null;

            return (
              <div key={group.id} className="sidebar__group">
                <p className="sidebar__group-label">{dictionary[group.labelKey]}</p>
                <ul className="sidebar__list">
                  {items.map((item) => {
                    const href = item.href ? `${base}${item.href}` : base;
                    const active =
                      item.href === ""
                        ? pathname === base || pathname === `${base}/`
                        : pathname === href || pathname.startsWith(`${href}/`);

                    return (
                      <li key={item.href || "overview"}>
                        <Link
                          href={href}
                          className={`sidebar__link${active ? " active" : ""}`}
                          aria-current={active ? "page" : undefined}
                          onClick={open ? onClose : undefined}
                        >
                          <span className="sidebar__link-icon" aria-hidden="true">
                            <Icon name={item.icon} />
                          </span>
                          <span className="sidebar__link-label">{dictionary[item.key]}</span>
                          {active ? <span className="active-indicator" aria-hidden="true" /> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="sidebar__profile">
          <span className="avatar avatar--large" aria-hidden="true">
            {admin?.full_name?.slice(0, 1) ?? dictionary.adminFallback.slice(0, 1)}
          </span>
          <div className="sidebar__profile-meta">
            <strong>{admin?.full_name ?? dictionary.adminFallback}</strong>
            <small>{admin?.email ?? ""}</small>
          </div>
        </div>
      </aside>

      {open ? (
        <button type="button" className="sidebar-overlay" aria-label={dictionary.closeMenu} onClick={onClose} />
      ) : null}
    </>
  );
}
