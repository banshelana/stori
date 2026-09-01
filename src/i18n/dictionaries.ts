import "server-only";
import type { Locale } from "@/i18n/config";
import en from "@/i18n/dictionaries/en.json";

// The English dictionary is the source of truth for the shape; every
// other locale must satisfy the same type, so a missing key is a build
// error rather than a blank string in production.
export type Dictionary = typeof en;

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => (await import("@/i18n/dictionaries/en.json")).default,
  fa: async () => (await import("@/i18n/dictionaries/fa.json")).default as Dictionary,
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
