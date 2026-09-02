import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildThread,
  lastAuthor,
  needsResponse,
  replyCount,
  statusAfterReply,
} from "@/lib/tickets";
import type { Contact, TicketReply } from "@/lib/data/commerce";

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "c-1",
    name: "Neda",
    email: "n@example.com",
    mobile: "09120000005",
    subject: "Broken",
    body: "It arrived broken.",
    status: "open",
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
    ...overrides,
  };
}

const replies: TicketReply[] = [
  {
    id: "r-2",
    contactId: "c-1",
    author: "customer",
    authorName: "Neda",
    body: "Here is the photo.",
    createdAt: "2026-08-03",
  },
  {
    id: "r-1",
    contactId: "c-1",
    author: "staff",
    authorName: "Mina",
    body: "Could you send a photo?",
    createdAt: "2026-08-02",
  },
  {
    id: "r-3",
    contactId: "c-other",
    author: "staff",
    authorName: "Mina",
    body: "Different ticket.",
    createdAt: "2026-08-04",
  },
];

describe("thread assembly", () => {
  it("puts the opening message first and marks it", () => {
    const thread = buildThread(contact(), replies);
    assert.equal(thread[0].body, "It arrived broken.");
    assert.equal(thread[0].opening, true);
    assert.equal(thread[0].author, "customer");
  });

  it("orders replies chronologically regardless of array order", () => {
    const thread = buildThread(contact(), replies);
    assert.deepEqual(
      thread.map((e) => e.createdAt),
      ["2026-08-01", "2026-08-02", "2026-08-03"]
    );
  });

  it("excludes replies belonging to other tickets", () => {
    const thread = buildThread(contact(), replies);
    assert.equal(thread.length, 3);
    assert.ok(!thread.some((e) => e.body === "Different ticket."));
  });

  it("renders a thread with no replies as just the opening message", () => {
    assert.equal(buildThread(contact(), []).length, 1);
  });
});

describe("status transitions", () => {
  it("moves to pending when staff replies", () => {
    assert.equal(statusAfterReply("open", "staff"), "pending");
    assert.equal(statusAfterReply("resolved", "staff"), "pending");
  });

  it("reopens a resolved ticket when the customer follows up", () => {
    // A follow-up on a resolved ticket means it was not resolved.
    assert.equal(statusAfterReply("resolved", "customer"), "open");
  });

  it("leaves a pending ticket pending when the customer replies", () => {
    assert.equal(statusAfterReply("pending", "customer"), "pending");
  });
});

describe("queue helpers", () => {
  it("lists only open tickets, oldest first", () => {
    const list = [
      contact({ id: "a", status: "open", createdAt: "2026-08-05" }),
      contact({ id: "b", status: "pending", createdAt: "2026-08-01" }),
      contact({ id: "c", status: "open", createdAt: "2026-08-02" }),
      contact({ id: "d", status: "resolved", createdAt: "2026-07-01" }),
    ];
    assert.deepEqual(needsResponse(list).map((c) => c.id), ["c", "a"]);
  });

  it("counts replies per ticket", () => {
    assert.equal(replyCount("c-1", replies), 2);
    assert.equal(replyCount("c-none", replies), 0);
  });

  it("reports who spoke last", () => {
    assert.equal(lastAuthor(contact(), replies), "customer");
    assert.equal(lastAuthor(contact(), []), "customer", "the opener");
    assert.equal(
      lastAuthor(contact(), [replies[1]]),
      "staff",
      "staff replied most recently"
    );
  });
});
