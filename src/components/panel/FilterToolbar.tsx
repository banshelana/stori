"use client";

import { DateField } from "@/components/form/DateField";
import { Icon } from "@/components/panel/Icon";
import type { Option } from "@/components/form/Field";
import { useI18n } from "@/i18n/I18nProvider";
import { rangeBounds, type DateRange } from "@/lib/dateRange";

export interface FilterDef {
  key: string;
  label: string;
  options: Option[];
}

/** Search box + dropdown filters + reset, shared by every admin section. */
export function FilterToolbar({
  q,
  onQ,
  filters,
  values,
  onFilter,
  onReset,
  hasActiveFilters,
  placeholder,
  range,
  onRange,
  rangeLabel,
}: {
  q: string;
  onQ: (value: string) => void;
  filters?: FilterDef[];
  values: Record<string, string | undefined>;
  onFilter: (key: string, value: string | undefined) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  placeholder?: string;
  /** Omit to leave the section without a date filter. */
  range?: DateRange;
  onRange?: (next: DateRange) => void;
  /** What the dates mean here — "Order date", "Sent", "Valid between". */
  rangeLabel?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-48 flex-1">
        <label
          htmlFor="resource-search"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {t("common.search")}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            id="resource-search"
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder={placeholder ?? t("common.search")}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pe-3 ps-9 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {filters?.map((filter) => (
        <div key={filter.key} className="min-w-40">
          <label
            htmlFor={`filter-${filter.key}`}
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {filter.label}
          </label>
          <select
            id={`filter-${filter.key}`}
            value={values[filter.key] ?? ""}
            onChange={(e) => onFilter(filter.key, e.target.value || undefined)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          >
            <option value="">{t("common.all")}</option>
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {range && onRange && (
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <DateField
            label={rangeLabel ? `${rangeLabel} — ${t("common.from")}` : t("common.from")}
            value={range.from}
            // Capping each field by the other means an inverted range
            // cannot be picked; an inverted range shows nothing, which
            // reads as "no data" rather than as a mistake.
            max={rangeBounds(range).fromMax}
            onChange={(from) => onRange({ ...range, from })}
            className="min-w-40"
          />
          <DateField
            label={t("common.to")}
            value={range.to}
            min={rangeBounds(range).toMin}
            onChange={(to) => onRange({ ...range, to })}
            className="min-w-40"
          />
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("common.reset")}
        </button>
      )}
    </div>
  );
}

/** The "New …" button that sits in each section's page header. */
export function NewButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
    >
      <Icon name="plus" className="h-4 w-4" />
      {label}
    </button>
  );
}
