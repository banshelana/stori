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
 * Category facets are namespaced in the query string so a facet named
 * "sort" or "q" can never collide with a reserved parameter. Categories
 * come from the database, so their keys are not known at build time and
 * a namespace is the only safe guarantee.
 */
export const FACET_PREFIX = "f_";

export function facetParam(key: string): string {
  return `${FACET_PREFIX}${key}`;
}

/** Multi-select facets repeat the parameter: ?f_material=metal&f_material=glass */
export function readFacets(
  params: URLSearchParams
): Record<string, string[]> {
  const facets: Record<string, string[]> = {};
  for (const [name, value] of params.entries()) {
    if (!name.startsWith(FACET_PREFIX) || value === "") continue;
    const key = name.slice(FACET_PREFIX.length);
    (facets[key] ??= []).push(value);
  }
  return facets;
}

/**
 * Single parser for the catalog query string, shared by the grid and the
 * filter bar so the two can never disagree about what the URL means.
 */
export function useFilters(): SearchFilters {
  const params = useSearchParams();

  // A stable string key: URLSearchParams is a new object every render, so
  // memoising on it directly would defeat the point.
  const raw = params.toString();

  return useMemo(() => {
    const parsed = new URLSearchParams(raw);
    const num = (name: string) => {
      const value = parsed.get(name);
      if (!value) return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    };

    const sort = parsed.get("sort");
    const facets = readFacets(parsed);

    return {
      q: parsed.get("q") || undefined,
      category: parsed.get("category") || undefined,
      brand: parsed.get("brand") || undefined,
      minPrice: num("minPrice"),
      maxPrice: num("maxPrice"),
      minRating: num("minRating"),
      inStock: parsed.get("inStock") === "1" ? true : undefined,
      attributes: Object.keys(facets).length > 0 ? facets : undefined,
      sort: SORTS.includes(sort as never)
        ? (sort as SearchFilters["sort"])
        : undefined,
    };
  }, [raw]);
}
