// ---------------------------------------------------------------
// SMS mechanics: encoding, segmentation, placeholders, recipients.
//
// Kept free of React so it can be tested directly — the counter a
// sender relies on to know what a message costs should not be a
// guess.
// ---------------------------------------------------------------

/**
 * GSM 03.38 default alphabet. Anything outside it forces the whole
 * message to UCS-2, which is why a single Persian character changes
 * the limit from 160 to 70.
 */
const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/** These exist in GSM-7 but cost two characters each. */
const GSM7_EXTENDED = "^{}\\[~]|€";

const GSM7_BASIC_SET = new Set(GSM7_BASIC);
const GSM7_EXTENDED_SET = new Set(GSM7_EXTENDED);

export type SmsEncoding = "GSM-7" | "UCS-2";

export const SEGMENT_LIMITS = {
  "GSM-7": { single: 160, concatenated: 153 },
  "UCS-2": { single: 70, concatenated: 67 },
} as const;

export function detectEncoding(text: string): SmsEncoding {
  for (const char of text) {
    if (!GSM7_BASIC_SET.has(char) && !GSM7_EXTENDED_SET.has(char)) {
      return "UCS-2";
    }
  }
  return "GSM-7";
}

/**
 * Billable length. In GSM-7 the extended characters occupy two slots;
 * in UCS-2 the unit is the UTF-16 code unit, so an emoji outside the
 * BMP counts as two.
 */
export function billableLength(text: string, encoding: SmsEncoding): number {
  if (encoding === "UCS-2") return text.length;

  let total = 0;
  for (const char of text) {
    total += GSM7_EXTENDED_SET.has(char) ? 2 : 1;
  }
  return total;
}

export interface SegmentInfo {
  encoding: SmsEncoding;
  length: number;
  segments: number;
  /** Characters left before another segment is started. */
  remaining: number;
  limit: number;
}

export function segmentInfo(text: string): SegmentInfo {
  const encoding = detectEncoding(text);
  const limits = SEGMENT_LIMITS[encoding];
  const length = billableLength(text, encoding);

  if (length === 0) {
    return {
      encoding,
      length: 0,
      segments: 0,
      remaining: limits.single,
      limit: limits.single,
    };
  }

  if (length <= limits.single) {
    return {
      encoding,
      length,
      segments: 1,
      remaining: limits.single - length,
      limit: limits.single,
    };
  }

  // Past one segment every part carries a concatenation header, so the
  // per-segment budget drops for the whole message, not just the tail.
  const segments = Math.ceil(length / limits.concatenated);
  return {
    encoding,
    length,
    segments,
    remaining: segments * limits.concatenated - length,
    limit: limits.concatenated,
  };
}

// ---------------------------------------------------------------
// Placeholders
// ---------------------------------------------------------------

/** Tokens a template may contain, resolved per recipient at send time. */
export const PLACEHOLDERS = ["firstName", "lastName", "fullName", "mobile"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

export interface PlaceholderValues {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  mobile?: string;
}

const TOKEN = /\{(\w+)\}/g;

/** Every placeholder used in a body, in order of first appearance. */
export function usedPlaceholders(body: string): string[] {
  const found: string[] = [];
  for (const match of body.matchAll(TOKEN)) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

/**
 * Substitutes what is known and leaves the rest untouched, so an
 * unresolved token is visible in the preview rather than silently
 * becoming an empty gap in a message that has already been sent.
 */
export function applyPlaceholders(
  body: string,
  values: PlaceholderValues
): string {
  return body.replace(TOKEN, (match, name: string) => {
    const value = values[name as Placeholder];
    return value !== undefined && value !== "" ? value : match;
  });
}

/** Placeholders in the body that this recipient cannot fill. */
export function unresolvedFor(
  body: string,
  values: PlaceholderValues
): string[] {
  return usedPlaceholders(body).filter((name) => {
    const value = values[name as Placeholder];
    return value === undefined || value === "";
  });
}

// ---------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toAscii(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persian = PERSIAN_DIGITS.indexOf(char);
    if (persian > -1) return String(persian);
    return String(ARABIC_DIGITS.indexOf(char));
  });
}

/** Digits only, with the country prefix reduced to a national 0-number. */
export function normalizeNumber(raw: string): string {
  let digits = toAscii(raw).replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length > 10) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("9")) digits = `0${digits}`;
  return digits;
}

export function isValidNumber(raw: string): boolean {
  return /^09\d{9}$/.test(normalizeNumber(raw));
}

export interface ParsedNumbers {
  valid: string[];
  invalid: string[];
}

/**
 * Splits a pasted blob into numbers, reporting the bad entries rather
 * than dropping them silently.
 *
 * A space is ambiguous: it separates two numbers in "0912… 0913…" but
 * groups digits within one in "0912 111 2233". So each comma/semicolon/
 * newline chunk is first tried whole, and only split on whitespace if
 * it is not a valid number by itself.
 */
export function parseNumbers(raw: string): ParsedNumbers {
  const valid: string[] = [];
  const invalid: string[] = [];

  function take(token: string) {
    const trimmed = token.trim();
    if (!trimmed) return;
    const normalized = normalizeNumber(trimmed);
    if (isValidNumber(normalized)) {
      if (!valid.includes(normalized)) valid.push(normalized);
    } else {
      invalid.push(trimmed);
    }
  }

  for (const chunk of raw.split(/[,;\n\r]+/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    // Whole chunk first — this is the "0912 111 2233" case.
    if (isValidNumber(normalizeNumber(trimmed))) {
      take(trimmed);
      continue;
    }

    // Otherwise treat whitespace as a separator.
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) take(trimmed);
    else parts.forEach(take);
  }

  return { valid, invalid };
}
