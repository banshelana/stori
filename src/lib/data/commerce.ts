import type { LocalizedText } from "@/i18n/localized";
import { MOCK_PRODUCTS } from "@/lib/data/mock";
import { MOCK_USERS } from "@/lib/data/users";

// ---------------------------------------------------------------
// Mock fixtures for the admin panel and the customer's own history.
// Shapes mirror what the REST API is expected to return so swapping
// in axios is a change of source, not of types.
// ---------------------------------------------------------------

export const ORDER_STATUSES = [
  "created",
  "pending",
  "processing",
  "done",
  "canceled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["paid", "pending", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["card", "wallet", "cod", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderLine {
  productId: string;
  // Snapshotted at order time: the title as it was when purchased, in
  // every language, so an order's history doesn't rewrite itself when
  // the catalog entry is renamed.
  title: LocalizedText;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  reference: string;
  userId: string;
  status: OrderStatus;
  lines: OrderLine[];
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  reference: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  body: string;
  approved: boolean;
  createdAt: string;
}

export const TICKET_STATUSES = ["open", "pending", "resolved"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * A support ticket. The opening message lives on the record itself and
 * every subsequent message is a TicketReply, so the thread reads in one
 * order without a special case for the first entry.
 */
export interface Contact {
  id: string;
  name: string;
  email: string;
  mobile: string;
  subject: string;
  body: string;
  status: TicketStatus;
  /** Set when the sender was signed in, so they can follow the thread. */
  userId?: string;
  /** Staff member handling it. */
  assignedTo?: string;
  createdAt: string;
  /** Bumped on every reply, so the queue can sort by staleness. */
  updatedAt: string;
}

export interface TicketReply {
  id: string;
  contactId: string;
  author: "customer" | "staff";
  authorName: string;
  body: string;
  createdAt: string;
  /** Which channel the customer was notified through, if any. */
  notifiedVia?: MessageChannel;
}

export const MESSAGE_CHANNELS = ["sms", "email"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export interface Message {
  id: string;
  channel: MessageChannel;
  /** A mobile number for SMS, an address for email. */
  recipient: string;
  /** Email only; SMS has no subject line. */
  subject?: string;
  body: string;
  status: "sent" | "queued" | "failed";
  sentAt: string;
}

function line(productIndex: number, quantity: number): OrderLine {
  const product = MOCK_PRODUCTS[productIndex % MOCK_PRODUCTS.length];
  return {
    productId: product.id,
    title: product.title,
    quantity,
    unitPrice: product.price,
  };
}

function buildOrder(
  id: number,
  userId: string,
  status: OrderStatus,
  createdAt: string,
  lines: OrderLine[]
): Order {
  return {
    id: `o-${String(id).padStart(3, "0")}`,
    reference: `ORD-${2026000 + id}`,
    userId,
    status,
    lines,
    total: lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    currency: "EUR",
    createdAt,
    updatedAt: createdAt,
  };
}

export const MOCK_ORDERS: Order[] = [
  buildOrder(1, "u-004", "done", "2026-06-02", [line(0, 1), line(3, 2)]),
  buildOrder(2, "u-004", "processing", "2026-07-18", [line(2, 1)]),
  buildOrder(3, "u-004", "pending", "2026-08-11", [line(1, 2)]),
  buildOrder(4, "u-004", "created", "2026-08-28", [line(4, 1)]),
  buildOrder(5, "u-004", "canceled", "2026-05-09", [line(5, 1)]),
  buildOrder(6, "u-005", "done", "2026-04-21", [line(0, 2), line(2, 1)]),
  buildOrder(7, "u-005", "done", "2026-06-30", [line(6, 3)]),
  buildOrder(8, "u-005", "processing", "2026-08-19", [line(7, 1), line(1, 1)]),
  buildOrder(9, "u-005", "pending", "2026-08-25", [line(3, 4)]),
  buildOrder(10, "u-005", "created", "2026-08-30", [line(5, 2)]),
];

export const MOCK_PAYMENTS: Payment[] = MOCK_ORDERS.filter(
  (o) => o.status !== "created"
).map((order, index) => ({
  id: `pay-${String(index + 1).padStart(3, "0")}`,
  reference: `TRX-${880000 + index}`,
  orderId: order.id,
  userId: order.userId,
  amount: order.total,
  currency: order.currency,
  method: PAYMENT_METHODS[index % PAYMENT_METHODS.length],
  status:
    order.status === "canceled"
      ? "refunded"
      : order.status === "pending"
        ? "pending"
        : "paid",
  paidAt: order.createdAt,
}));

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r-001",
    productId: "p-001",
    userId: "u-004",
    rating: 5,
    body: "Excellent noise cancelling, battery lasts all week.",
    approved: true,
    createdAt: "2026-06-10",
  },
  {
    id: "r-002",
    productId: "p-003",
    userId: "u-005",
    rating: 4,
    body: "Great screen, but the strap could be softer.",
    approved: true,
    createdAt: "2026-05-02",
  },
  {
    id: "r-003",
    productId: "p-002",
    userId: "u-004",
    rating: 3,
    body: "Fine for the price, transparency mode is hit and miss.",
    approved: false,
    createdAt: "2026-08-14",
  },
];

