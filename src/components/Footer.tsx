"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";

export function Footer() {
  const { t, locale } = useI18n();
  const href = useLocaleHref();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row">
        <p>
          &copy; {formatNumber(new Date().getFullYear(), locale)}{" "}
          {t("common.appName")}
        </p>
        <div className="flex items-center gap-4">
          <Link
            href={href("/contact")}
            className="link-underline font-medium text-slate-600"
          >
            {t("contact.title")}
          </Link>
          <p className="text-slate-400">Next.js &middot; Tailwind CSS</p>
        </div>
      </div>
    </footer>
  );
}
