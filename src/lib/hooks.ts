"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCategories,
  getFeatured,
  getProductById,
  getProductBySlug,
  listProducts,
} from "@/lib/data";
import { useI18n } from "@/i18n/I18nProvider";
import { useDataSource } from "@/lib/data/source-context";
import { useCart } from "@/lib/cart-context";
import type { Category, Product, SearchFilters } from "@/lib/types";

function useSourceData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[]
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function useProducts(filters: SearchFilters) {
  const { source } = useDataSource();
  const { locale } = useI18n();
  return useSourceData<Product[]>(
    () => listProducts(source, filters, locale),
    [
      source,
      locale,
      filters.q,
      filters.category,
      filters.maxPrice,
      filters.minRating,
      filters.inStock,
      filters.sort,
    ]
  );
}

export function useProductBySlug(slug: string) {
  const { source } = useDataSource();
  return useSourceData<Product | undefined>(
    () => getProductBySlug(source, slug),
    [source, slug]
  );
}

export function useCategories() {
  const { source } = useDataSource();
  return useSourceData<Category[]>(() => getCategories(source), [source]);
}

export function useFeatured(limit = 4) {
  const { source } = useDataSource();
  return useSourceData<Product[]>(
    () => getFeatured(source, limit),
    [source, limit]
  );
}

export interface CartLine {
  productId: string;
  quantity: number;
  product: Product;
}

/**
 * Resolves the cart against the catalog one id at a time.
 *
 * Looking items up individually matters: fetching the whole list and
 * filtering would silently drop any cart entry the list happens not to
 * contain — a real risk once the API paginates. Unresolvable ids are
 * reported separately so the UI can say something instead of quietly
 * shrinking the total.
 */
export function useCartLines(): {
  lines: CartLine[];
  missingIds: string[];
  subtotal: number;
  currency: string;
  loading: boolean;
  error: string | null;
} {
  const { source } = useDataSource();
  const { items, hydrated } = useCart();

  // A stable key so the effect re-runs on real cart changes, not identity.
  const key = items.map((i) => `${i.productId}:${i.quantity}`).join(",");

  const { data, loading, error } = useSourceData<(Product | undefined)[]>(
    () =>
      hydrated
        ? Promise.all(items.map((i) => getProductById(source, i.productId)))
        : Promise.resolve([]),
    [source, key, hydrated]
  );

  return useMemo(() => {
    const resolved = data ?? [];
    const lines: CartLine[] = [];
    const missingIds: string[] = [];

    items.forEach((item, index) => {
      const product = resolved[index];
      if (product) {
        lines.push({ ...item, product });
      } else if (!loading && hydrated) {
        missingIds.push(item.productId);
      }
    });

    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.product.price,
      0
    );

    // Mixed-currency carts cannot be summed without conversion rates, so
    // fall back to the first line's currency and treat that as the cart's.
    const currency = lines[0]?.product.currency ?? "EUR";

    return { lines, missingIds, subtotal, currency, loading, error };
  }, [data, items, loading, error, hydrated]);
}