export const MOCK_CONTACTS: Contact[] = [
  {
    id: "c-001",
    name: "Hamid Sadeghi",
    email: "hamid@example.com",
    mobile: "09121112233",
    subject: "Bulk order enquiry",
    body: "Do you offer discounts for orders above 50 units?",
    status: "open",
    createdAt: "2026-08-27",
    updatedAt: "2026-08-27",
  },
  {
    id: "c-002",
    name: "Laleh Bagheri",
    email: "laleh@example.com",
    mobile: "09124445566",
    subject: "Damaged package",
    body: "The box arrived crushed, though the product seems fine.",
    status: "pending",
    userId: "u-005",
    assignedTo: "u-003",
    createdAt: "2026-08-20",
    updatedAt: "2026-08-24",
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: "m-001",
    channel: "sms",
    recipient: "09120000004",
    body: "Your order ORD-2026002 is now being processed.",
    status: "sent",
    sentAt: "2026-07-18",
  },
  {
    id: "m-002",
    channel: "sms",
    recipient: "09120000005",
    body: "Your order ORD-2026008 has shipped.",
    status: "sent",
    sentAt: "2026-08-19",
  },
  {
    id: "m-003",
    channel: "sms",
    recipient: "09121112233",
    body: "Thanks for contacting us — our team will reply shortly.",
    status: "queued",
    sentAt: "2026-08-27",
  },
];

function delay(ms = 250) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function mockOrdersForUser(userId: string): Promise<Order[]> {
  await delay();
  return MOCK_ORDERS.filter((o) => o.userId === userId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function mockPaymentsForUser(userId: string): Promise<Payment[]> {
  await delay();
  return MOCK_PAYMENTS.filter((p) => p.userId === userId).sort((a, b) =>
    b.paidAt.localeCompare(a.paidAt)
  );
}

export interface DashboardStats {
  revenue: number;
  currency: string;
  orderCount: number;
  customerCount: number;
  averageOrder: number;
  revenueChange: number;
  orderChange: number;
  recentOrders: Order[];
  topProducts: { productId: string; title: LocalizedText; units: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
}

export async function mockDashboardStats(): Promise<DashboardStats> {
  await delay(300);

  const billable = MOCK_ORDERS.filter((o) => o.status !== "canceled");
  const revenue = billable.reduce((sum, o) => sum + o.total, 0);

  const units = new Map<string, { title: LocalizedText; units: number }>();
  for (const order of billable) {
    for (const l of order.lines) {
      const entry = units.get(l.productId) ?? { title: l.title, units: 0 };
      entry.units += l.quantity;
      units.set(l.productId, entry);
    }
  }

  return {
    revenue,
    currency: "EUR",
    orderCount: MOCK_ORDERS.length,
    customerCount: MOCK_USERS.filter((u) => u.role === "customer").length,
    averageOrder: billable.length ? Math.round(revenue / billable.length) : 0,
    // Stand-ins for a period-over-period comparison the API will compute.
    revenueChange: 0.124,
    orderChange: -0.038,
    recentOrders: [...MOCK_ORDERS]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    topProducts: [...units.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5),
    ordersByStatus: ORDER_STATUSES.map((status) => ({
      status,
      count: MOCK_ORDERS.filter((o) => o.status === status).length,
    })),
  };
}

export const MOCK_TICKET_REPLIES: TicketReply[] = [
  {
    id: "tr-001",
    contactId: "c-002",
    author: "staff",
    authorName: "Mina Tehrani",
    body: "Sorry about that. Could you send a photo of the box so we can raise it with the courier?",
    createdAt: "2026-08-21",
    notifiedVia: "email",
  },
  {
    id: "tr-002",
    contactId: "c-002",
    author: "customer",
    authorName: "Neda Rostami",
    body: "Photo attached. The corner was completely crushed but the mug is intact.",
    createdAt: "2026-08-24",
  },
];
