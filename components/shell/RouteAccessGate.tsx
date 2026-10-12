"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/components/providers/AdminProvider";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { matchNavItem } from "@/lib/navigation";
import type { Locale } from "@/types/api";

export function RouteAccessGate({
  locale,
  dictionary,
  children
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { admin, loading, error, can, reload } = useAdmin();
  const item = matchNavItem(pathname, locale);

  if (loading) {
    return <LoadingState size="lg" />;
  }

  if (error || !admin) {
    return (
      <ErrorState
        message={error ?? dictionary.httpUnauthorized}
        onRetry={reload}
      />
    );
  }

  if (item && !can(item.permission, item.section)) {
    return (
      <div className="error-state" role="alert">
        <div className="error-state__icon" aria-hidden="true">
          403
        </div>
        <div>
          <h3>{dictionary.accessDeniedTitle}</h3>
          <p>{dictionary.accessDeniedDesc}</p>
        </div>
        <Link href={`/${locale}`}>
          <Button variant="secondary">{dictionary.backToOverview}</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
