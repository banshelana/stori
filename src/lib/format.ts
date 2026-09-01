import { LOCALE_NUMBERING, LOCALE_TAG, type Locale } from "@/i18n/config";

// ---------------------------------------------------------------
// Every formatter takes an explicit Locale. Persian renders numerals
// in Eastern Arabic digits and dates on the Persian calendar, so the
// two locales differ by more than a translated string.
// ---------------------------------------------------------------

function intlTag(locale: Locale): string {
  return `${LOCALE_TAG[locale]}-u-nu-${LOCALE_NUMBERING[locale]}`;
}

export function formatPrice(
  cents: number,
  currency = "EUR",
  locale: Locale = "en"
): string {
  return new Intl.NumberFormat(intlTag(locale), {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatNumber(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(intlTag(locale)).format(value);
}

export function formatPercent(
  value: number,
  locale: Locale = "en",
  fractionDigits = 1
): string {
  return new Intl.NumberFormat(intlTag(locale), {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Persian dates use the Solar Hijri calendar, which Intl handles natively. */
export function formatDate(
  iso: string,
  locale: Locale = "en",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const tag =
    locale === "fa"
      ? `fa-IR-u-ca-persian-nu-${LOCALE_NUMBERING.fa}`
      : intlTag(locale);

  return new Intl.DateTimeFormat(tag, options).format(date);
}

export function formatDateTime(iso: string, locale: Locale = "en"): string {
  return formatDate(iso, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
