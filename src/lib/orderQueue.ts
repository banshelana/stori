import type { Order, OrderStatus } from "@/lib/data/commerce";

// ---------------------------------------------------------------
// The work queue: orders that still need a human to do something.
//
// Deliberately narrower than the Sales page, which lists every order
// in every state. Anything here is waiting on the store, not on the
// customer or the courier.
// ---------------------------------------------------------------

export const QUEUE_STATUSES = ["created", "pending"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export function isActionable(order: Order): boolean {
  return (QUEUE_STATUSES as readonly OrderStatus[]).includes(order.status);
}

export interface QueueFilters {
  /** Matches a customer's name or mobile. */
  customer?: string;
  /** Matches any line's product title, in any language. */
  product?: string;
  /** Inclusive YYYY-MM-DD bounds. */
  dateFrom?: string;
  dateTo?: string;
  /** Minor units, inclusive. */
  minTotal?: number;
  maxTotal?: number;
  status?: QueueStatus | "all";
}

/** What the caller knows about the buyer; the queue itself stores only an id. */
export interface CustomerLookup {
  (userId: string): { name: string; mobile: string } | undefined;
}

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function filterQueue(
  orders: Order[],
  filters: QueueFilters,
  lookup: CustomerLookup
): Order[] {
  return orders.filter((order) => {
    if (!isActionable(order)) return false;

    if (filters.status && filters.status !== "all") {
      if (order.status !== filters.status) return false;
    }

    const customer = filters.customer?.trim();
    if (customer) {
      const found = lookup(order.userId);
      const hay = [found?.name ?? "", found?.mobile ?? "", order.reference];
      if (!hay.some((value) => matches(value, customer))) return false;
    }

    const product = filters.product?.trim();
    if (product) {
      const titles = order.lines.flatMap((line) => Object.values(line.title));
      if (!titles.some((title) => matches(title, product))) return false;
    }

    // ISO dates compare correctly as strings, so no Date objects needed.
    if (filters.dateFrom && order.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && order.createdAt > filters.dateTo) return false;

    if (typeof filters.minTotal === "number" && order.total < filters.minTotal) {
      return false;
    }
    if (typeof filters.maxTotal === "number" && order.total > filters.maxTotal) {
      return false;
    }

    return true;
  });
}

/** Whole days between the order date and `today`, never negative. */
export function waitingDays(order: Order, today = new Date()): number {
  const created = new Date(`${order.createdAt}T00:00:00`);
  if (Number.isNaN(created.getTime())) return 0;
  const midnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diff = midnight.getTime() - created.getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

export type Urgency = "fresh" | "waiting" | "overdue";

/**
 * How loudly a card should ask for attention. The thresholds are a
 * starting point, not a policy — a store with next-day dispatch will
 * want them lower.
 */
export function urgencyOf(days: number): Urgency {
  if (days >= 3) return "overdue";
  if (days >= 1) return "waiting";
  return "fresh";
}

/** Oldest first: the queue is a to-do list, not a news feed. */
export function sortByOldest(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Newest first, for the notification dropdown. */
export function sortByNewest(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface QueueSummary {
  total: number;
  created: number;
  pending: number;
  overdue: number;
  value: number;
}

export function summarise(orders: Order[], today = new Date()): QueueSummary {
  const actionable = orders.filter(isActionable);
  return {
    total: actionable.length,
    created: actionable.filter((o) => o.status === "created").length,
    pending: actionable.filter((o) => o.status === "pending").length,
    overdue: actionable.filter((o) => urgencyOf(waitingDays(o, today)) === "overdue")
      .length,
    value: actionable.reduce((sum, o) => sum + o.total, 0),
  };
}
