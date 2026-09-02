import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { ProductGrid } from "@/components/ProductGrid";
import { SiteShell } from "@/components/SiteShell";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { translate } from "@/i18n/translate";
import { getCategories, listProducts } from "@/lib/data";
import { mockBrands } from "@/lib/data/brands";
import { priceBounds } from "@/lib/attributes";
import { effectivePrice } from "@/lib/pricing";
import { DEFAULT_SOURCE } from "@/lib/data/config";

// Filters are read from the query string on the client, where they can be
// re-run against whichever data source the toggle has selected. The server
// only needs the category list to render the filter sidebar, which lets
// this page stay statically rendered.
export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const dict = await getDictionary(locale);
  const categories = await getCategories(DEFAULT_SOURCE);
  const brands = await mockBrands();

  // Slider bounds come from the catalog rather than a constant, so they
  // stay correct as products are added, repriced or discounted.
  const all = await listProducts(DEFAULT_SOURCE, {}, locale);
  const bounds = priceBounds(all.map((p) => effectivePrice(p)));
  const currency = all[0]?.currency ?? "EUR";

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="animate-fade-up mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {translate(dict, "nav.products")}
          </h1>
          <div className="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500" />
        </div>

        {/* Both children read the query string, which opts them out of
            prerendering unless each sits behind its own boundary. */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Suspense
              fallback={
                <div
                  className="skeleton h-72 rounded-2xl"
                  aria-hidden
                />
              }
            >
              <FilterBar
                categories={categories}
                brands={brands}
                priceBounds={bounds}
                currency={currency}
              />
            </Suspense>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton h-64 rounded-2xl"
                    aria-hidden
                  />
                ))}
              </div>
            }
          >
            <ProductGrid />
          </Suspense>
        </div>
      </main>
    </SiteShell>
  );
}
