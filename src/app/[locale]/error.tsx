"use client";

import { useEffect } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";

/**
 * Segment error boundary.
 *
 * Deliberately self-contained: it reads the locale from the URL and holds
 * its own strings rather than calling useI18n. This page renders when
 * something below it has already thrown, and that something could be the
 * provider tree itself — an error screen that depends on context can
 * crash on the way to reporting a crash.
 */
const COPY: Record<Locale, Record<string, string>> = {
  en: {
    title: "Something went wrong",
    body: "This page failed to load. Trying again often clears it.",
    retry: "Try again",
    home: "Go to the homepage",
    reference: "Reference",
  },
  fa: {
    title: "مشکلی پیش آمد",
    body: "بارگذاری این صفحه ناموفق بود. معمولاً تلاش دوباره مشکل را برطرف می‌کند.",
    retry: "تلاش دوباره",
    home: "رفتن به صفحه اصلی",
    reference: "کد پیگیری",
  },
};

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const segment =
    typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "";
  const locale = (isLocale(segment) ? segment : DEFAULT_LOCALE) as Locale;
  const t = COPY[locale];

  useEffect(() => {
    // Stands in for the error reporter a production build would call.
    console.error("[segment error]", error);
  }, [error]);

  return (
    <main
      dir={locale === "fa" ? "rtl" : "ltr"}
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
        &#9888;
      </span>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
        {t.title}
      </h1>
      <p className="mt-2 leading-relaxed text-slate-500">{t.body}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          {t.retry}
        </button>
        <a
          href={`/${locale}`}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t.home}
        </a>
      </div>

      {/* The digest is what ties this screen to a server log line. */}
      {error.digest && (
        <p className="mt-6 text-xs text-slate-400">
          {t.reference}: <span className="force-ltr font-mono">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
