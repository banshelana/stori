import { localized } from "@/i18n/localized";
import { createRepository } from "@/lib/data/repository";
import {
  MOCK_CONTACTS,
  MOCK_ORDERS,
  MOCK_PAYMENTS,
  MOCK_REVIEWS,
  MOCK_MESSAGES,
  MOCK_TICKET_REPLIES,
  type Contact,
  type Order,
  type Payment,
  type Review,
  type Message,
  type TicketReply,
} from "@/lib/data/commerce";
import {
  CITIES,
  COUNTRIES,
  PROVINCES,
  type City,
  type Country,
  type Province,
} from "@/lib/data/geo";
import {
  MOCK_TEMPLATES,
  type MessageTemplate,
} from "@/lib/data/sms-templates";
import {
  MOCK_STOCK_ALERTS,
  type StockAlert,
} from "@/lib/data/stockAlerts";
import { MOCK_COUPONS, type Coupon } from "@/lib/data/coupons";
import { MOCK_PRODUCTS } from "@/lib/data/mock";
import { ratingFor } from "@/lib/reviews";
import { effectivePrice } from "@/lib/pricing";
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
    price: (p) => effectivePrice(p),
    stock: (p) => p.stock,
    rating: (p) => ratingFor(p.id, MOCK_REVIEWS).average ?? -1,
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

export const messagesRepo = createRepository<Message>({
  data: MOCK_MESSAGES,
  idPrefix: "m",
  searchable: (m) => [m.recipient, m.subject ?? "", m.body],
  sorters: {
    recipient: (m) => m.recipient,
    channel: (m) => m.channel,
    sentAt: (m) => m.sentAt,
    status: (m) => m.status,
  },
});

// ---------------------------------------------------------------
// Reference geography. Three tables with foreign keys between them:
// a province belongs to a country, a city to a province. Deletes are
// guarded in the UI by the count helpers in geo.ts.
// ---------------------------------------------------------------

export const countriesRepo = createRepository<Country>({
  data: COUNTRIES,
  idPrefix: "ctry",
  searchable: (c) => [c.name.en, c.name.fa, c.iso2, c.dialCode],
  sorters: {
    name: (c) => c.name.en,
    iso2: (c) => c.iso2,
    dialCode: (c) => c.dialCode,
  },
});

export const provincesRepo = createRepository<Province>({
  data: PROVINCES,
  idPrefix: "prov",
  searchable: (p) => [p.name.en, p.name.fa],
  sorters: {
    name: (p) => p.name.en,
    countryId: (p) => p.countryId,
  },
});

export const citiesRepo = createRepository<City>({
  data: CITIES,
  idPrefix: "city",
  searchable: (c) => [c.name.en, c.name.fa],
  sorters: {
    name: (c) => c.name.en,
    provinceId: (c) => c.provinceId,
  },
});

export const templatesRepo = createRepository<MessageTemplate>({
  data: MOCK_TEMPLATES,
  idPrefix: "tpl",
  searchable: (t) => [
    ...Object.values(t.name),
    ...Object.values(t.body),
    ...Object.values(t.subject ?? {}),
  ],
  sorters: {
    name: (t) => t.name.en,
    createdAt: (t) => t.createdAt,
  },
});

export const stockAlertsRepo = createRepository<StockAlert>({
  data: MOCK_STOCK_ALERTS,
  idPrefix: "sa",
  searchable: (a) => [a.mobile, a.productId],
  sorters: {
    createdAt: (a) => a.createdAt,
    mobile: (a) => a.mobile,
  },
});

export const couponsRepo = createRepository<Coupon>({
  data: MOCK_COUPONS,
  idPrefix: "cpn",
  searchable: (c) => [c.code],
  sorters: {
    code: (c) => c.code,
    value: (c) => c.value,
    usedCount: (c) => c.usedCount,
    endsAt: (c) => c.endsAt ?? "",
  },
});

export const ticketRepliesRepo = createRepository<TicketReply>({
  data: MOCK_TICKET_REPLIES,
  idPrefix: "tr",
  searchable: (r) => [r.body, r.authorName],
  sorters: { createdAt: (r) => r.createdAt },
});
