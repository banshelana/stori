import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterQueue,
  isActionable,
  sortByOldest,
  summarise,
  urgencyOf,
  waitingDays,
  type CustomerLookup,
} from "@/lib/orderQueue";
import type { Order, OrderStatus } from "@/lib/data/commerce";

function order(
  id: string,
  status: OrderStatus,
  createdAt: string,
  total: number,
  titles: string[] = ["Widget"],
  userId = "u-1"
): Order {
  return {
    id,
    reference: `ORD-${id}`,
    userId,
    status,
    lines: titles.map((title, i) => ({
      productId: `p-${i}`,
      title: { en: title, fa: `${title}-fa` },
      quantity: 1,
      unitPrice: total,
    })),
    total,
    currency: "EUR",
    createdAt,
    updatedAt: createdAt,
  };
}

const lookup: CustomerLookup = (userId) =>
  ({
    "u-1": { name: "Neda Rostami", mobile: "09120000005" },
    "u-2": { name: "Ali Mohammadi", mobile: "09120000004" },
  })[userId];

const orders = [
  order("1", "created", "2026-09-01", 10_000, ["Headphones"], "u-1"),
  order("2", "pending", "2026-08-20", 50_000, ["Keyboard"], "u-2"),
  order("3", "processing", "2026-08-25", 30_000, ["Lamp"], "u-1"),
  order("4", "done", "2026-08-10", 20_000, ["Mug"], "u-2"),
  order("5", "canceled", "2026-08-05", 90_000, ["Speaker"], "u-1"),
];

describe("actionable set", () => {
  it("includes only created and pending", () => {
    assert.equal(isActionable(orders[0]), true);
    assert.equal(isActionable(orders[1]), true);
    assert.equal(isActionable(orders[2]), false, "processing is under way");
    assert.equal(isActionable(orders[3]), false);
    assert.equal(isActionable(orders[4]), false);
  });

  it("filters everything else out regardless of other criteria", () => {
    const out = filterQueue(orders, {}, lookup);
    assert.deepEqual(out.map((o) => o.id), ["1", "2"]);
  });
});

describe("filters", () => {
  it("matches a customer by name, mobile or reference", () => {
    assert.deepEqual(
      filterQueue(orders, { customer: "neda" }, lookup).map((o) => o.id),
      ["1"]
    );
    assert.deepEqual(
      filterQueue(orders, { customer: "09120000004" }, lookup).map((o) => o.id),
      ["2"]
    );
    assert.deepEqual(
      filterQueue(orders, { customer: "ORD-1" }, lookup).map((o) => o.id),
      ["1"]
    );
  });

  it("matches a product title in either language", () => {
    assert.deepEqual(
      filterQueue(orders, { product: "keyboard" }, lookup).map((o) => o.id),
      ["2"]
    );
    assert.deepEqual(
      filterQueue(orders, { product: "Headphones-fa" }, lookup).map((o) => o.id),
      ["1"]
    );
  });

  it("applies inclusive date bounds", () => {
    assert.deepEqual(
      filterQueue(orders, { dateFrom: "2026-08-25" }, lookup).map((o) => o.id),
      ["1"]
    );
    assert.deepEqual(
      filterQueue(orders, { dateTo: "2026-08-20" }, lookup).map((o) => o.id),
      ["2"]
    );
    // Both ends inclusive.
    assert.deepEqual(
      filterQueue(
        orders,
        { dateFrom: "2026-08-20", dateTo: "2026-08-20" },
        lookup
      ).map((o) => o.id),
      ["2"]
    );
  });

  it("applies price bounds", () => {
    assert.deepEqual(
      filterQueue(orders, { minTotal: 20_000 }, lookup).map((o) => o.id),
      ["2"]
    );
    assert.deepEqual(
      filterQueue(orders, { maxTotal: 20_000 }, lookup).map((o) => o.id),
      ["1"]
    );
  });

  it("narrows by queue status", () => {
    assert.deepEqual(
      filterQueue(orders, { status: "pending" }, lookup).map((o) => o.id),
      ["2"]
    );
    assert.deepEqual(
      filterQueue(orders, { status: "all" }, lookup).map((o) => o.id),
      ["1", "2"]
    );
  });

  it("ANDs criteria together", () => {
    assert.deepEqual(
      filterQueue(
        orders,
        { customer: "ali", product: "keyboard", minTotal: 10_000 },
        lookup
      ).map((o) => o.id),
      ["2"]
    );
    assert.deepEqual(
      filterQueue(orders, { customer: "ali", product: "headphones" }, lookup),
      []
    );
  });

  it("ignores blank criteria rather than matching nothing", () => {
    assert.equal(
      filterQueue(orders, { customer: "   ", product: "" }, lookup).length,
      2
    );
  });
});

describe("waiting time", () => {
  const today = new Date(2026, 8, 3); // 2026-09-03

  it("counts whole days since the order date", () => {
    assert.equal(waitingDays(order("x", "created", "2026-09-03", 1), today), 0);
    assert.equal(waitingDays(order("x", "created", "2026-09-02", 1), today), 1);
    assert.equal(waitingDays(order("x", "created", "2026-08-31", 1), today), 3);
  });

  it("never reports a negative age for a future-dated order", () => {
    assert.equal(waitingDays(order("x", "created", "2026-09-10", 1), today), 0);
  });

  it("escalates urgency with age", () => {
    assert.equal(urgencyOf(0), "fresh");
    assert.equal(urgencyOf(1), "waiting");
    assert.equal(urgencyOf(2), "waiting");
    assert.equal(urgencyOf(3), "overdue");
  });
});

describe("ordering and summary", () => {
  it("puts the oldest first, because the queue is a to-do list", () => {
    assert.deepEqual(
      sortByOldest(filterQueue(orders, {}, lookup)).map((o) => o.id),
      ["2", "1"]
    );
  });

  it("summarises only the actionable orders", () => {
    const summary = summarise(orders, new Date(2026, 8, 3));
    assert.equal(summary.total, 2);
    assert.equal(summary.created, 1);
    assert.equal(summary.pending, 1);
    assert.equal(summary.overdue, 1, "the 2026-08-20 one is well past three days");
    // Cancelled and completed money must not appear in the queue's value.
    assert.equal(summary.value, 60_000);
  });
});
