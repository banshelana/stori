"use client";

import { ProductCard } from "@/components/ProductCard";
import { useI18n } from "@/i18n/I18nProvider";
import { useFeatured } from "@/lib/hooks";

export function FeaturedProducts() {
  const { data, loading, error } = useFeatured(3);
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl bg-slate-200"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-rose-600">
        {t("common.error")}: {error}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {(data ?? []).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
