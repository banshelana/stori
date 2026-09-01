import Link from "next/link";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { SiteShell } from "@/components/SiteShell";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { translate } from "@/i18n/translate";
import { getCategories } from "@/lib/data";
import { DEFAULT_SOURCE } from "@/lib/data/config";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const dict = await getDictionary(locale);
  const t = (path: string) => translate(dict, path);

  // Categories now come through the data layer rather than importing the
  // mock module directly, so the header toggle governs this section too.
  const categories = await getCategories(DEFAULT_SOURCE);

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-4">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 px-6 py-16 text-white sm:px-12 sm:py-20">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-indigo-50">{t("home.heroBody")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={localePath(locale, "/products")}
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              {t("home.shopAll")}
            </Link>
            <Link
              href={localePath(locale, "/products?sort=rating-desc")}
              className="rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("home.topRated")}
            </Link>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            {t("home.shopByCategory")}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={localePath(locale, `/products?category=${cat.slug}`)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600"
              >
                {localized(cat.name, locale)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 pb-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              {t("home.featured")}
            </h2>
            <Link
              href={localePath(locale, "/products")}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {t("home.viewAll")}{" "}
              <span className="rtl-flip inline-block">&rarr;</span>
            </Link>
          </div>
          <FeaturedProducts />
        </section>
      </main>
    </SiteShell>
  );
}
