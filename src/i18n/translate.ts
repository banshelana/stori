import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Dot-path lookup with {placeholder} interpolation.
 *
 * Returns the key itself when a path is missing, which makes an untranslated
 * string obvious in the UI instead of silently rendering as empty.
 */
export function translate(
  dict: Dictionary,
  path: string,
  vars?: Record<string, string | number>
): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined,
      dict
    );

  if (typeof value !== "string") {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] missing translation for "${path}"`);
    }
    return path;
  }

  if (!vars) return value;

  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

export type TranslateFn = (
  path: string,
  vars?: Record<string, string | number>
) => string;
