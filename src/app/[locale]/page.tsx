import Link from "next/link";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { HeroSearch } from "@/components/HeroSearch";
import { Icon } from "@/components/panel/Icon";
import { SiteShell } from "@/components/SiteShell";
import { Aurora } from "@/components/visual/Aurora";
import { Reveal } from "@/components/visual/Reveal";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localized } from "@/i18n/localized";
import { localePath } from "@/i18n/paths";
import { translate } from "@/i18n/translate";
import { getCategories, listProducts } from "@/lib/data";
import { DEFAULT_SOURCE } from "@/lib/data/config";
import { formatNumber } from "@/lib/format";
import { MOCK_REVIEWS } from "@/lib/data/reviews-data";
import { ratingFor } from "@/lib/reviews";

/** Category slug -> icon, so the cards read at a glance. */
const CATEGORY_ICON: Record<string, string> = {
  audio: "headphones",
  wearables: "watch",
  desk: "desk",
  home: "home",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const dict = await getDictionary(locale);
  const t = (path: string) => translate(dict, path);

  const categories = await getCategories(DEFAULT_SOURCE);
  const products = await listProducts(DEFAULT_SOURCE, {}, locale);

  // Averaged across products that actually have a rating.
  const rated = products
    .map((p) => ratingFor(p.id, MOCK_REVIEWS).average)
    .filter((value): value is number => value !== null);
  const averageRating =
    rated.length > 0
      ? rated.reduce((sum, value) => sum + value, 0) / rated.length
      : 0;

  const stats = [
    {
      value: formatNumber(products.length, locale),
      label: t("home.statProducts"),
    },
    { value: formatNumber(1240, locale), label: t("home.statCustomers") },
    {
      value: formatNumber(Number(averageRating.toFixed(1)), locale),
      label: t("home.statRating"),
    },
    { value: t("home.statDeliveryValue"), label: t("home.statDelivery") },
  ];

  const features = [
    {
      icon: "truck",
      title: t("home.featureShipping"),
      body: t("home.featureShippingBody"),
    },
    {
      icon: "shield",
      title: t("home.featureReturns"),
      body: t("home.featureReturnsBody"),
    },
    {
      icon: "headset",
      title: t("home.featureSupport"),
      body: t("home.featureSupportBody"),
    },
  ];

  return (
    <SiteShell>
      <main>
        {/* ---------------------------------------------- hero */}
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <Aurora />

          <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <span className="glass animate-fade-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-100">
                <Icon name="sparkles" className="h-3.5 w-3.5" />
                {t("home.heroEyebrow")}
              </span>

              <h1
                className="animate-fade-up mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl"
                style={{ animationDelay: "80ms" }}
              >
                {t("home.heroTitle")}
              </h1>

              <p
                className="animate-fade-up mx-auto mt-6 max-w-2xl leading-relaxed text-indigo-100/80 sm:text-lg"
                style={{ animationDelay: "160ms" }}
              >
                {t("home.heroBody")}
              </p>

              <div
                className="animate-fade-up mt-10 flex flex-wrap justify-center gap-3"
                style={{ animationDelay: "240ms" }}
              >
                <Link
                  href={localePath(locale, "/products")}
                  className="btn-glow group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900"
                >
                  {t("home.shopAll")}
                  <Icon
                    name="arrowRight"
                    className="rtl-flip h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href={localePath(locale, "/products?sort=rating-desc")}
                  className="glass btn-glow inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white"
                >
                  <Icon name="star" className="h-4 w-4" />
                  {t("home.topRated")}
                </Link>
              </div>

              <div
                className="animate-fade-up"
                style={{ animationDelay: "320ms" }}
              >
                <HeroSearch />
              </div>
            </div>

            <dl className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {stats.map((stat, i) => (
                <Reveal
                  key={stat.label}
                  motion="in"
                  delay={i * 90}
                  className="bg-slate-950/40 px-4 py-6 text-center backdrop-blur"
                >
                  <dt className="text-2xl font-extrabold sm:text-3xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-1 text-xs font-medium uppercase tracking-wide text-indigo-200/70">
                    {stat.label}
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>

          {/* Fades the dark hero into the page background. */}
          <div className="h-16 bg-gradient-to-b from-transparent to-slate-50" />
        </section>

        {/* ---------------------------------------- categories */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t("home.shopByCategory")}
            </h2>
            <Link
              href={localePath(locale, "/products")}
              className="link-underline text-sm font-semibold text-indigo-600"
            >
              {t("home.viewAll")}
            </Link>
          </Reveal>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((cat, i) => (
              <Reveal key={cat.id} motion="scale" delay={i * 70}>
                <Link
                  href={localePath(locale, `/products?category=${cat.slug}`)}
                  className="card-lift group relative flex h-full flex-col items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-center"
                >
                  {/* Tint that washes in behind the icon on hover. */}
                  <span className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-fuchsia-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors duration-300 group-hover:bg-indigo-600 group-hover:text-white">
                    <Icon name={CATEGORY_ICON[cat.slug] ?? "box"} />
                  </span>
                  <span className="relative font-semibold text-slate-800 group-hover:text-indigo-700">
                    {localized(cat.name, locale)}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ------------------------------------------ featured */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t("home.featured")}
            </h2>
            <Link
              href={localePath(locale, "/products")}
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600"
            >
              {t("home.viewAll")}
              <Icon
                name="arrowRight"
                className="rtl-flip h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </Reveal>

          <FeaturedProducts />
        </section>

        {/* ------------------------------------------ features */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {t("home.featuresTitle")}
              </h2>
              <p className="mt-3 text-slate-500">{t("home.featuresBody")}</p>
            </Reveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {features.map((feature, i) => (
                <Reveal key={feature.title} delay={i * 100}>
                  <div className="card-lift h-full rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white shadow-md">
                      <Icon name={feature.icon} />
                    </span>
                    <h3 className="mt-4 font-bold text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                      {feature.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------- cta */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Reveal motion="scale">
            <div className="relative isolate overflow-hidden rounded-3xl bg-slate-950 px-6 py-16 text-center text-white sm:px-16">
              <Aurora />
              <div className="relative">
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
                  {t("home.ctaTitle")}
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-indigo-100/80">
                  {t("home.ctaBody")}
                </p>
                <Link
                  href={localePath(locale, "/products")}
                  className="btn-glow group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-slate-900"
                >
                  {t("home.shopAll")}
                  <Icon
                    name="arrowRight"
                    className="rtl-flip h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </SiteShell>
  );
}
