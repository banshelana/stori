// ---------------------------------------------------------------
// Back-in-stock subscriptions.
//
// A shopper who finds a product sold out can leave a number; when the
// stock goes back above zero the admin panel turns the pending alerts
// into SMS messages.
// ---------------------------------------------------------------

export interface StockAlert {
  id: string;
  productId: string;
  mobile: string;
  /** Present when the subscriber was signed in. */
  userId?: string;
  createdAt: string;
  /** Null until the alert has been sent. */
  notifiedAt: string | null;
}

export const MOCK_STOCK_ALERTS: StockAlert[] = [
  {
    id: "sa-001",
    productId: "p-006",
    mobile: "09120000004",
    userId: "u-004",
    createdAt: "2026-08-28",
    notifiedAt: null,
  },
  {
    id: "sa-002",
    productId: "p-006",
    mobile: "09121112233",
    createdAt: "2026-08-30",
    notifiedAt: null,
  },
];
