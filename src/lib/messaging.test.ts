import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOCK_TEMPLATES } from "@/lib/data/sms-templates";
import {
  hasSubject,
  isValidRecipient,
  messageCost,
  normalizeRecipient,
  parseEmails,
  recipientFieldFor,
} from "@/lib/messaging";

describe("recipient validation per channel", () => {
  it("accepts a mobile for sms and rejects it for email", () => {
    assert.equal(isValidRecipient("sms", "09120000005"), true);
    assert.equal(isValidRecipient("email", "09120000005"), false);
  });

  it("accepts an address for email and rejects it for sms", () => {
    assert.equal(isValidRecipient("email", "a@b.co"), true);
    assert.equal(isValidRecipient("sms", "a@b.co"), false);
  });

  it("normalises per channel", () => {
    assert.equal(normalizeRecipient("sms", "+98 912 000 0005"), "09120000005");
    assert.equal(normalizeRecipient("email", "  A@B.CO "), "a@b.co");
  });

  it("rejects near-misses rather than guessing", () => {
    for (const bad of ["a@b", "a b@c.co", "@b.co", "a@.co", "plain"]) {
      assert.equal(isValidRecipient("email", bad), false, bad);
    }
  });
});

describe("email parsing", () => {
  it("splits on commas, semicolons and whitespace", () => {
    const { valid } = parseEmails("a@b.co, c@d.co;e@f.co\ng@h.co i@j.co");
    assert.equal(valid.length, 5);
  });

  it("deduplicates case-insensitively", () => {
    assert.deepEqual(parseEmails("A@B.co, a@b.CO").valid, ["a@b.co"]);
  });

  it("reports bad entries", () => {
    const { valid, invalid } = parseEmails("a@b.co, nope, 09120000005");
    assert.deepEqual(valid, ["a@b.co"]);
    assert.deepEqual(invalid, ["nope", "09120000005"]);
  });
});

describe("cost model", () => {
  it("counts segments for sms", () => {
    const cost = messageCost("sms", "a".repeat(161));
    assert.equal(cost.segments, 2);
    assert.equal(cost.encoding, "GSM-7");
    assert.equal(cost.limit, 153);
  });

  it("charges Persian sms at the UCS-2 rate", () => {
    const cost = messageCost("sms", "س".repeat(71));
    assert.equal(cost.segments, 2);
    assert.equal(cost.encoding, "UCS-2");
  });

  it("reports no segment model for email", () => {
    // Inventing a segment count for email would imply a cost that does
    // not exist.
    const cost = messageCost("email", "a".repeat(5000));
    assert.equal(cost.segments, null);
    assert.equal(cost.encoding, null);
    assert.equal(cost.limit, null);
    assert.equal(cost.length, 5000);
  });
});

describe("channel traits", () => {
  it("gives only email a subject", () => {
    assert.equal(hasSubject("email"), true);
    assert.equal(hasSubject("sms"), false);
  });

  it("maps a channel to the contact field it uses", () => {
    assert.equal(recipientFieldFor("sms"), "mobile");
    assert.equal(recipientFieldFor("email"), "email");
  });
});

describe("seeded templates", () => {
  it("gives a subject to exactly the email templates", () => {
    // A subject on an SMS template implies a field that channel does not
    // have; an email template without one cannot be sent.
    for (const template of MOCK_TEMPLATES) {
      assert.equal(
        Boolean(template.subject),
        hasSubject(template.channel),
        `${template.id} (${template.channel})`
      );
    }
  });

  it("covers both channels", () => {
    const channels = new Set(MOCK_TEMPLATES.map((t) => t.channel));
    assert.ok(channels.has("sms"));
    assert.ok(channels.has("email"));
  });

  it("has a name and body in both locales", () => {
    for (const template of MOCK_TEMPLATES) {
      for (const lang of ["en", "fa"] as const) {
        assert.ok(template.name[lang]?.trim(), `${template.id} name.${lang}`);
        assert.ok(template.body[lang]?.trim(), `${template.id} body.${lang}`);
        if (template.subject) {
          assert.ok(
            template.subject[lang]?.trim(),
            `${template.id} subject.${lang}`
          );
        }
      }
    }
  });
});
