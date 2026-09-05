"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Identifiable,
  ListResult,
  Repository,
} from "@/lib/data/repository";
import { EMPTY_RANGE, isEmptyRange, type DateRange } from "@/lib/dateRange";

/**
 * Owns the search / filter / sort / page state for one admin section and
 * keeps it in sync with the repository.
 *
 * Every section shares this, so pagination resetting on a new search, the
 * debounce, and refetching after a mutation are all solved once.
 */
export function useResourceList<T extends Identifiable>(
  repo: Repository<T>,
  {
    pageSize = 10,
    initialSortKey,
    initialSortDir = "asc",
    initialFilters = {},
    rangeField,
  }: {
    pageSize?: number;
    initialSortKey?: string;
    initialSortDir?: "asc" | "desc";
    initialFilters?: Record<string, string | undefined>;
    /**
     * Column the date-range filter applies to. Omit and the section has
     * no range filter — the toolbar only renders one when asked to.
     */
    rangeField?: string;
  } = {}
) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [range, setRangeState] = useState<DateRange>(EMPTY_RANGE);
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<ListResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  // A narrowed result set makes the current page meaningless.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPage(1);
  }, [debouncedQ, filters, sortKey, sortDir, range]);

  const filterKey = JSON.stringify(filters);
  const rangeKey = `${rangeField ?? ""}|${range.from}|${range.to}`;
  const rangeQuery =
    rangeField && !isEmptyRange(range)
      ? { field: rangeField, from: range.from, to: range.to }
      : undefined;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    repo
      .list({
        q: debouncedQ,
        filters,
        range: rangeQuery,
        sortKey,
        sortDir,
        page,
        pageSize,
      })
      .then((data) => {
        if (!active) return;
        setResult(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "error");
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // filterKey and rangeKey stand in for `filters` and `range`, whose
    // identities change every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    repo,
    debouncedQ,
    filterKey,
    rangeKey,
    sortKey,
    sortDir,
    page,
    pageSize,
    reloadToken,
  ]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const toggleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }, []);

  const setRange = useCallback((next: DateRange) => setRangeState(next), []);

  const reset = useCallback(() => {
    setQ("");
    setFilters(initialFilters);
    setRangeState(EMPTY_RANGE);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(q) ||
      Object.values(filters).some(Boolean) ||
      !isEmptyRange(range),
    [q, filters, range]
  );

  return {
    rows: result?.rows ?? [],
    total: result?.total ?? 0,
    page: result?.page ?? 1,
    pageCount: result?.pageCount ?? 1,
    loading,
    error,
    q,
    setQ,
    filters,
    setFilter,
    range,
    setRange,
    rangeField,
    sortKey,
    sortDir,
    toggleSort,
    setPage,
    reset,
    reload,
    hasActiveFilters,
  };
}
