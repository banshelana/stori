"use client";

import { useEffect, useState } from "react";
import {
  getCategories,
  getFeatured,
  getProductBySlug,
  listProducts,
} from "@/lib/data";
import { useDataSource } from "@/lib/data/source-context";
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
  return useSourceData<Product[]>(
    () => listProducts(source, filters),
    [source, filters.q, filters.category, filters.maxPrice, filters.minRating, filters.inStock, filters.sort]
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
  return useSourceData<Product[]>(() => getFeatured(source, limit), [source, limit]);
}
