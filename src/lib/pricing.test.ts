import assert from "node:assert/strict";
import { test } from "node:test";
import {
  effectivePrice,
  isInEffect,
  priceBreakdown,
  strikeThroughPrice,
} from "./pricing.ts";
import type {
  PriceAdjustment,
  Product,
} from "./types.ts";

const TODAY = "2026-09-01";

function adj(p: Partial<PriceAdjustment>): PriceAdjustment {
  return {
    id: p.id ?? "a",
    kind: p.kind ?? "discount",
    mode: p.mode ?? "percent",
    value: p.value ?? 10,
    startsAt: p.startsAt ?? null,
    endsAt: p.endsAt ?? null,
    active: p.active ?? true,
    label: p.label,
  };
}

function product(price: number, adjustments: PriceAdjustment[] = []): Product {
  return {
    id: "p",
    slug: "p",
    title: { en: "p", fa: "p" },
    description: { en: "", fa: "" },
    price,
    compareAtPrice: null,
    currency: "EUR",
    brandId: null,
    attributes: {},
    images: [],
    primaryImageId: null,
    active: true,
    adjustments,
    categoryId: "c",
    tags: [],
    rating: 0,
    stock: 1,
    createdAt: TODAY,
  };
}

test("no adjustments leaves the base price alone", () => {
  assert.equal(effectivePrice(product(10000), TODAY), 10000);
});

test("percent discount", () => {
  const p = product(10000, [adj({ kind: "discount", value: 15 })]);
  assert.equal(effectivePrice(p, TODAY), 8500);
});

test("fixed-amount discount", () => {
  const p = product(10000, [adj({ kind: "discount", mode: "amount", value: 1250 })]);
  assert.equal(effectivePrice(p, TODAY), 8750);
});

test("percent discounts stack additively, not compounding", () => {
  const p = product(10000, [
    adj({ id: "a", kind: "discount", value: 10 }),
    adj({ id: "b", kind: "discount", value: 10 }),
  ]);
  // 20% off, not 19%.
  assert.equal(effectivePrice(p, TODAY), 8000);
});

test("tax is charged on the post-discount amount", () => {
  const p = product(10000, [
    adj({ id: "d", kind: "discount", value: 50 }),
    adj({ id: "t", kind: "tax", value: 10 }),
  ]);
  // 10000 -> 5000 after discount -> +500 tax = 5500.
  // Taxing the list price would wrongly give 6000.
  assert.equal(effectivePrice(p, TODAY), 5500);
});

test("offsets apply before discounts", () => {
  const p = product(10000, [
    adj({ id: "o", kind: "offset", mode: "amount", value: 2000 }),
    adj({ id: "d", kind: "discount", value: 10 }),
  ]);
  // 12000 -> 10% of 12000 = 1200 -> 10800.
  assert.equal(effectivePrice(p, TODAY), 10800);
});

test("a negative offset reduces the base", () => {
  const p = product(10000, [
    adj({ kind: "offset", mode: "amount", value: -1500 }),
  ]);
  assert.equal(effectivePrice(p, TODAY), 8500);
});

test("full pipeline: offset, discount, tax", () => {
  const p = product(20000, [
    adj({ id: "o", kind: "offset", value: 10 }),
    adj({ id: "d", kind: "discount", mode: "amount", value: 2000 }),
    adj({ id: "t", kind: "tax", value: 9 }),
  ]);
  // 20000 +10% = 22000 -> -2000 = 20000 -> +9% (1800) = 21800.
  const b = priceBreakdown(p, TODAY);
  assert.equal(b.offsetTotal, 2000);
  assert.equal(b.discountTotal, 2000);
  assert.equal(b.netBeforeTax, 20000);
  assert.equal(b.taxTotal, 1800);
  assert.equal(b.total, 21800);
});

test("breakdown lines sum exactly to the total", () => {
  const p = product(13337, [
    adj({ id: "o", kind: "offset", value: 7 }),
    adj({ id: "d", kind: "discount", value: 13 }),
    adj({ id: "t", kind: "tax", value: 9 }),
  ]);
  const b = priceBreakdown(p, TODAY);
  const summed = b.lines.reduce((n, l) => n + l.effect, b.base);
  assert.equal(summed, b.total);
});

test("stacked discounts cannot push the price below zero", () => {
  const p = product(10000, [
    adj({ id: "a", kind: "discount", value: 80 }),
    adj({ id: "b", kind: "discount", value: 80 }),
  ]);
  assert.equal(effectivePrice(p, TODAY), 0);
});

test("an over-large fixed discount is capped at the subtotal", () => {
  const p = product(5000, [
    adj({ kind: "discount", mode: "amount", value: 999999 }),
  ]);
  assert.equal(effectivePrice(p, TODAY), 0);
});

test("date window is inclusive on both ends", () => {
  const a = adj({ startsAt: "2026-09-01", endsAt: "2026-09-30" });
  assert.equal(isInEffect(a, "2026-08-31"), false);
  assert.equal(isInEffect(a, "2026-09-01"), true);
  assert.equal(isInEffect(a, "2026-09-30"), true);
  assert.equal(isInEffect(a, "2026-10-01"), false);
});

test("null bounds mean permanent", () => {
  const a = adj({ startsAt: null, endsAt: null });
  assert.equal(isInEffect(a, "1999-01-01"), true);
  assert.equal(isInEffect(a, "2099-01-01"), true);
});

test("an open-ended start still respects its start date", () => {
  const a = adj({ startsAt: "2026-09-15", endsAt: null });
  assert.equal(isInEffect(a, "2026-09-14"), false);
  assert.equal(isInEffect(a, "2030-01-01"), true);
});

test("a disabled adjustment never applies, dates regardless", () => {
  const a = adj({ active: false });
  assert.equal(isInEffect(a, TODAY), false);
  assert.equal(effectivePrice(product(10000, [a]), TODAY), 10000);
});

test("an out-of-window discount leaves the price alone", () => {
  const p = product(10000, [
    adj({ kind: "discount", value: 50, startsAt: "2026-12-01", endsAt: "2026-12-31" }),
  ]);
  assert.equal(effectivePrice(p, TODAY), 10000);
  assert.equal(effectivePrice(p, "2026-12-15"), 5000);
});

test("strike-through prefers a live reduction over compareAtPrice", () => {
  const p = product(10000, [adj({ kind: "discount", value: 20 })]);
  p.compareAtPrice = 11000;
  assert.equal(effectivePrice(p, TODAY), 8000);
  assert.equal(strikeThroughPrice(p, TODAY), 10000);
});

test("strike-through falls back to compareAtPrice with no adjustments", () => {
  const p = product(10000);
  p.compareAtPrice = 12000;
  assert.equal(strikeThroughPrice(p, TODAY), 12000);
});

test("tax alone never shows a strike-through", () => {
  const p = product(10000, [adj({ kind: "tax", value: 9 })]);
  assert.equal(effectivePrice(p, TODAY), 10900);
  assert.equal(strikeThroughPrice(p, TODAY), null);
});

test("adjustment order does not depend on array order", () => {
  const listed = product(20000, [
    adj({ id: "t", kind: "tax", value: 9 }),
    adj({ id: "d", kind: "discount", mode: "amount", value: 2000 }),
    adj({ id: "o", kind: "offset", value: 10 }),
  ]);
  // Same three rules as the pipeline test, declared backwards.
  assert.equal(effectivePrice(listed, TODAY), 21800);
});
