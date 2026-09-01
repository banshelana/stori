"use client";

import { LOCALE_LABEL } from "@/i18n/config";
import { useLocaleSwitcher } from "@/i18n/navigation";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, locales, switchTo } = useLocaleSwitcher();

  return (
    <div
      className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-sm font-medium shadow-sm"
      role="group"
      aria-label="Language"
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-pressed={locale === code}
          // The label renders in its own language, so pin the direction
          // per button rather than letting it inherit the page.
          dir={code === "fa" ? "rtl" : "ltr"}
          className={`rounded-full px-3 py-1 transition-colors ${
            locale === code
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {compact ? code.toUpperCase() : LOCALE_LABEL[code]}
        </button>
      ))}
    </div>
  );
}
