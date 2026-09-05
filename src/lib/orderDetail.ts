import type { UserAddress } from "@/lib/auth/types";
import type { Order, OrderLine, Payment, Review } from "@/lib/data/commerce";
import type { Product } from "@/lib/types";

// ---------------------------------------------------------------
// Everything one order is connected to, assembled in one place.
//
// The list pages deliberately do not carry this — a table showing
// fifty orders has no business resolving every product, payment and
// review behind each one. The detail page asks for one order and
// gathers its neighbours on demand.
// ---------------------------------------------------------------

export interface OrderLineDetail {
  line: OrderLine;
  /** Undefined when the product has since been deleted. */
  product: Product | undefined;
  /** This customer's review of this product, if they wrote one. */
  review: Review | undefined;
}

export interface CustomerHistory {
  orderCount: number;
  /** Sum of everything not cancelled. */
  lifetimeValue: number;
  firstOrderAt: string | null;
  /** Orders other than this one, newest first. */
  otherOrders: Order[];
}

export interface OrderDetail {
  order: Order;
  lines: OrderLineDetail[];
  payments: Payment[];
  history: CustomerHistory;
  /**
   * The customer's current default address.
   *
   * NOT the address this order shipped to: Order carries no address of
   * its own, so nothing records where it actually went. Callers must
   * label this as the current default rather than implying otherwise.
   */
  currentDefaultAddress: UserAddress | undefined;
  /** Reviews the customer left for products in this order. */
  reviews: Review[];
  paidTotal: number;
}

export function buildOrderDetail({
  order,
  allOrders,
  products,
  payments,
  reviews,
  addresses,
}: {
  order: Order;
  allOrders: Order[];
  products: Product[];
  payments: Payment[];
  reviews: Review[];
  addresses: UserAddress[] | undefined;
}): OrderDetail {
  const lines: OrderLineDetail[] = order.lines.map((line) => ({
    line,
    product: products.find((p) => p.id === line.productId),
    review: reviews.find(
      (r) => r.userId === order.userId && r.productId === line.productId
    ),
  }));

  const orderPayments = payments.filter((p) => p.orderId === order.id);

  const mine = allOrders.filter((o) => o.userId === order.userId);
  const billable = mine.filter((o) => o.status !== "canceled");

  return {
    order,
    lines,
    payments: orderPayments,
    reviews: lines
      .map((l) => l.review)
      .filter((r): r is Review => r !== undefined),
    history: {
      orderCount: mine.length,
      lifetimeValue: billable.reduce((sum, o) => sum + o.total, 0),
      firstOrderAt:
        mine.length > 0
          ? mine
              .map((o) => o.createdAt)
              .sort((a, b) => a.localeCompare(b))[0]
          : null,
      otherOrders: mine
        .filter((o) => o.id !== order.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    },
    currentDefaultAddress:
      addresses?.find((a) => a.isDefault) ?? addresses?.[0],
    // Only settled money counts; a pending or failed attempt has not paid
    // for anything.
    paidTotal: orderPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0),
  };
}

/** Whether the order is fully covered by settled payments. */
export function paymentShortfall(detail: OrderDetail): number {
  return Math.max(0, detail.order.total - detail.paidTotal);
}
