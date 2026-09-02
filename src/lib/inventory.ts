// ---------------------------------------------------------------
// Stock movement.
//
// Placing an order takes units out of inventory; cancelling one puts
// them back. Kept pure so the arithmetic can be tested without a
// repository, and so the same rules apply wherever stock moves.
// ---------------------------------------------------------------

export interface StockLine {
  productId: string;
  quantity: number;
}

export interface Shortage {
  productId: string;
  requested: number;
  available: number;
}

export type StockLookup = (productId: string) => number | undefined;

/**
 * Lines that ask for more than exists.
 *
 * A product that cannot be found at all counts as zero available rather
 * than being skipped — an order referencing a deleted product is a
 * problem to surface, not to wave through.
 */
export function findShortages(
  lines: StockLine[],
  stockOf: StockLookup
): Shortage[] {
  // The same product can appear on more than one line; stock is checked
  // against the combined quantity, not each line separately.
  const wanted = new Map<string, number>();
  for (const line of lines) {
    wanted.set(line.productId, (wanted.get(line.productId) ?? 0) + line.quantity);
  }

  const shortages: Shortage[] = [];
  for (const [productId, requested] of wanted) {
    const available = stockOf(productId) ?? 0;
    if (requested > available) {
      shortages.push({ productId, requested, available });
    }
  }
  return shortages;
}

/** Net movement per product: negative reserves stock, positive returns it. */
export function stockDeltas(
  lines: StockLine[],
  direction: "reserve" | "restore"
): Map<string, number> {
  const sign = direction === "reserve" ? -1 : 1;
  const deltas = new Map<string, number>();
  for (const line of lines) {
    deltas.set(
      line.productId,
      (deltas.get(line.productId) ?? 0) + sign * line.quantity
    );
  }
  return deltas;
}

/** Applies a delta without letting stock fall below zero. */
export function nextStock(current: number, delta: number): number {
  return Math.max(0, current + delta);
}
