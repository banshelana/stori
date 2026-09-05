// ---------------------------------------------------------------
// Date range filtering.
//
// Dates are stored and compared as Gregorian ISO strings (YYYY-MM-DD),
// which sort lexicographically — so `"2026-08-11" <= "2026-09-05"` is
// both correct and cheap, with no Date parsing and no timezone to get
// wrong. The Farsi UI shows Solar Hijri; the conversion happens in the
// date picker, and nothing below here knows a second calendar exists.
//
// Both ends are inclusive: an operator picking 1–31 August means the
// whole of August, including the 31st.
// ---------------------------------------------------------------

export interface DateRange {
  /** Gregorian YYYY-MM-DD, or "" for unbounded. */
  from: string;
  to: string;
}

export const EMPTY_RANGE: DateRange = { from: "", to: "" };

export function isEmptyRange(range: DateRange | undefined): boolean {
  return !range || (!range.from && !range.to);
}

/**
 * Whether a single date falls inside the range. An unbounded end matches
 * everything on that side, so picking only a `from` means "since".
 */
export function withinRange(
  value: string | null | undefined,
  range: DateRange | undefined
): boolean {
  if (isEmptyRange(range) || !range) return true;
  // A row with no date cannot be shown to be in the window, and quietly
  // including it would inflate any total drawn from the result.
  if (!value) return false;
  if (range.from && value < range.from) return false;
  if (range.to && value > range.to) return false;
  return true;
}

/**
 * Whether a record's own span overlaps the range.
 *
 * For rows that occupy a period rather than a moment — a coupon's
 * validity window, say. A null end means unbounded, which is how a
 * permanent coupon is stored, and a permanent coupon is valid during
 * every window anyone can ask about.
 */
export function rangeOverlaps(
  span: { startsAt: string | null; endsAt: string | null },
  range: DateRange | undefined
): boolean {
  if (isEmptyRange(range) || !range) return true;
  // Starts after the window closes.
  if (range.to && span.startsAt && span.startsAt > range.to) return false;
  // Ended before the window opened.
  if (range.from && span.endsAt && span.endsAt < range.from) return false;
  return true;
}

/**
 * Bounds for the pickers, so an operator cannot choose a "to" earlier
 * than the "from". Preventing the invalid pair beats explaining it: an
 * inverted range silently returns nothing, which reads as "no data".
 */
export function rangeBounds(range: DateRange) {
  return {
    fromMax: range.to || undefined,
    toMin: range.from || undefined,
  };
}

/** Human-readable range for a printed sheet's subtitle. */
export function describeRange(
  range: DateRange | undefined,
  format: (iso: string) => string,
  labels: { between: string; since: string; until: string }
): string | undefined {
  if (isEmptyRange(range) || !range) return undefined;
  if (range.from && range.to) {
    return `${labels.between} ${format(range.from)} – ${format(range.to)}`;
  }
  if (range.from) return `${labels.since} ${format(range.from)}`;
  return `${labels.until} ${format(range.to)}`;
}
