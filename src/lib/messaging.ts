import type { MessageChannel } from "@/lib/data/commerce";
import { isValidNumber, normalizeNumber, segmentInfo } from "@/lib/sms";

// ---------------------------------------------------------------
// Channel-aware messaging rules.
//
// SMS and email share templates, placeholders and a send history, but
// differ in what a valid recipient is, whether a subject exists, and
// whether length costs money. This module holds those differences so
// the composer does not grow a switch in every branch.
// ---------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeRecipient(
  channel: MessageChannel,
  raw: string
): string {
  return channel === "sms"
    ? normalizeNumber(raw)
    : raw.trim().toLowerCase();
}

export function isValidRecipient(
  channel: MessageChannel,
  raw: string
): boolean {
  return channel === "sms"
    ? isValidNumber(raw)
    : EMAIL_PATTERN.test(raw.trim());
}

/**
 * Splits a pasted blob of addresses.
 *
 * Unlike phone numbers, whitespace inside an address is never valid, so
 * this can split on it unconditionally — the ambiguity that complicates
 * parseNumbers does not arise here.
 */
export function parseEmails(raw: string): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const token of raw.split(/[\s,;]+/)) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase();
    if (EMAIL_PATTERN.test(normalized)) {
      if (!valid.includes(normalized)) valid.push(normalized);
    } else {
      invalid.push(trimmed);
    }
  }

  return { valid, invalid };
}

export interface MessageCost {
  /** SMS only — email has no segment model. */
  segments: number | null;
  encoding: string | null;
  length: number;
  limit: number | null;
}

/**
 * What a message costs to send.
 *
 * Email has no per-length charge, so reporting a segment count there
 * would be inventing a constraint that does not exist.
 */
export function messageCost(
  channel: MessageChannel,
  body: string
): MessageCost {
  if (channel === "email") {
    return { segments: null, encoding: null, length: body.length, limit: null };
  }
  const info = segmentInfo(body);
  return {
    segments: info.segments,
    encoding: info.encoding,
    length: info.length,
    limit: info.limit,
  };
}

/** Whether a channel carries a subject line. */
export function hasSubject(channel: MessageChannel): boolean {
  return channel === "email";
}

/** The contact field a channel sends to. */
export function recipientFieldFor(
  channel: MessageChannel
): "mobile" | "email" {
  return channel === "sms" ? "mobile" : "email";
}
