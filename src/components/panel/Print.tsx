"use client";

import { useCallback } from "react";
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
