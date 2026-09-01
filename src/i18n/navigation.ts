"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import { localeFromPathname, localePath, stripLocale } from "@/i18n/paths";

/**
 * Returns a builder that keeps the active locale, so components can write
 * href={href("/account/orders")} without threading the locale everywhere.
 */
export function useLocaleHref() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  return useCallback((path: string) => localePath(locale, path), [locale]);
}

/** Switches locale while staying on the current page and query string. */
export function useLocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const current = localeFromPathname(pathname);

  const switchTo = useCallback(
    (next: Locale) => {
      if (next === current) return;
      const rest = stripLocale(pathname);
      const search = typeof window !== "undefined" ? window.location.search : "";
      // Remembered so the middleware can honour the choice on a bare "/" visit.
      try {
        document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* ignore */
      }
      router.push(`${localePath(next, rest)}${search}`);
      router.refresh();
    },
    [router, pathname, current]
  );

  return { locale: current, locales: LOCALES, switchTo };
}
