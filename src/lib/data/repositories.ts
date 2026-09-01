import { localized } from "@/i18n/localized";
import { createRepository } from "@/lib/data/repository";
import {
  MOCK_CONTACTS,
  MOCK_ORDERS,
  MOCK_PAYMENTS,
  MOCK_REVIEWS,
  MOCK_SMS,
  type Contact,
  type Order,
  type Payment,
  type Review,
  type SmsMessage,
} from "@/lib/data/commerce";
import { MOCK_PRODUCTS } from "@/lib/data/mock";
import { MOCK_USERS, type MockUser } from "@/lib/data/users";
import type { Product } from "@/lib/types";

// ---------------------------------------------------------------
// One repository per admin section. Each declares what free-text
// search matches and which columns are sortable; everything else
// (paging, filtering, mutation) comes from createRepository.
// ---------------------------------------------------------------

export const customersRepo = createRepository<MockUser>({
  data: MOCK_USERS,
  idPrefix: "u",
  searchable: (u) => [u.firstName, u.lastName, u.mobile, u.email ?? ""],
  sorters: {
    name: (u) => `${u.firstName} ${u.lastName}`,
    mobile: (u) => u.mobile,
    createdAt: (u) => u.createdAt,
    subRole: (u) => u.subRole,
  },
});

export const productsRepo = createRepository<Product>({
  data: MOCK_PRODUCTS,
  idPrefix: "p",
  // Both languages are searchable, so an English query finds a product
  // an admin last edited in Farsi.
  searchable: (p) => [
    ...Object.values(p.title),
    ...Object.values(p.description),
    p.slug,
    ...p.tags,
  ],
  sorters: {
    title: (p) => localized(p.title, "en"),
    price: (p) => p.price,
    stock: (p) => p.stock,
    rating: (p) => p.rating,
    createdAt: (p) => p.createdAt,
  },
});

export const ordersRepo = createRepository<Order>({
  data: MOCK_ORDERS,
  idPrefix: "o",
  searchable: (o) => [
    o.reference,
    ...o.lines.flatMap((l) => Object.values(l.title)),
  ],
  sorters: {
    reference: (o) => o.reference,
    total: (o) => o.total,
    createdAt: (o) => o.createdAt,
    status: (o) => o.status,
  },
});

export const paymentsRepo = createRepository<Payment>({
  data: MOCK_PAYMENTS,
  idPrefix: "pay",
  searchable: (p) => [p.reference, p.orderId],
  sorters: {
    reference: (p) => p.reference,
    amount: (p) => p.amount,
    paidAt: (p) => p.paidAt,
    status: (p) => p.status,
    method: (p) => p.method,
  },
});

export const reviewsRepo = createRepository<Review>({
  data: MOCK_REVIEWS,
  idPrefix: "r",
  searchable: (r) => [r.body],
  sorters: {
    rating: (r) => r.rating,
    createdAt: (r) => r.createdAt,
  },
});

export const contactsRepo = createRepository<Contact>({
  data: MOCK_CONTACTS,
  idPrefix: "c",
  searchable: (c) => [c.name, c.email, c.mobile, c.subject, c.body],
  sorters: {
    name: (c) => c.name,
    subject: (c) => c.subject,
    createdAt: (c) => c.createdAt,
  },
});

export const messagesRepo = createRepository<SmsMessage>({
  data: MOCK_SMS,
  idPrefix: "m",
  searchable: (m) => [m.recipient, m.body],
  sorters: {
    recipient: (m) => m.recipient,
    sentAt: (m) => m.sentAt,
    status: (m) => m.status,
  },
});
