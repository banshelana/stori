import type { Order, Review } from "@/lib/data/commerce";

// ---------------------------------------------------------------
// Review eligibility and rating derivation.
//
// A product's star rating is computed from its approved reviews
// rather than stored on the product. A stored number drifts: it can
// say 4.7 while every review says otherwise, and moderating a review
// then changes nothing on the page.
// ---------------------------------------------------------------

/** Statuses that count as "the customer actually received this". */
const FULFILLED: Order["status"][] = ["done"];

/**
 * Whether this customer has bought this product.
 *
 * Only fulfilled orders count. A pending or cancelled order is not
 * evidence that anyone has used the thing they are reviewing.
 */
export function hasPurchased(
  userId: string,
  productId: string,
  orders: Order[]
): boolean {
  return orders.some(
    (order) =>
      order.userId === userId &&
      FULFILLED.includes(order.status) &&
      order.lines.some((line) => line.productId === productId)
  );
}

export function existingReview(
  userId: string,
  productId: string,
  reviews: Review[]
): Review | undefined {
  return reviews.find(
    (r) => r.userId === userId && r.productId === productId
  );
}

export type ReviewBlock =
  | "ok"
  | "not-signed-in"
  | "not-purchased"
  | "already-reviewed";

/** Why a customer may or may not review — one reason, in priority order. */
export function reviewEligibility(
  userId: string | undefined,
  productId: string,
  orders: Order[],
  reviews: Review[]
): ReviewBlock {
  if (!userId) return "not-signed-in";
  if (!hasPurchased(userId, productId, orders)) return "not-purchased";
  if (existingReview(userId, productId, reviews)) return "already-reviewed";
  return "ok";
}

export interface RatingSummary {
  /** Mean of approved reviews, or null when there are none. */
  average: number | null;
  count: number;
  /** Count per star, 1..5. */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

const EMPTY_DISTRIBUTION = (): RatingSummary["distribution"] => ({
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
});

/**
 * Only approved reviews count toward the public rating — an unmoderated
 * review must not move the number a shopper sees.
 */
export function ratingFor(
  productId: string,
  reviews: Review[]
): RatingSummary {
  const approved = reviews.filter(
    (r) => r.productId === productId && r.approved
  );

  const distribution = EMPTY_DISTRIBUTION();
  for (const review of approved) {
    const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] += 1;
  }

  if (approved.length === 0) {
    // Null, not zero: "unrated" and "rated zero" are different claims.
    return { average: null, count: 0, distribution };
  }

  const total = approved.reduce((sum, r) => sum + r.rating, 0);
  return {
    average: Math.round((total / approved.length) * 10) / 10,
    count: approved.length,
    distribution,
  };
}

/** Approved reviews for a product, newest first. */
export function approvedFor(productId: string, reviews: Review[]): Review[] {
  return reviews
    .filter((r) => r.productId === productId && r.approved)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Sort key for "top rated".
 *
 * Unrated products sort last rather than first — without this they
 * would tie at zero and drift to the top of an ascending sort.
 */
export function ratingSortValue(summary: RatingSummary): number {
  return summary.average ?? -1;
}
