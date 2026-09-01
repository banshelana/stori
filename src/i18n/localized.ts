import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

/**
 * Catalog content that exists in every supported language.
 *
 * A real backend returns content already resolved for the requested
 * language (the axios client sends Accept-Language for exactly this).
 * The mock source has no server to do that, so it carries every
 * translation and resolves at render time.
 */
export type LocalizedText = Record<Locale, string>;

export function localized(text: LocalizedText, locale: Locale): string {
  return text[locale] || text[DEFAULT_LOCALE];
}

/** Every translation of a value, for search that should match either language. */
export function allTranslations(text: LocalizedText): string[] {
  return Object.values(text);
}
