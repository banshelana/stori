import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approvedFor,
  existingReview,
  hasPurchased,
  ratingFor,
  ratingSortValue,
  reviewEligibility,
} from "@/lib/reviews";
import type { Order, OrderStatus, Review } from "@/lib/data/commerce";

function order(
  id: string,
  userId: string,
  status: OrderStatus,
  productIds: string[]
): Order {
  return {
    id,
    reference: `ORD-${id}`,
    userId,
    status,
    lines: productIds.map((productId) => ({
      productId,
      title: { en: productId, fa: productId },
      quantity: 1,
      unitPrice: 1000,
    })),
    total: 1000 * productIds.length,
    currency: "EUR",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

function review(
  id: string,
  productId: string,
  userId: string,
  rating: number,
  approved = true,
  createdAt = "2026-01-01"
): Review {
  return { id, productId, userId, rating, body: "b", approved, createdAt };
}

const orders = [
  order("1", "u-1", "done", ["p-1", "p-2"]),
  order("2", "u-1", "pending", ["p-3"]),
  order("3", "u-1", "canceled", ["p-4"]),
  order("4", "u-2", "done", ["p-1"]),
];

describe("purchase verification", () => {
  it("accepts a fulfilled order containing the product", () => {
    assert.equal(hasPurchased("u-1", "p-1", orders), true);
    assert.equal(hasPurchased("u-1", "p-2", orders), true);
  });

  it("rejects a product only in an unfulfilled order", () => {
    // Pending means it has not arrived; there is nothing to review yet.
    assert.equal(hasPurchased("u-1", "p-3", orders), false);
  });

  it("rejects a cancelled order", () => {
    assert.equal(hasPurchased("u-1", "p-4", orders), false);
  });

  it("does not credit one customer with another's purchase", () => {
    assert.equal(hasPurchased("u-3", "p-1", orders), false);
  });
});

describe("eligibility", () => {
  const reviews = [review("r-1", "p-1", "u-1", 5)];

  it("requires signing in", () => {
    assert.equal(reviewEligibility(undefined, "p-1", orders, []), "not-signed-in");
  });

  it("requires a purchase", () => {
    assert.equal(
      reviewEligibility("u-1", "p-3", orders, []),
      "not-purchased"
    );
  });

  it("allows one review per product per customer", () => {
    assert.equal(
      reviewEligibility("u-1", "p-1", orders, reviews),
      "already-reviewed"
    );
    assert.equal(reviewEligibility("u-1", "p-2", orders, reviews), "ok");
  });

  it("reports the blocking reason in priority order", () => {
    // Not signed in wins over everything else.
    assert.equal(
      reviewEligibility(undefined, "p-3", orders, reviews),
      "not-signed-in"
    );
  });

  it("finds an existing review only for the right pair", () => {
    assert.ok(existingReview("u-1", "p-1", reviews));
    assert.equal(existingReview("u-2", "p-1", reviews), undefined);
    assert.equal(existingReview("u-1", "p-2", reviews), undefined);
  });
});

describe("rating derivation", () => {
  const reviews = [
    review("r-1", "p-1", "u-1", 5),
    review("r-2", "p-1", "u-2", 4),
    review("r-3", "p-1", "u-3", 3, false), // pending moderation
    review("r-4", "p-2", "u-1", 2),
  ];

  it("averages only approved reviews", () => {
    const summary = ratingFor("p-1", reviews);
    assert.equal(summary.average, 4.5);
    assert.equal(summary.count, 2, "the unapproved one is excluded");
  });

  it("reports null rather than zero when there are none", () => {
    // "Unrated" and "rated zero" are different claims.
    const summary = ratingFor("p-none", reviews);
    assert.equal(summary.average, null);
    assert.equal(summary.count, 0);
  });

  it("excludes unapproved reviews from the distribution too", () => {
    const summary = ratingFor("p-1", reviews);
    assert.equal(summary.distribution[5], 1);
    assert.equal(summary.distribution[4], 1);
    assert.equal(summary.distribution[3], 0);
  });

  it("rounds the average to one decimal", () => {
    const summary = ratingFor("p-x", [
      review("a", "p-x", "u-1", 5),
      review("b", "p-x", "u-2", 4),
      review("c", "p-x", "u-3", 4),
    ]);
    assert.equal(summary.average, 4.3);
  });

  it("lists approved reviews newest first", () => {
    const list = approvedFor("p-y", [
      review("old", "p-y", "u-1", 5, true, "2026-01-01"),
      review("new", "p-y", "u-2", 4, true, "2026-06-01"),
      review("hidden", "p-y", "u-3", 1, false, "2026-07-01"),
    ]);
    assert.deepEqual(list.map((r) => r.id), ["new", "old"]);
  });
});

describe("sorting", () => {
  it("sorts unrated products below rated ones", () => {
    const rated = ratingSortValue(ratingFor("p-1", [review("a", "p-1", "u", 1)]));
    const unrated = ratingSortValue(ratingFor("p-none", []));
    assert.ok(unrated < rated, "a 1-star product still beats no rating");
  });
});
