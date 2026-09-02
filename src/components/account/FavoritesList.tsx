"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, PageHeader } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { getProductById } from "@/lib/data";
import { useDataSource } from "@/lib/data/source-context";
import { useFavorites } from "@/lib/favorites-context";
import type { Product } from "@/lib/types";

export function FavoritesList() {
  const { t } = useI18n();
  const href = useLocaleHref();
  const { source } = useDataSource();
  const { ids, ready, clear } = useFavorites();

  const [products, setProducts] = useState<Product[] | null>(null);

  // Resolved by id rather than by filtering a list, so a favourite the
  // catalog no longer returns simply drops out instead of breaking.
  const key = ids.join(",");
  useEffect(() => {
    if (!ready) return;
    let active = true;

    Promise.all(ids.map((id) => getProductById(source, id)))
      .then((found) => {
        if (!active) return;
        setProducts(found.filter((p): p is Product => Boolean(p)));
      })
      .catch(() => active && setProducts([]));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, source, ready]);

  const missing = products ? ids.length - products.length : 0;

  return (
    <>
      <PageHeader
        title={t("account.favorites")}
        action={
          ids.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              {t("favorites.clear")}
            </button>
          )
        }
      />

      {!ready || products === null ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" aria-hidden />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title={t("favorites.empty")}
          hint={t("favorites.emptyHint")}
          action={
            <Link
              href={href("/products")}
              className="btn-glow inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white"
            >
              {t("cart.browse")}
            </Link>
          }
        />
      ) : (
        <>
          {missing > 0 && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {t("favorites.unavailable", { count: missing })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
