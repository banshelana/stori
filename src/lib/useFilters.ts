"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { SearchFilters } from "@/lib/types";

const SORTS: NonNullable<SearchFilters["sort"]>[] = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "rating-desc",
];

/**
 * Single parser for the catalog query string, shared by the grid and the
 * filter bar so the two can never disagree about what the URL means.
 */
export function useFilters(): SearchFilters {
  const params = useSearchParams();

  const q = params.get("q") ?? undefined;
  const category = params.get("category") ?? undefined;
  const maxPrice = params.get("maxPrice");
  const minRating = params.get("minRating");
  const inStock = params.get("inStock");
  const sort = params.get("sort");

  return useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      inStock: inStock === "1" ? true : undefined,
      sort: SORTS.includes(sort as never)
        ? (sort as SearchFilters["sort"])
        : undefined,
    }),
    [q, category, maxPrice, minRating, inStock, sort]
  );
}
