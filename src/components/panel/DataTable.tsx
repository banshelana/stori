"use client";

import { Icon } from "@/components/panel/Icon";
import { Card, EmptyState, TableSkeleton } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber } from "@/lib/format";

export interface Column<T> {
  key: string;
  /** Already-translated header text. */
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "start" | "end";
  /** Hidden below the sm breakpoint to keep phone tables readable. */
  hideOnMobile?: boolean;
  sortable?: boolean;
}

export interface RowAction<T> {
  icon: string;
  label: string;
  onClick: (row: T) => void;
  tone?: "default" | "danger";
  /** Hide the action for rows it doesn't apply to. */
  visible?: (row: T) => boolean;
}

/**
 * The one table every admin section renders.
 *
 * Sorting and paging are controlled by the caller (see useResourceList),
 * so the table stays a pure view and each section keeps its state in the
 * one place that also owns fetching.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  actions,
  sortKey,
  sortDir,
  onSort,
  emptyTitle,
  emptyHint,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  actions?: RowAction<T>[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const { t } = useI18n();

  if (loading) return <TableSkeleton />;

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? t("common.noResults")}
        hint={emptyHint ?? t("common.noResultsHint")}
      />
    );
  }

  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-5 py-3 font-semibold ${
                      col.align === "end" ? "text-end" : "text-start"
                    } ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                    aria-sort={
                      active
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800 ${
                          active ? "text-indigo-600" : ""
                        }`}
                      >
                        {col.header}
                        <span aria-hidden className="text-[10px]">
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {actions && actions.length > 0 && (
                <th scope="col" className="px-5 py-3 text-end font-semibold">
                  {t("common.actions")}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3 ${
                      col.align === "end" ? "text-end" : "text-start"
                    } ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}

                {actions && actions.length > 0 && (
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {actions
                        .filter((a) => a.visible?.(row) ?? true)
                        .map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => action.onClick(row)}
                            title={action.label}
                            aria-label={action.label}
                            className={`rounded-lg p-2 transition-colors ${
                              action.tone === "danger"
                                ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            }`}
                          >
                            <Icon name={action.icon} className="h-4 w-4" />
                          </button>
                        ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { t, locale } = useI18n();
  if (pageCount <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">
        {t("common.showing")} {formatNumber(page, locale)} {t("common.of")}{" "}
        {formatNumber(pageCount, locale)} &middot; {formatNumber(total, locale)}
      </p>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("common.previous")}
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}
