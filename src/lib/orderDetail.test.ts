import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOrderDetail, paymentShortfall } from "@/lib/orderDetail";
import type { Order, OrderStatus, Payment, Review } from "@/lib/data/commerce";
import type { UserAddress } from "@/lib/auth/types";
import type { Product } from "@/lib/types";

function order(
  id: string,
  userId: string,
  status: OrderStatus,
  productIds: string[],
  total = 1000,
  createdAt = "2026-01-01"
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
      unitPrice: total,
    })),
    total,
    currency: "EUR",
    createdAt,
    updatedAt: createdAt,
  };
}

function payment(
  id: string,
  orderId: string,
  amount: number,
  status: Payment["status"]
): Payment {
  return {
    id,
    reference: `TRX-${id}`,
    orderId,
    userId: "u-1",
    amount,
    currency: "EUR",
    method: "card",
    status,
    paidAt: "2026-01-02",
  };
}

const products = [
  { id: "p-1", slug: "p-1" },
  { id: "p-2", slug: "p-2" },
] as unknown as Product[];

const allOrders = [
  order("1", "u-1", "done", ["p-1", "p-2"], 5000, "2026-01-01"),
  order("2", "u-1", "pending", ["p-1"], 3000, "2026-03-01"),
  order("3", "u-1", "canceled", ["p-2"], 9000, "2026-02-01"),
  order("4", "u-2", "done", ["p-1"], 1000, "2026-01-15"),
];

const reviews: Review[] = [
  {
    id: "r-1",
    productId: "p-1",
    userId: "u-1",
    rating: 5,
    body: "great",
    approved: true,
    createdAt: "2026-01-10",
  },
  {
    id: "r-2",
    productId: "p-2",
    userId: "u-2",
    rating: 2,
    body: "someone else",
    approved: true,
    createdAt: "2026-01-11",
  },
];

const addresses: UserAddress[] = [
  {
    id: "a-1",
    countryId: "ir",
    provinceId: "ir-thr",
    cityId: "ir-thr-tehran",
    street: "A",
    postalCode: "1234567890",
  },
  {
    id: "a-2",
    countryId: "ir",
    provinceId: "ir-esf",
    cityId: "ir-esf-isfahan",
    street: "B",
    postalCode: "1234567891",
    isDefault: true,
  },
];

function build(overrides: Partial<Parameters<typeof buildOrderDetail>[0]> = {}) {
  return buildOrderDetail({
    order: allOrders[0],
    allOrders,
    products,
    payments: [payment("1", "1", 5000, "paid")],
    reviews,
    addresses,
    ...overrides,
  });
}

describe("line assembly", () => {
  it("attaches the product to each line", () => {
    const detail = build();
    assert.equal(detail.lines[0].product?.id, "p-1");
  });

  it("attaches only this customer's review", () => {
    const detail = build();
    // r-2 is for p-2 but by a different customer.
    assert.equal(detail.lines[0].review?.id, "r-1");
    assert.equal(detail.lines[1].review, undefined);
  });

  it("survives a deleted product", () => {
    const detail = build({ products: [] });
    assert.equal(detail.lines[0].product, undefined);
    assert.equal(detail.lines.length, 2, "the line still shows");
  });

  it("collects the reviews present across the order", () => {
    assert.deepEqual(build().reviews.map((r) => r.id), ["r-1"]);
  });
});

describe("payments", () => {
  it("takes only this order's payments", () => {
    const detail = build({
      payments: [payment("1", "1", 5000, "paid"), payment("2", "999", 1, "paid")],
    });
    assert.equal(detail.payments.length, 1);
  });

  it("counts only settled money toward paid", () => {
    const detail = build({
      payments: [
        payment("1", "1", 3000, "paid"),
        payment("2", "1", 2000, "pending"),
        payment("3", "1", 4000, "failed"),
      ],
    });
    assert.equal(detail.paidTotal, 3000);
    assert.equal(paymentShortfall(detail), 2000);
  });

  it("reports no shortfall when fully paid", () => {
    assert.equal(paymentShortfall(build()), 0);
  });

  it("never reports a negative shortfall on an overpayment", () => {
    const detail = build({ payments: [payment("1", "1", 9999, "paid")] });
    assert.equal(paymentShortfall(detail), 0);
  });
});

describe("customer history", () => {
  it("counts every order by this customer", () => {
    assert.equal(build().history.orderCount, 3);
  });

  it("excludes cancelled orders from lifetime value", () => {
    // 5000 + 3000, not the 9000 cancelled one.
    assert.equal(build().history.lifetimeValue, 8000);
  });

  it("finds the earliest order date", () => {
    assert.equal(build().history.firstOrderAt, "2026-01-01");
  });

  it("lists the customer's other orders, newest first, excluding this one", () => {
    assert.deepEqual(
      build().history.otherOrders.map((o) => o.id),
      ["2", "3"]
    );
  });

  it("does not mix in another customer's orders", () => {
    assert.ok(!build().history.otherOrders.some((o) => o.userId !== "u-1"));
  });
});

describe("address", () => {
  it("prefers the default address", () => {
    assert.equal(build().currentDefaultAddress?.id, "a-2");
  });

  it("falls back to the first when none is marked default", () => {
    const detail = build({ addresses: [addresses[0]] });
    assert.equal(detail.currentDefaultAddress?.id, "a-1");
  });

  it("copes with a customer who has no addresses", () => {
    assert.equal(build({ addresses: undefined }).currentDefaultAddress, undefined);
    assert.equal(build({ addresses: [] }).currentDefaultAddress, undefined);
  });
});
