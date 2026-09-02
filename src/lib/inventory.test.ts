import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findShortages,
  nextStock,
  stockDeltas,
  type StockLookup,
} from "@/lib/inventory";
import {
  DEFAULT_SETTINGS,
  isLowStock,
  mergeSettings,
  shippingFor,
  taxFor,
} from "@/lib/settings";

const stock: StockLookup = (id) =>
  ({ "p-1": 10, "p-2": 2, "p-3": 0 })[id];

describe("stock availability", () => {
  it("passes when everything is in stock", () => {
    assert.deepEqual(
      findShortages([{ productId: "p-1", quantity: 3 }], stock),
      []
    );
  });

  it("reports the gap", () => {
    assert.deepEqual(findShortages([{ productId: "p-2", quantity: 5 }], stock), [
      { productId: "p-2", requested: 5, available: 2 },
    ]);
  });

  it("combines repeated lines for the same product", () => {
    // Two lines of 6 against stock of 10 is a shortage, even though
    // neither line alone exceeds it.
    assert.deepEqual(
      findShortages(
        [
          { productId: "p-1", quantity: 6 },
          { productId: "p-1", quantity: 6 },
        ],
        stock
      ),
      [{ productId: "p-1", requested: 12, available: 10 }]
    );
  });

  it("treats an unknown product as zero available", () => {
    assert.deepEqual(findShortages([{ productId: "gone", quantity: 1 }], stock), [
      { productId: "gone", requested: 1, available: 0 },
    ]);
  });

  it("treats a sold-out product as a shortage", () => {
    assert.equal(findShortages([{ productId: "p-3", quantity: 1 }], stock).length, 1);
  });
});

describe("stock deltas", () => {
  it("reserves negatively and restores positively", () => {
    const lines = [
      { productId: "p-1", quantity: 2 },
      { productId: "p-2", quantity: 1 },
    ];
    assert.deepEqual([...stockDeltas(lines, "reserve")], [["p-1", -2], ["p-2", -1]]);
    assert.deepEqual([...stockDeltas(lines, "restore")], [["p-1", 2], ["p-2", 1]]);
  });

  it("sums repeated products into one movement", () => {
    const deltas = stockDeltas(
      [
        { productId: "p-1", quantity: 2 },
        { productId: "p-1", quantity: 3 },
      ],
      "reserve"
    );
    assert.equal(deltas.get("p-1"), -5);
  });

  it("never drives stock below zero", () => {
    assert.equal(nextStock(3, -5), 0);
    assert.equal(nextStock(3, -1), 2);
    assert.equal(nextStock(0, 4), 4);
  });
});

describe("settings-driven policy", () => {
  it("charges flat shipping until the free threshold", () => {
    const s = { ...DEFAULT_SETTINGS, shippingFlatRate: 500, freeShippingThreshold: 5000 };
    assert.equal(shippingFor(4999, s), 500);
    assert.equal(shippingFor(5000, s), 0, "threshold is inclusive");
  });

  it("never charges shipping when the rate is zero", () => {
    assert.equal(shippingFor(1, DEFAULT_SETTINGS), 0);
  });

  it("never offers free shipping when the threshold is null", () => {
    const s = { ...DEFAULT_SETTINGS, shippingFlatRate: 500, freeShippingThreshold: null };
    assert.equal(shippingFor(1_000_000, s), 500);
  });

  it("rounds tax to whole minor units", () => {
    assert.equal(taxFor(1000, { ...DEFAULT_SETTINGS, taxPercent: 9 }), 90);
    assert.equal(taxFor(999, { ...DEFAULT_SETTINGS, taxPercent: 9 }), 90);
    assert.equal(taxFor(1000, DEFAULT_SETTINGS), 0);
  });

  it("flags low stock but not sold out", () => {
    assert.equal(isLowStock(3, DEFAULT_SETTINGS), true);
    assert.equal(isLowStock(0, DEFAULT_SETTINGS), false, "sold out is its own state");
    assert.equal(isLowStock(50, DEFAULT_SETTINGS), false);
  });
});

describe("settings migration", () => {
  it("fills keys a stored blob is missing", () => {
    const merged = mergeSettings({ supportEmail: "a@b.c" });
    assert.equal(merged.supportEmail, "a@b.c");
    assert.equal(merged.lowStockThreshold, DEFAULT_SETTINGS.lowStockThreshold);
    assert.equal(merged.overdueAfterDays, DEFAULT_SETTINGS.overdueAfterDays);
  });

  it("falls back entirely on junk", () => {
    assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS);
    assert.deepEqual(mergeSettings("nope"), DEFAULT_SETTINGS);
  });

  it("keeps an explicit null threshold rather than defaulting it", () => {
    assert.equal(mergeSettings({ freeShippingThreshold: null }).freeShippingThreshold, null);
  });
});
