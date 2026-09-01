import type { PriceAdjustment, Product } from "@/lib/types";

// ---------------------------------------------------------------
// Price adjustments: offsets, discounts and tax.
//
// ORDER OF OPERATIONS — this is the part that has to be right:
//
//     base
//   + offsets      (signed: a surcharge or a correction down)
//   − discounts    (capped so the running total never goes negative)
//   + tax          (computed on the POST-discount amount)
//   = total
//
// Tax on the post-discount amount is the near-universal retail rule:
// you are taxed on what you actually pay, not on the list price.
//
// PERCENTS stack additively within a stage, not compounding. Each
// percent applies to the subtotal *entering* that stage, so two 10%
// discounts take 20% off, not 19%. Compounding surprises people who
// stack a sale on a coupon.
//
// ROUNDING happens per adjustment, in integer minor units, so the
// breakdown lines always add up to the total exactly.
// ---------------------------------------------------------------

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  // Deliberately local, not UTC: an adjustment ending "today" should stay
  // live through the merchant's working day, not expire at UTC midnight.
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Whether an adjustment applies on a given date.
 *
 * Both bounds are inclusive, and a null bound means unbounded — so an
 * adjustment with no dates at all is permanent until an admin disables
 * or deletes it. Dates are compared as YYYY-MM-DD strings, which sorts
 * correctly and sidesteps timezone arithmetic entirely.
 */
export function isInEffect(
  adjustment: PriceAdjustment,
  on: string = todayISO()
): boolean {
  if (!adjustment.active) return false;
  if (adjustment.startsAt && on < adjustment.startsAt) return false;
  if (adjustment.endsAt && on > adjustment.endsAt) return false;
  return true;
}

/** Adjustments in effect on `on`, in application order. */
export function activeAdjustments(
  product: Product,
  on: string = todayISO()
): PriceAdjustment[] {
  const applicable = (product.adjustments ?? []).filter((a) =>
    isInEffect(a, on)
  );
  const order = { offset: 0, discount: 1, tax: 2 } as const;
  return [...applicable].sort((a, b) => order[a.kind] - order[b.kind]);
}

export interface AdjustmentLine {
  adjustment: PriceAdjustment;
  /** Signed contribution to the total, in minor units. */
  effect: number;
}

export interface PriceBreakdown {
  base: number;
  offsetTotal: number;
  discountTotal: number;
  taxTotal: number;
  /** After offsets and discounts, before tax. */
  netBeforeTax: number;
  total: number;
  lines: AdjustmentLine[];
  hasAdjustments: boolean;
}

function amountFor(
  adjustment: PriceAdjustment,
  basis: number
): number {
  return adjustment.mode === "percent"
    ? Math.round((basis * adjustment.value) / 100)
    : Math.round(adjustment.value);
}

export function priceBreakdown(
  product: Product,
  on: string = todayISO()
): PriceBreakdown {
  const base = product.price;
  const applicable = activeAdjustments(product, on);
  const lines: AdjustmentLine[] = [];

  // --- offsets: percent of the base price ---------------------
  let offsetTotal = 0;
  for (const adjustment of applicable.filter((a) => a.kind === "offset")) {
    const effect = amountFor(adjustment, base);
    offsetTotal += effect;
    lines.push({ adjustment, effect });
  }

  const afterOffsets = Math.max(0, base + offsetTotal);

  // --- discounts: percent of the offset-adjusted subtotal ------
  let discountTotal = 0;
  for (const adjustment of applicable.filter((a) => a.kind === "discount")) {
    const raw = Math.abs(amountFor(adjustment, afterOffsets));
    // Cap against what is left, so stacked discounts cannot drive the
    // price below zero or turn into a refund.
    const effect = Math.min(raw, afterOffsets - discountTotal);
    discountTotal += effect;
    lines.push({ adjustment, effect: -effect });
  }

  const netBeforeTax = Math.max(0, afterOffsets - discountTotal);

  // --- tax: percent of the post-discount amount ---------------
  let taxTotal = 0;
  for (const adjustment of applicable.filter((a) => a.kind === "tax")) {
    const effect = Math.abs(amountFor(adjustment, netBeforeTax));
    taxTotal += effect;
    lines.push({ adjustment, effect });
  }

  return {
    base,
    offsetTotal,
    discountTotal,
    taxTotal,
    netBeforeTax,
    total: Math.max(0, netBeforeTax + taxTotal),
    lines,
    hasAdjustments: applicable.length > 0,
  };
}

/** What the customer pays for one unit. */
export function effectivePrice(
  product: Product,
  on: string = todayISO()
): number {
  return priceBreakdown(product, on).total;
}

/**
 * The price to show struck through, or null when there is nothing to
 * strike. Prefers a real reduction from adjustments over the static
 * compareAtPrice, so a live sale is never hidden behind a stale one.
 */
export function strikeThroughPrice(
  product: Product,
  on: string = todayISO()
): number | null {
  const total = effectivePrice(product, on);
  if (total < product.price) return product.price;
  if (product.compareAtPrice != null && product.compareAtPrice > total) {
    return product.compareAtPrice;
  }
  return null;
}

export function isDiscounted(
  product: Product,
  on: string = todayISO()
): boolean {
  return strikeThroughPrice(product, on) !== null;
}

/** Human-readable summary of one adjustment, e.g. "-15%" or "+€2.00". */
export function adjustmentSign(adjustment: PriceAdjustment): "+" | "-" {
  if (adjustment.kind === "discount") return "-";
  if (adjustment.kind === "offset" && adjustment.value < 0) return "-";
  return "+";
}
