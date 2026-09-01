import { Suspense } from "react";
import { FilterBar } from "@/components/FilterBar";
import { ProductGrid } from "@/components/ProductGrid";
import { getCategories } from "@/lib/data";
import { DEFAULT_SOURCE } from "@/lib/data/config";
import type { SearchFilters } from "@/lib/types";

// Query-string driven dynamic params: /products?category=audio&sort=price-asc&q=…
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const single = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const filters: SearchFilters = {
    q: single(sp.q) || undefined,
    category: single(sp.category) || undefined,
    maxPrice: single(sp.maxPrice) ? Number(single(sp.maxPrice)) : undefined,
    minRating: single(sp.minRating) ? Number(single(sp.minRating)) : undefined,
    inStock: single(sp.inStock) === "1" ? true : undefined,
    sort: (single(sp.sort) as SearchFilters["sort"]) || undefined,
  };

  const categories = await getCategories(DEFAULT_SOURCE);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Products</h1>
        <p className="mt-1 text-slate-500">
          Browse the catalog. Filtering and sorting are driven by the URL query
          string.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <FilterBar categories={categories} />
        </div>
        <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
          <ProductGrid filters={filters} />
        </Suspense>
      </div>
    </main>
  );
}
