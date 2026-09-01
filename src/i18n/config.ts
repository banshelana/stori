export const LOCALES = ["en", "fa"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Text direction per locale — drives the <html dir> attribute. */
export const LOCALE_DIR: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  fa: "rtl",
};

/** Native label shown in the language switcher. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  fa: "فارسی",
};

/**
 * Digit system per locale. Persian UIs conventionally render numerals in
 * Eastern Arabic digits; formatters read this instead of hard-coding a locale.
 */
export const LOCALE_NUMBERING: Record<Locale, string> = {
  en: "latn",
  fa: "arabext",
};

/** BCP-47 tag handed to Intl.* APIs. */
export const LOCALE_TAG: Record<Locale, string> = {
  en: "en-US",
  fa: "fa-IR",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return LOCALE_DIR[locale];
}
