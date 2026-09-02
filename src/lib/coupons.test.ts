import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkCoupon,
  discountFor,
  findCoupon,
  isRedeemable,
  normalizeCode,
} from "@/lib/coupons";
import type { Coupon } from "@/lib/data/coupons";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "c",
    code: "SAVE",
    kind: "percent",
    value: 10,
    minSubtotal: 0,
    maxDiscount: 0,
    startsAt: null,
    endsAt: null,
    usageLimit: 0,
    usedCount: 0,
    active: true,
    ...overrides,
  };
}

describe("code matching", () => {
  it("is case and whitespace insensitive", () => {
    assert.equal(normalizeCode("  save10 "), "SAVE10");
    const list = [coupon({ code: "SAVE10" })];
    assert.ok(findCoupon(list, "save10"));
    assert.ok(findCoupon(list, " Save10 "));
  });
});

describe("discount arithmetic", () => {
  it("takes a percentage of the subtotal", () => {
    assert.equal(discountFor(coupon({ value: 10 }), 10_000), 1_000);
  });

  it("takes a flat amount", () => {
    assert.equal(discountFor(coupon({ kind: "amount", value: 750 }), 10_000), 750);
  });

  it("respects the cap on a percentage", () => {
    assert.equal(
      discountFor(coupon({ value: 50, maxDiscount: 2_000 }), 10_000),
      2_000
    );
  });

  it("ignores the cap when it is zero", () => {
    assert.equal(
      discountFor(coupon({ value: 50, maxDiscount: 0 }), 10_000),
      5_000
    );
  });

  it("never exceeds the subtotal", () => {
    // A 900-unit code against a 500-unit basket must not pay the customer.
    assert.equal(discountFor(coupon({ kind: "amount", value: 900 }), 500), 500);
  });

  it("rounds to whole minor units", () => {
    assert.equal(discountFor(coupon({ value: 33 }), 1_001), 330);
  });
});

describe("validation", () => {
  const today = "2026-07-15";

  it("accepts a live code", () => {
    const result = checkCoupon([coupon()], "SAVE", 10_000, today);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.discount, 1_000);
  });

  it("rejects an unknown code", () => {
    const result = checkCoupon([coupon()], "NOPE", 10_000, today);
    assert.deepEqual(result, { ok: false, reason: "notFound" });
  });

  it("rejects a disabled code", () => {
    const result = checkCoupon([coupon({ active: false })], "SAVE", 1, today);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "inactive");
  });

  it("respects the start and end dates inclusively", () => {
    const c = coupon({ startsAt: "2026-07-15", endsAt: "2026-07-15" });
    assert.equal(checkCoupon([c], "SAVE", 100, "2026-07-15").ok, true);
    assert.equal(checkCoupon([c], "SAVE", 100, "2026-07-14").ok, false);
    assert.equal(checkCoupon([c], "SAVE", 100, "2026-07-16").ok, false);
  });

  it("rejects once the usage limit is reached", () => {
    const result = checkCoupon(
      [coupon({ usageLimit: 5, usedCount: 5 })],
      "SAVE",
      100,
      today
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "usedUp");
  });

  it("treats a zero usage limit as unlimited", () => {
    assert.equal(
      checkCoupon([coupon({ usageLimit: 0, usedCount: 9999 })], "SAVE", 100, today).ok,
      true
    );
  });

  it("reports how far short of the minimum the basket is", () => {
    const result = checkCoupon(
      [coupon({ minSubtotal: 10_000 })],
      "SAVE",
      7_500,
      today
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "belowMinimum");
      assert.equal(result.shortfall, 2_500);
    }
  });

  it("treats the minimum as inclusive", () => {
    assert.equal(
      checkCoupon([coupon({ minSubtotal: 10_000 })], "SAVE", 10_000, today).ok,
      true
    );
  });
});

describe("isRedeemable", () => {
  it("mirrors the validation rules that do not depend on the basket", () => {
    assert.equal(isRedeemable(coupon(), "2026-07-15"), true);
    assert.equal(isRedeemable(coupon({ active: false }), "2026-07-15"), false);
    assert.equal(isRedeemable(coupon({ endsAt: "2026-01-01" }), "2026-07-15"), false);
    assert.equal(
      isRedeemable(coupon({ usageLimit: 1, usedCount: 1 }), "2026-07-15"),
      false
    );
  });
});
