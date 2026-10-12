"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandSpinner } from "@/components/ui/BrandSpinner";
import { useDictionary } from "@/lib/i18n/useDictionary";

/**
 * Route loading with Baraq logo.
 * Visual only: pointer-events none — never blocks Link navigation.
 */
function NavigationProgressInner() {
  const dictionary = useDictionary();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const routeKeyRef = useRef(routeKey);
  const [active, setActive] = useState(false);
  const failSafeRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (failSafeRef.current) window.clearTimeout(failSafeRef.current);
    failSafeRef.current = null;
  };

  useEffect(() => {
    if (routeKeyRef.current === routeKey) return;
    routeKeyRef.current = routeKey;
    clearTimer();
    setActive(false);
  }, [routeKey]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let next: URL;
      try {
        next = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (next.origin !== window.location.origin) return;
      if (`${next.pathname}${next.search}` === `${window.location.pathname}${window.location.search}`) return;

      clearTimer();
      setActive(true);
      failSafeRef.current = window.setTimeout(() => setActive(false), 10000);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimer();
    };
  }, []);

  if (!active) return null;

  return (
    <div className="nav-brand-loading" aria-hidden="true">
      <BrandSpinner size="md" label={dictionary.loading} />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
