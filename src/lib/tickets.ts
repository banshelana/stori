import type { Contact, TicketReply, TicketStatus } from "@/lib/data/commerce";

// ---------------------------------------------------------------
// Support ticket rules, kept pure.
//
// The opening message lives on the Contact itself and every later
// message is a TicketReply, so the thread has to be assembled rather
// than simply listed — that assembly is here so the admin view and any
// customer-facing view can never render it differently.
// ---------------------------------------------------------------

export interface ThreadEntry {
  id: string;
  author: "customer" | "staff";
  authorName: string;
  body: string;
  createdAt: string;
  /** True for the message that opened the ticket. */
  opening: boolean;
}

export function buildThread(
  contact: Contact,
  replies: TicketReply[]
): ThreadEntry[] {
  const opening: ThreadEntry = {
    id: `${contact.id}-opening`,
    author: "customer",
    authorName: contact.name,
    body: contact.body,
    createdAt: contact.createdAt,
    opening: true,
  };

  const rest = replies
    .filter((r) => r.contactId === contact.id)
    .map((r) => ({
      id: r.id,
      author: r.author,
      authorName: r.authorName,
      body: r.body,
      createdAt: r.createdAt,
      opening: false,
    }))
    // Ties keep insertion order, which for same-day replies is the only
    // ordering information there is.
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return [opening, ...rest];
}

/**
 * Status after a message is added.
 *
 * A staff reply puts the ball in the customer's court (pending); a
 * customer reply puts it back in ours (open) — including on a ticket
 * that had been resolved, because a follow-up means it was not.
 */
export function statusAfterReply(
  current: TicketStatus,
  author: "customer" | "staff"
): TicketStatus {
  if (author === "staff") return "pending";
  return current === "resolved" ? "open" : current;
}

/** Tickets needing a staff response, oldest first. */
export function needsResponse(contacts: Contact[]): Contact[] {
  return contacts
    .filter((c) => c.status === "open")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function replyCount(
  contactId: string,
  replies: TicketReply[]
): number {
  return replies.filter((r) => r.contactId === contactId).length;
}

/** Who spoke last — the fastest read on whether a ticket is waiting on us. */
export function lastAuthor(
  contact: Contact,
  replies: TicketReply[]
): "customer" | "staff" {
  const thread = buildThread(contact, replies);
  return thread[thread.length - 1].author;
}

export const TICKET_STATUS_TONE: Record<
  TicketStatus,
  "danger" | "warning" | "success"
> = {
  open: "danger",
  pending: "warning",
  resolved: "success",
};
