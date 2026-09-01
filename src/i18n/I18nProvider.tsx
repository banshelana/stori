"use client";

import { createContext, useContext, useMemo } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { dirOf, type Locale } from "@/i18n/config";
import { translate, type TranslateFn } from "@/i18n/translate";

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  t: TranslateFn;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * The dictionary is resolved on the server and handed down as a prop, so
 * client components read translations without shipping every locale's JSON.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const dir = dirOf(locale);
    return {
      locale,
      dir,
      isRtl: dir === "rtl",
      dict,
      t: (path, vars) => translate(dict, path, vars),
    };
  }, [locale, dict]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** Convenience hook for the common case of only needing `t`. */
export function useT(): TranslateFn {
  return useI18n().t;
}
