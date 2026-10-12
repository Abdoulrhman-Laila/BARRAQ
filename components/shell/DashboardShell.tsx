"use client";

import { useCallback, useState } from "react";
import { AdminProvider } from "@/components/providers/AdminProvider";
import { RouteAccessGate } from "@/components/shell/RouteAccessGate";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/types/api";

export function DashboardShell({
  locale,
  dictionary,
  children
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);

  return (
    <AdminProvider>
      <div className="dashboard-shell">
        <Sidebar locale={locale} dictionary={dictionary} open={mobileOpen} onClose={closeMobile} />
        <div className="dashboard-main">
          <Topbar
            locale={locale}
            dictionary={dictionary}
            onMenu={openMobile}
            menuOpen={mobileOpen}
          />
          <main className="page-content">
            <RouteAccessGate locale={locale} dictionary={dictionary}>
              {children}
            </RouteAccessGate>
          </main>
          <footer className="dashboard-footer">
            {dictionary.footerBrand} • {new Date().getFullYear()} • {dictionary.footerVersion}{" "}
            {process.env.NEXT_PUBLIC_DASHBOARD_VERSION ?? "1.0.0"}
          </footer>
        </div>
      </div>
    </AdminProvider>
  );
}
