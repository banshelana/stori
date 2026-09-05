"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { formatDate } from "@/lib/format";
import { useSettings } from "@/lib/settings-context";

/**
 * Sends one region of the page to the printer, which is where "Save as
 * PDF" lives. See src/lib/printing.ts for why this beats a JS PDF
 * library on a bilingual site.
 *
 * The filename comes from `document.title` — that is the only handle a
 * page has on what the browser calls the saved file — so it is swapped
 * for the duration of the print and put back afterwards.
 */
export function usePrint() {
  return useCallback((filename: string) => {
    const previous = document.title;
    document.title = filename;

    // Belt and braces: window.print() blocks until the dialog closes in
    // every current browser, but afterprint is the documented signal and
    // costs nothing to also listen for.
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);

    window.print();
    restore();
  }, []);
}

/**
 * Runs a print over rows fetched on demand.
 *
 * A printed list has to carry every row matching the current filters,
 * not the page the operator happens to be looking at — so the rows are
 * fetched when the button is pressed, rendered, printed, and dropped.
 *
 * The print fires from a plain effect rather than requestAnimationFrame:
 * rAF is throttled to nothing in a background tab, which would leave the
 * dialog unopened and the sheet mounted forever.
 */
export function usePrintRows<T>(
  fetchAll: () => Promise<T[]>,
  filename: () => string
) {
  const [rows, setRows] = useState<T[] | null>(null);
  const print = usePrint();

  // Refs, so the effect always calls the current closures without
  // re-running every time the parent re-renders.
  const latest = useRef({ fetchAll, filename });
  latest.current = { fetchAll, filename };

  useEffect(() => {
    if (!rows) return;
    print(latest.current.filename());
    setRows(null);
  }, [rows, print]);

  return {
    rows,
    start: async () => setRows(await latest.current.fetchAll()),
  };
}

/** The button that starts a print, hidden from the print itself. */
export function PrintButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onClick}
      className="print-hide flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <Icon name="box" className="h-4 w-4" />
      {label ?? t("print.export")}
    </button>
  );
}

/**
 * The letterhead on a printed sheet: who produced it, what it is, and
 * when. Absent from the screen, where all three are already obvious from
 * the chrome around the page.
 */
export function PrintHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();

  return (
    <header className="print-only print-block mb-5 border-b-2 border-slate-900 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-bold text-slate-900">
            {localized(settings.storeName, locale)}
          </p>
          <h1 className="mt-0.5 text-base font-semibold text-slate-700">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        <p className="shrink-0 text-xs text-slate-500">
          {t("print.generatedOn", {
            date: formatDate(new Date().toISOString(), locale),
          })}
        </p>
      </div>
    </header>
  );
}

/**
 * The closing line of a printed sheet — support contact, so whoever ends
 * up holding the paper knows where to ask.
 */
export function PrintFooter() {
  const { t } = useI18n();
  const { settings } = useSettings();

  return (
    <footer className="print-only print-block mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">
      {t("print.contact", {
        email: settings.supportEmail,
        phone: settings.supportPhone,
      })}
    </footer>
  );
}

/**
 * A column of a printed table. Deliberately not the on-screen
 * `Column<T>`: that one hides columns on narrow viewports and carries an
 * actions column, neither of which means anything on paper.
 */
export interface PrintColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "start" | "end";
}

/** The tabular half of the export, shared by every list that prints. */
export function PrintTable<T>({
  columns,
  rows,
  rowKey,
  footer,
}: {
  columns: PrintColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Extra `<tr>`s for the foot — totals, subtotals. */
  footer?: React.ReactNode;
}) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b-2 border-slate-900">
          {columns.map((column, i) => (
            <th
              key={i}
              className={`px-1.5 py-1.5 font-semibold text-slate-900 ${
                column.align === "end" ? "text-end" : "text-start"
              }`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} className="border-b border-slate-200">
            {columns.map((column, i) => (
              <PrintCell key={i} align={column.align}>
                {column.render(row)}
              </PrintCell>
            ))}
          </tr>
        ))}
      </tbody>

      {footer && <tfoot>{footer}</tfoot>}
    </table>
  );
}

export function PrintCell({
  children,
  align = "start",
}: {
  children?: React.ReactNode;
  align?: "start" | "end";
}) {
  return (
    <td
      className={`px-1.5 py-1.5 align-top text-slate-700 ${
        align === "end" ? "text-end" : "text-start"
      }`}
    >
      {children}
    </td>
  );
}
