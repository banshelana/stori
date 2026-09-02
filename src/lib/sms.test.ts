import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPlaceholders,
  billableLength,
  detectEncoding,
  isValidNumber,
  normalizeNumber,
  parseNumbers,
  segmentInfo,
  unresolvedFor,
  usedPlaceholders,
} from "@/lib/sms";

describe("encoding detection", () => {
  it("treats plain Latin as GSM-7", () => {
    assert.equal(detectEncoding("Your order has shipped."), "GSM-7");
  });

  it("switches to UCS-2 for Persian", () => {
    assert.equal(detectEncoding("سفارش شما ارسال شد"), "UCS-2");
  });

  it("switches to UCS-2 for a single non-GSM character", () => {
    // One Persian character in an otherwise Latin message is enough.
    assert.equal(detectEncoding("Order ش shipped"), "UCS-2");
    assert.equal(detectEncoding("Deal — today"), "UCS-2"); // em dash
  });

  it("keeps GSM-7 for accented characters that are in the alphabet", () => {
    assert.equal(detectEncoding("Café Ähnlich"), "GSM-7");
  });
});

describe("billable length", () => {
  it("charges extended GSM characters double", () => {
    assert.equal(billableLength("abc", "GSM-7"), 3);
    // { } [ ] ~ ^ \ | € each occupy two slots.
    assert.equal(billableLength("a{b}", "GSM-7"), 6);
  });

  it("counts UTF-16 units in UCS-2", () => {
    assert.equal(billableLength("سلام", "UCS-2"), 4);
  });
});

describe("segmentation", () => {
  it("reports an empty message as zero segments", () => {
    const info = segmentInfo("");
    assert.equal(info.segments, 0);
    assert.equal(info.remaining, 160);
  });

  it("fits 160 GSM-7 characters in one segment", () => {
    const info = segmentInfo("a".repeat(160));
    assert.equal(info.segments, 1);
    assert.equal(info.remaining, 0);
  });

  it("drops to 153 per segment once concatenated", () => {
    const info = segmentInfo("a".repeat(161));
    assert.equal(info.segments, 2);
    assert.equal(info.limit, 153);
    assert.equal(info.remaining, 306 - 161);
  });

  it("fits only 70 Persian characters in one segment", () => {
    const single = segmentInfo("س".repeat(70));
    assert.equal(single.encoding, "UCS-2");
    assert.equal(single.segments, 1);

    const overflow = segmentInfo("س".repeat(71));
    assert.equal(overflow.segments, 2);
    assert.equal(overflow.limit, 67);
  });

  it("counts the whole message against the concatenated limit", () => {
    // 134 = 2 x 67 exactly, so it must not spill into a third segment.
    assert.equal(segmentInfo("س".repeat(134)).segments, 2);
    assert.equal(segmentInfo("س".repeat(135)).segments, 3);
  });
});

describe("placeholders", () => {
  const body = "Hi {firstName}, we called {mobile}. Thanks {firstName}!";

  it("lists each placeholder once, in order", () => {
    assert.deepEqual(usedPlaceholders(body), ["firstName", "mobile"]);
  });

  it("substitutes known values", () => {
    const out = applyPlaceholders(body, {
      firstName: "Neda",
      mobile: "09120000005",
    });
    assert.equal(out, "Hi Neda, we called 09120000005. Thanks Neda!");
  });

  it("leaves unknown tokens visible rather than blanking them", () => {
    const out = applyPlaceholders(body, { mobile: "0912" });
    assert.ok(out.includes("{firstName}"));
  });

  it("reports what a recipient cannot fill", () => {
    assert.deepEqual(unresolvedFor(body, { mobile: "0912" }), ["firstName"]);
    assert.deepEqual(
      unresolvedFor(body, { firstName: "Neda", mobile: "0912" }),
      []
    );
    // An empty string counts as unresolved, not as a valid value.
    assert.deepEqual(unresolvedFor(body, { firstName: "", mobile: "0912" }), [
      "firstName",
    ]);
  });
});

describe("recipient parsing", () => {
  it("normalises the common Iranian formats to one shape", () => {
    for (const input of [
      "09120000005",
      "+989120000005",
      "00989120000005",
      "9120000005",
      "0912 000 0005",
      "0912-000-0005",
    ]) {
      assert.equal(normalizeNumber(input), "09120000005", input);
    }
  });

  it("folds Persian digits", () => {
    assert.equal(normalizeNumber("۰۹۱۲۰۰۰۰۰۰۵"), "09120000005");
  });

  it("validates shape", () => {
    assert.equal(isValidNumber("09120000005"), true);
    assert.equal(isValidNumber("0812000005"), false);
    assert.equal(isValidNumber("123"), false);
  });

  it("splits on commas, semicolons, spaces and newlines", () => {
    const { valid } = parseNumbers(
      "09120000001, 09120000002;09120000003\n09120000004 09120000005"
    );
    assert.equal(valid.length, 5);
  });

  it("keeps a space-formatted number intact", () => {
    // Here a space groups digits rather than separating two numbers.
    const { valid, invalid } = parseNumbers("0912 111 2233");
    assert.deepEqual(valid, ["09121112233"]);
    assert.deepEqual(invalid, []);
  });

  it("still separates two space-separated numbers", () => {
    const { valid } = parseNumbers("09120000001 09120000002");
    assert.deepEqual(valid, ["09120000001", "09120000002"]);
  });

  it("handles formatted and separated numbers in one paste", () => {
    const { valid, invalid } = parseNumbers(
      "0912 111 2233, 0913 444 5566\n09120000001 09120000002, nope"
    );
    assert.deepEqual(valid, [
      "09121112233",
      "09134445566",
      "09120000001",
      "09120000002",
    ]);
    assert.deepEqual(invalid, ["nope"]);
  });

  it("deduplicates across formats", () => {
    const { valid } = parseNumbers("09120000005, +989120000005, 9120000005");
    assert.deepEqual(valid, ["09120000005"]);
  });

  it("reports bad entries instead of dropping them", () => {
    const { valid, invalid } = parseNumbers("09120000005, nope, 123");
    assert.deepEqual(valid, ["09120000005"]);
    assert.deepEqual(invalid, ["nope", "123"]);
  });
});
