import type { Coupon } from "@/lib/data/coupons";

// ---------------------------------------------------------------
// Coupon validation and arithmetic, kept pure.
//
// The reasons are returned as codes rather than sentences so the UI
// can translate them — a shopper who is told only "invalid code" will
// try the same code again.
// ---------------------------------------------------------------

export type CouponRejection =
  | "notFound"
  | "inactive"
  | "notStarted"
  | "expired"
  | "usedUp"
  | "belowMinimum";

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: CouponRejection; coupon?: Coupon; shortfall?: number };

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function findCoupon(coupons: Coupon[], code: string): Coupon | undefined {
  const target = normalizeCode(code);
  return coupons.find((c) => normalizeCode(c.code) === target);
}

/** Discount in minor units, never more than the subtotal itself. */
export function discountFor(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.kind === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;

  const capped =
    coupon.kind === "percent" && coupon.maxDiscount > 0
      ? Math.min(raw, coupon.maxDiscount)
      : raw;

  // A coupon must never make the basket negative or pay the customer.
  return Math.max(0, Math.min(capped, subtotal));
}

export function checkCoupon(
  coupons: Coupon[],
  code: string,
  subtotal: number,
  today = new Date().toISOString().slice(0, 10)
): CouponCheck {
  const coupon = findCoupon(coupons, code);
  if (!coupon) return { ok: false, reason: "notFound" };
  if (!coupon.active) return { ok: false, reason: "inactive", coupon };

  if (coupon.startsAt && today < coupon.startsAt) {
    return { ok: false, reason: "notStarted", coupon };
  }
  if (coupon.endsAt && today > coupon.endsAt) {
    return { ok: false, reason: "expired", coupon };
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "usedUp", coupon };
  }
  if (subtotal < coupon.minSubtotal) {
    // Telling the shopper how much short they are is far more useful
    // than telling them the code does not apply.
    return {
      ok: false,
      reason: "belowMinimum",
      coupon,
      shortfall: coupon.minSubtotal - subtotal,
    };
  }

  return { ok: true, coupon, discount: discountFor(coupon, subtotal) };
}

export function isRedeemable(coupon: Coupon, today = new Date().toISOString().slice(0, 10)): boolean {
  if (!coupon.active) return false;
  if (coupon.startsAt && today < coupon.startsAt) return false;
  if (coupon.endsAt && today > coupon.endsAt) return false;
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
}
