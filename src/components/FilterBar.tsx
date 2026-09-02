"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/panel/Icon";
import { PriceRange } from "@/components/PriceRange";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { formatRange, parseRange } from "@/lib/attributes";
import type {
  Brand,
  Category,
  FilterSpec,
  SearchFilters,
} from "@/lib/types";
import { useSearchInput } from "@/lib/useDebouncedValue";
import { facetParam, readFacets } from "@/lib/useFilters";

const SORT_VALUES: NonNullable<SearchFilters["sort"]>[] = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "rating-desc",
];

const RATINGS = [4, 3, 2];

/** Params owned by the filter bar, so Reset knows exactly what to clear. */
const OWNED_PARAMS = [
  "q",
  "category",
  "brand",
  "minPrice",
  "maxPrice",
  "minRating",
  "inStock",
];

export function FilterBar({
  categories,
  brands,
  priceBounds,
  currency,
}: {
  categories: Category[];
  brands: Brand[];
  /** Catalog-wide price extent, in minor units. */
  priceBounds: { min: number; max: number };
  currency: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();

  const raw = searchParams.toString();

  const update = useCallback(
    (
      mutate: (params: URLSearchParams) => void,
      { replace = false }: { replace?: boolean } = {}
    ) => {
      const params = new URLSearchParams(raw);
      mutate(params);
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      // Typing and dragging replace rather than push, so a search doesn't
      // bury the previous page under one history entry per interaction.
      const navigate = replace ? router.replace : router.push;
      navigate(href, { scroll: false });
    },
    [router, pathname, raw]
  );

  const setParam = useCallback(
    (key: string, value: string | undefined, replace = false) => {
      update((params) => {
        if (!value) params.delete(key);
        else params.set(key, value);
      }, { replace });
    },
    [update]
  );

  // ---------------------------------------------------------- search
  const urlQuery = searchParams.get("q") ?? "";
  const search = useSearchInput(urlQuery);

  useEffect(() => {
    search.sync(urlQuery);
  }, [urlQuery, search]);

  const lastPushed = useRef(urlQuery);
  useEffect(() => {
    const next = search.debounced.trim();
    if (next === lastPushed.current) return;
    lastPushed.current = next;
    search.commit(next);
    setParam("q", next || undefined, true);
  }, [search.debounced, search, setParam]);

  // -------------------------------------------------------- selection
  const activeCategorySlug = searchParams.get("category") ?? "";
  const activeCategory = categories.find((c) => c.slug === activeCategorySlug);
  const activeSort = searchParams.get("sort") ?? "featured";
  const activeBrand = searchParams.get("brand") ?? "";
  const inStockOnly = searchParams.get("inStock") === "1";
  const activeRating = searchParams.get("minRating") ?? "";

  const facets = useMemo(() => readFacets(new URLSearchParams(raw)), [raw]);

  const priceValue: [number, number] = [
    Number(searchParams.get("minPrice") ?? priceBounds.min),
    Number(searchParams.get("maxPrice") ?? priceBounds.max),
  ];

  const activeCount =
    (search.value ? 1 : 0) +
    (activeCategorySlug ? 1 : 0) +
    (activeBrand ? 1 : 0) +
    (activeRating ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (searchParams.has("minPrice") || searchParams.has("maxPrice") ? 1 : 0) +
    Object.values(facets).reduce((n, values) => n + values.length, 0);

  function reset() {
    update((params) => {
      for (const key of OWNED_PARAMS) params.delete(key);
      // Facet keys are not known ahead of time, so clear by prefix.
      for (const key of [...params.keys()]) {
        if (key.startsWith("f_")) params.delete(key);
      }
    });
  }

  /**
   * Switching category drops the previous category's facets — they
   * address attributes the new category does not declare, and leaving
   * them in the URL would silently return nothing.
   */
  function selectCategory(slug: string | undefined) {
    update((params) => {
      for (const key of [...params.keys()]) {
        if (key.startsWith("f_")) params.delete(key);
      }
      if (slug) params.set("category", slug);
      else params.delete("category");
    });
  }

  function toggleFacet(key: string, value: string, on: boolean) {
    update((params) => {
      const name = facetParam(key);
      const current = params.getAll(name).filter((v) => v !== value);
      params.delete(name);
      for (const v of current) params.append(name, v);
      if (on) params.append(name, value);
    });
  }

  function setFacetSingle(key: string, value: string | undefined) {
    update((params) => {
      const name = facetParam(key);
      params.delete(name);
      if (value) params.set(name, value);
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Icon name="filter" className="h-4 w-4 text-slate-400" />
          {t("product.filters")}
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {t("product.clearFilters")}
          </button>
        )}
      </div>

      {/* ------------------------------------------------- search */}
      <div>
        <label
          htmlFor="filter-q"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {t("common.search")}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            id="filter-q"
            type="search"
            value={search.value}
            onChange={(e) => search.setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setParam("q", e.currentTarget.value.trim() || undefined, true);
              }
            }}
            placeholder={t("common.search")}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pe-8 ps-9 text-sm outline-none transition-colors focus:border-indigo-500 focus:bg-white"
          />
          {search.value && (
            <button
              type="button"
              onClick={() => search.setValue("")}
              aria-label={t("common.reset")}
              className="absolute inset-y-0 end-0 flex items-center pe-2.5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------- category */}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("product.category")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={activeCategorySlug === ""}
            onClick={() => selectCategory(undefined)}
          >
            {t("common.all")}
          </Chip>
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              active={activeCategorySlug === cat.slug}
              onClick={() => selectCategory(cat.slug)}
            >
              {localized(cat.name, locale)}
            </Chip>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------- brand */}
      <div>
        <label
          htmlFor="filter-brand"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {t("product.brand")}
        </label>
        <select
          id="filter-brand"
          value={activeBrand}
          onChange={(e) => setParam("brand", e.target.value || undefined)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
        >
          <option value="">{t("common.all")}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {/* -------------------------------------------------- price */}
      {priceBounds.max > priceBounds.min && (
        <PriceRange
          min={priceBounds.min}
          max={priceBounds.max}
          value={priceValue}
          currency={currency}
          onChange={([low, high]) =>
            update((params) => {
              // Only record a bound when it actually narrows the range,
              // so a untouched slider leaves the URL clean.
              if (low > priceBounds.min) params.set("minPrice", String(low));
              else params.delete("minPrice");
              if (high < priceBounds.max) params.set("maxPrice", String(high));
              else params.delete("maxPrice");
            }, { replace: true })
          }
        />
      )}

      {/* ------------------------------------------------- rating */}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("product.minRating")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={activeRating === ""}
            onClick={() => setParam("minRating", undefined)}
          >
            {t("common.all")}
          </Chip>
          {RATINGS.map((n) => (
            <Chip
              key={n}
              active={activeRating === String(n)}
              onClick={() => setParam("minRating", String(n))}
            >
              {"★".repeat(n)}
              <span className="ms-0.5">+</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------- stock */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setParam("inStock", e.target.checked ? "1" : undefined)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        {t("product.inStockOnly")}
      </label>

      {/* ----------------------------------- category-specific facets */}
      {activeCategory && activeCategory.filters.length > 0 && (
        <div className="space-y-5 border-t border-slate-200 pt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {localized(activeCategory.name, locale)}
          </p>

          {activeCategory.filters.map((spec) => (
            <Facet
              key={spec.key}
              spec={spec}
              selected={facets[spec.key] ?? []}
              onToggle={toggleFacet}
              onSet={setFacetSingle}
            />
          ))}
        </div>
      )}

      {/* --------------------------------------------------- sort */}
      <div className="border-t border-slate-200 pt-5">
        <label
          htmlFor="filter-sort"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {t("product.sortBy")}
        </label>
        <select
          id="filter-sort"
          value={activeSort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
        >
          {SORT_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`product.sort.${value}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Renders one FilterSpec. The switch is the only place kinds are known. */
function Facet({
  spec,
  selected,
  onToggle,
  onSet,
}: {
  spec: FilterSpec;
  selected: string[];
  onToggle: (key: string, value: string, on: boolean) => void;
  onSet: (key: string, value: string | undefined) => void;
}) {
  const { t, locale } = useI18n();
  const label = localized(spec.label, locale);

  if (spec.kind === "boolean") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={selected.includes("true")}
          onChange={(e) => onSet(spec.key, e.target.checked ? "true" : undefined)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        {label}
      </label>
    );
  }

  if (spec.kind === "range") {
    const { min: selMin, max: selMax } = parseRange(selected[0] ?? "");
    const min = spec.min ?? 0;
    const max = spec.max ?? 100;
    const current = selMax ?? max;

    return (
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </span>
          <span className="text-xs font-medium text-slate-700">
            {current}
            {spec.unit ? ` ${spec.unit}` : ""}
            {current < max ? "" : "+"}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={spec.step ?? 1}
          value={current}
          aria-label={label}
          onChange={(e) => {
            const value = Number(e.target.value);
            onSet(
              spec.key,
              value >= max ? undefined : formatRange(selMin, value)
            );
          }}
          className="w-full accent-indigo-600"
        />
      </div>
    );
  }

  // select | multi — both render as chips; multi allows several at once.
  const multiple = spec.kind === "multi";

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {!multiple && (
          <Chip active={selected.length === 0} onClick={() => onSet(spec.key, undefined)}>
            {t("common.all")}
          </Chip>
        )}
        {(spec.options ?? []).map((option) => {
          const active = selected.includes(option.value);
          return (
            <Chip
              key={option.value}
              active={active}
              onClick={() =>
                multiple
                  ? onToggle(spec.key, option.value, !active)
                  : onSet(spec.key, active ? undefined : option.value)
              }
            >
              {localized(option.label, locale)}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
