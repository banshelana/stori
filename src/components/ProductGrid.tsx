"use client";

import { ProductCard } from "@/components/ProductCard";
import { useI18n } from "@/i18n/I18nProvider";
import { useProducts } from "@/lib/hooks";
import { useFilters } from "@/lib/useFilters";

export function ProductGrid() {
  const filters = useFilters();
  const { data, loading, error } = useProducts(filters);
  const { t } = useI18n();

  if (error) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {t("common.error")}: {error}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-64 rounded-2xl"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-lg font-semibold text-slate-700">
          {t("common.noResults")}
        </p>
        <p className="mt-1 text-sm text-slate-500">{t("common.noResultsHint")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((product, i) => (
        <div
          key={product.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
        >
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
