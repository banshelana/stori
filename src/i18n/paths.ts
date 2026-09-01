import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";

// ---------------------------------------------------------------
// Pure path helpers, deliberately kept out of the "use client"
// navigation module: server components need to call these directly,
// and anything exported from a client module can only be rendered,
// never invoked, on the server.
// ---------------------------------------------------------------

/** Prefix an app-relative path with a locale segment: "/cart" -> "/fa/cart". */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

/** Strip the locale segment off a pathname: "/fa/cart" -> "/cart". */
export function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  if (isLocale(segments[1])) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

export function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}
