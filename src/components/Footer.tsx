"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber } from "@/lib/format";

export function Footer() {
  const { t, locale } = useI18n();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row">
        <p>
          &copy; {formatNumber(new Date().getFullYear(), locale)}{" "}
          {t("common.appName")}
        </p>
        <p className="text-slate-400">Next.js &middot; App Router &middot; Tailwind CSS</p>
      </div>
    </footer>
  );
}
