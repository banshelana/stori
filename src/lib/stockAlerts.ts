import type { StockAlert } from "@/lib/data/stockAlerts";

// ---------------------------------------------------------------
// When a back-in-stock alert should fire, kept pure so the rule is
// testable and lives in exactly one place.
// ---------------------------------------------------------------

/**
 * True only on the transition from unavailable to available.
 *
 * Restocking from 3 to 30 is not news to someone waiting — they could
 * already buy it. Only the crossing of zero is.
 */
export function crossedIntoStock(before: number, after: number): boolean {
  return before <= 0 && after > 0;
}

export function pendingFor(
  alerts: StockAlert[],
  productId: string
): StockAlert[] {
  return alerts.filter(
    (alert) => alert.productId === productId && alert.notifiedAt === null
  );
}

/** One subscription per number per product; re-subscribing is a no-op. */
export function alreadySubscribed(
  alerts: StockAlert[],
  productId: string,
  mobile: string
): boolean {
  return alerts.some(
    (alert) =>
      alert.productId === productId &&
      alert.mobile === mobile &&
      alert.notifiedAt === null
  );
}

export function pendingCountByProduct(
  alerts: StockAlert[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const alert of alerts) {
    if (alert.notifiedAt !== null) continue;
    counts.set(alert.productId, (counts.get(alert.productId) ?? 0) + 1);
  }
  return counts;
}
