// ---------------------------------------------------------------
// Shared field validation. Kept free of translation strings — each
// helper answers true/false and the caller picks the message, so the
// same rule serves both locales.
// ---------------------------------------------------------------

/** Persian digits (۰-۹) and Arabic-Indic (٠-٩) map onto ASCII. */
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/**
 * Users on a Persian keyboard type Persian numerals, which would fail a
 * naive /\d/ test. Fold them to ASCII before any numeric validation.
 */
export function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persian = PERSIAN_DIGITS.indexOf(char);
    if (persian > -1) return String(persian);
    return String(ARABIC_DIGITS.indexOf(char));
  });
}

export function normalizeMobile(value: string): string {
  return toAsciiDigits(value).replace(/\D/g, "");
}

/**
 * Accepts Iranian mobile numbers in their common shapes:
 * 09xxxxxxxxx, 9xxxxxxxxx, +989xxxxxxxxx, 00989xxxxxxxxx
 */
export function validateMobile(value: string): boolean {
  const digits = normalizeMobile(value);
  return (
    /^09\d{9}$/.test(digits) ||
    /^9\d{9}$/.test(digits) ||
    /^989\d{9}$/.test(digits) ||
    /^00989\d{9}$/.test(digits)
  );
}

export function validateEmail(value: string): boolean {
  if (!value) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Iranian postal codes are exactly 10 digits. */
export function validatePostalCode(value: string): boolean {
  if (!value) return true;
  return /^\d{10}$/.test(normalizeMobile(value));
}

export function validateAge(value: string | number | undefined): boolean {
  if (value === undefined || value === "") return true;
  const age = Number(toAsciiDigits(String(value)));
  return Number.isInteger(age) && age >= 1 && age <= 120;
}

export function validateRequired(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function validateMinLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}
