import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/paths";
import { translate } from "@/i18n/translate";

/**
 * Rendered for notFound() and for any unmatched path under a locale.
 *
 * Unlike error.tsx this is a normal server render — nothing has gone
 * wrong with the app, the URL simply does not exist — so it can use the
 * dictionary and sit inside the usual storefront chrome.
 *
 * Next does not pass params to not-found, so the locale is read from the
 * headers the middleware already set.
 */
export default async function NotFound() {
  const { headers } = await import("next/headers");
  const list = await headers();
  const path = list.get("x-invoke-path") ?? list.get("referer") ?? "";
  const segment = path.replace(/^https?:\/\/[^/]+/, "").split("/")[1] ?? "";
  const locale = (isLocale(segment) ? segment : "en") as Locale;
  const dict = await getDictionary(locale);
  const t = (key: string) => translate(dict, key);

  return (
    <SiteShell>
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-gradient text-7xl font-extrabold tracking-tight">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          {t("notFound.title")}
        </h1>
        <p className="mt-2 leading-relaxed text-slate-500">
          {t("notFound.body")}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={localePath(locale, "/")}
            className="btn-glow rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            {t("notFound.home")}
          </Link>
          <Link
            href={localePath(locale, "/products")}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t("cart.browse")}
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
