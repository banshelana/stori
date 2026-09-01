"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import type { Category, SearchFilters } from "@/lib/types";

const SORT_VALUES: NonNullable<SearchFilters["sort"]>[] = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "rating-desc",
];

export function FilterBar({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const activeCategory = searchParams.get("category") ?? "";
  const activeSort = searchParams.get("sort") ?? "featured";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label
          htmlFor="filter-q"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {t("common.search")}
        </label>
        <input
          id="filter-q"
          type="search"
          // Keyed by the active query so a Reset actually clears the box:
          // an uncontrolled input would otherwise keep the stale value.
          key={searchParams.get("q") ?? ""}
          defaultValue={searchParams.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update({ q: e.currentTarget.value.trim() || undefined });
            }
          }}
          placeholder={t("common.search")}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
        />
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("product.category")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => update({ category: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeCategory === ""
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t("common.all")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => update({ category: cat.slug })}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                activeCategory === cat.slug
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {localized(cat.name, locale)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex-1">
          <label
            htmlFor="filter-sort"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {t("product.sortBy")}
          </label>
          <select
            id="filter-sort"
            value={activeSort}
            onChange={(e) => update({ sort: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          >
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`product.sort.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => router.push(pathname, { scroll: false })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("common.reset")}
        </button>
      </div>
    </div>
  );
}
