import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/i18n/config";

// Redirects any path missing a locale segment to the visitor's best match:
// their remembered cookie choice first, then Accept-Language, then default.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${resolveLocale(request)}${pathname}`;
  return NextResponse.redirect(url);
}

function resolveLocale(request: NextRequest): string {
  const cookie = request.cookies.get("locale")?.value;
  if (isLocale(cookie)) return cookie;

  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.split("-")[0].toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .find((entry) => isLocale(entry.tag));

  return preferred?.tag ?? DEFAULT_LOCALE;
}

export const config = {
  // Skip Next internals, the API namespace, and anything with a file
  // extension (fonts, images, favicon) so assets are never redirected.
  matcher: ["/((?!api|_next/static|_next/image|.*\..*).*)"],
};
