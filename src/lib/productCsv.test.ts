import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTRIBUTE_PREFIX,
  CSV_COLUMNS,
  csvTemplate,
  parseCsv,
  planImport,
  productsToCsv,
  slugify,
  type ImportMessage,
} from "@/lib/productCsv";
import type { Brand, Category, Product } from "@/lib/types";

const CATEGORIES: Category[] = [
  {
    id: "cat-1",
    name: { en: "Audio", fa: "صوتی" },
    slug: "audio",
    filters: [
      {
        key: "connectivity",
        kind: "multi",
        label: { en: "Connectivity", fa: "اتصال" },
        options: [
          { value: "bluetooth", label: { en: "Bluetooth", fa: "بلوتوث" } },
          { value: "wired", label: { en: "Wired", fa: "سیمی" } },
        ],
      },
      {
        key: "batteryHours",
        kind: "range",
        label: { en: "Battery", fa: "باتری" },
        min: 0,
        max: 60,
      },
      {
        key: "noiseCancelling",
        kind: "boolean",
        label: { en: "ANC", fa: "حذف نویز" },
      },
    ],
  },
  {
    id: "cat-2",
    name: { en: "Wearables", fa: "پوشیدنی" },
    slug: "wearables",
    filters: [],
  },
];

const BRANDS: Brand[] = [
  { id: "b-aurora", name: "Aurora", slug: "aurora" },
  { id: "b-pulse", name: "Pulse", slug: "pulse" },
];

function product(over: Partial<Product> = {}): Product {
  return {
    id: "p-001",
    slug: "aurora-headphones",
    title: { en: "Aurora Headphones", fa: "هدفون آرورا" },
    description: { en: "Over-ear", fa: "روگوشی" },
    price: 19900,
    compareAtPrice: 24900,
    currency: "EUR",
    brandId: "b-aurora",
    attributes: { connectivity: ["bluetooth", "wired"], batteryHours: 40 },
    images: [{ id: "img-a", src: "/images/headphones.svg" }],
    primaryImageId: "img-a",
    active: true,
    adjustments: [],
    categoryId: "cat-1",
    tags: ["audio", "bluetooth"],
    stock: 24,
    featured: true,
    createdAt: "2026-01-01",
    ...over,
  };
}

/** Header row plus body, as `planImport` wants it. */
function sheet(header: string[], ...rows: string[][]): string[][] {
  return [header, ...rows];
}

function plan(rows: string[][], products: Product[] = []) {
  return planImport(rows, {
    products,
    categories: CATEGORIES,
    brands: BRANDS,
  });
}

function codes(issues: { message: ImportMessage }[]): string[] {
  return issues.map((i) => i.message.code);
}

// ---------------------------------------------------------------

describe("slugify", () => {
  it("lowercases and dashes", () => {
    assert.equal(slugify("Aurora Wireless Headphones"), "aurora-wireless-headphones");
  });

  it("strips leading and trailing dashes", () => {
    assert.equal(slugify("  !Hello!  "), "hello");
  });

  it("returns empty for a title with nothing latin in it", () => {
    assert.equal(slugify("هدفون"), "");
  });
});

describe("parseCsv", () => {
  it("reads a plain grid", () => {
    assert.deepEqual(parseCsv("a,b\n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas inside quotes", () => {
    assert.deepEqual(parseCsv('a,b\n"one, two",3'), [
      ["a", "b"],
      ["one, two", "3"],
    ]);
  });

  it("keeps newlines inside quotes", () => {
    assert.deepEqual(parseCsv('a\n"line one\nline two"'), [
      ["a"],
      ["line one\nline two"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    assert.deepEqual(parseCsv('a\n"say ""hi"""'), [["a"], ['say "hi"']]);
  });

  it("treats CRLF as one row break", () => {
    assert.deepEqual(parseCsv("a,b\r\n1,2\r\n"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops blank lines rather than emitting empty products", () => {
    assert.deepEqual(parseCsv("a\n1\n\n\n2\n"), [["a"], ["1"], ["2"]]);
  });

  it("strips the BOM so the first header still matches", () => {
    const [header] = parseCsv("﻿id,slug\np-1,x");
    assert.equal(header[0], "id");
  });
});

describe("productsToCsv", () => {
  it("round-trips through the parser", () => {
    const { csv } = productsToCsv([product()]);
    const rows = parseCsv(csv);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0].slice(0, 2), ["id", "slug"]);
  });

  it("writes every core column", () => {
    const rows = parseCsv(productsToCsv([product()]).csv);
    for (const column of CSV_COLUMNS) {
      assert.ok(rows[0].includes(column), `missing ${column}`);
    }
  });

  it("exports image paths so they can be reattached later", () => {
    const rows = parseCsv(productsToCsv([product()]).csv);
    const at = rows[0].indexOf("images");
    assert.equal(rows[1][at], "/images/headphones.svg");
    assert.equal(rows[1][rows[0].indexOf("primaryImage")], "/images/headphones.svg");
  });

  it("replaces inline uploads with a reference and reports the count", () => {
    const result = productsToCsv([
      product({
        images: [{ id: "img-up", src: "data:image/png;base64,AAAA" }],
        primaryImageId: "img-up",
      }),
    ]);
    const rows = parseCsv(result.csv);
    assert.equal(rows[1][rows[0].indexOf("images")], "uploaded:img-up");
    assert.equal(result.inlineImageCount, 1);
  });

  it("keeps a Persian title intact", () => {
    const rows = parseCsv(productsToCsv([product()]).csv);
    assert.equal(rows[1][rows[0].indexOf("title.fa")], "هدفون آرورا");
  });

  it("quotes a description containing a comma", () => {
    const { csv } = productsToCsv([
      product({ description: { en: "Big, loud", fa: "بلند" } }),
    ]);
    const rows = parseCsv(csv);
    assert.equal(rows[1][rows[0].indexOf("description.en")], "Big, loud");
  });

  it("joins multi-valued attributes into one cell", () => {
    const rows = parseCsv(productsToCsv([product()]).csv);
    const at = rows[0].indexOf(`${ATTRIBUTE_PREFIX}connectivity`);
    assert.equal(rows[1][at], "bluetooth;wired");
  });

  it("takes the union of attribute columns across products", () => {
    const rows = parseCsv(
      productsToCsv([
        product({ attributes: { connectivity: "wired" } }),
        product({ id: "p-002", slug: "b", attributes: { weight: 300 } }),
      ]).csv
    );
    assert.ok(rows[0].includes(`${ATTRIBUTE_PREFIX}connectivity`));
    assert.ok(rows[0].includes(`${ATTRIBUTE_PREFIX}weight`));
    // The product without the column still produces a cell, just an empty one.
    assert.equal(rows[1][rows[0].indexOf(`${ATTRIBUTE_PREFIX}weight`)], "");
  });

  it("serialises adjustments as JSON that survives the round trip", () => {
    const rows = parseCsv(
      productsToCsv([
        product({
          adjustments: [
            {
              id: "adj-1",
              kind: "discount",
              mode: "percent",
              value: 15,
              label: "Autumn, sale",
              startsAt: "2026-08-01",
              endsAt: null,
              active: true,
            },
          ],
        }),
      ]).csv
    );
    const parsed = JSON.parse(rows[1][rows[0].indexOf("adjustments")]);
    assert.equal(parsed[0].label, "Autumn, sale");
    assert.equal(parsed[0].value, 15);
  });

  it("writes an empty compareAtPrice rather than the word null", () => {
    const rows = parseCsv(
      productsToCsv([product({ compareAtPrice: null })]).csv
    );
    assert.equal(rows[1][rows[0].indexOf("compareAtPrice")], "");
  });
});

describe("csvTemplate", () => {
  it("has headers and no rows", () => {
    const rows = parseCsv(csvTemplate(CATEGORIES));
    assert.equal(rows.length, 1);
  });

  it("offers a column for every facet the categories declare", () => {
    const [header] = parseCsv(csvTemplate(CATEGORIES));
    assert.ok(header.includes(`${ATTRIBUTE_PREFIX}connectivity`));
    assert.ok(header.includes(`${ATTRIBUTE_PREFIX}batteryHours`));
  });

  it("is importable as an empty plan", () => {
    const result = plan(parseCsv(csvTemplate(CATEGORIES)));
    assert.equal(result.missingColumns.length, 0);
    assert.equal(result.rows.length, 0);
  });
});

describe("planImport — headers", () => {
  it("refuses a file with no required columns", () => {
    const result = plan(sheet(["name", "cost"], ["Lamp", "10"]));
    assert.deepEqual(result.missingColumns, ["title.en", "price", "categoryId"]);
    assert.equal(result.rows.length, 0);
  });

  it("reports unrecognised columns without failing", () => {
    const result = plan(
      sheet(
        ["title.en", "price", "categoryId", "warehouseBay"],
        ["Lamp", "1000", "cat-1", "B12"]
      )
    );
    assert.deepEqual(result.unknownColumns, ["warehouseBay"]);
    assert.equal(result.createCount, 1);
  });

  it("survives an empty file", () => {
    const result = plan([]);
    assert.equal(result.rows.length, 0);
    assert.equal(result.missingColumns.length, 3);
  });
});

describe("planImport — creating", () => {
  const header = ["title.en", "title.fa", "price", "categoryId"];

  it("plans a create when nothing matches", () => {
    const result = plan(sheet(header, ["Desk Lamp", "چراغ", "4500", "cat-1"]));
    assert.equal(result.createCount, 1);
    assert.equal(result.rows[0].action, "create");
    assert.equal(result.rows[0].draft?.price, 4500);
  });

  it("derives the slug from the English title when none is given", () => {
    const result = plan(sheet(header, ["Desk Lamp", "چراغ", "4500", "cat-1"]));
    assert.equal(result.rows[0].draft?.slug, "desk-lamp");
  });

  it("accepts a category slug in place of its id", () => {
    const result = plan(sheet(header, ["Lamp", "چراغ", "4500", "audio"]));
    assert.equal(result.rows[0].draft?.categoryId, "cat-1");
  });

  it("falls back to the English title when the Persian one is blank", () => {
    const result = plan(sheet(header, ["Desk Lamp", "", "4500", "cat-1"]));
    assert.equal(result.rows[0].draft?.title.fa, "Desk Lamp");
  });

  it("defaults an absent active column to true", () => {
    const result = plan(sheet(header, ["Lamp", "چراغ", "4500", "cat-1"]));
    assert.equal(result.rows[0].draft?.active, true);
  });

  it("defaults stock to zero rather than leaving it undefined", () => {
    const result = plan(sheet(header, ["Lamp", "چراغ", "4500", "cat-1"]));
    assert.equal(result.rows[0].draft?.stock, 0);
  });

  it("reads Persian digits in a price", () => {
    const result = plan(sheet(header, ["Lamp", "چراغ", "۴۵۰۰", "cat-1"]));
    assert.equal(result.rows[0].draft?.price, 4500);
  });

  it("splits tags on the list separator", () => {
    const result = plan(
      sheet(
        [...header, "tags"],
        ["Lamp", "چراغ", "4500", "cat-1", "home; lighting ;"]
      )
    );
    assert.deepEqual(result.rows[0].draft?.tags, ["home", "lighting"]);
  });

  it("resolves a brand by slug and leaves an empty cell null", () => {
    const result = plan(
      sheet(
        [...header, "brandId"],
        ["Lamp", "چراغ", "4500", "cat-1", "aurora"],
        ["Torch", "مشعل", "900", "cat-1", ""]
      )
    );
    assert.equal(result.rows[0].draft?.brandId, "b-aurora");
    assert.equal(result.rows[1].draft?.brandId, null);
  });
});

describe("planImport — images", () => {
  const header = ["title.en", "price", "categoryId", "images", "primaryImage"];

  it("never puts images on a created product", () => {
    const result = plan(
      sheet(header, ["Lamp", "4500", "cat-1", "/images/lamp.svg", "/images/lamp.svg"])
    );
    const draft = result.rows[0].draft;
    assert.ok(draft);
    assert.ok(!("images" in draft));
    assert.ok(!("primaryImageId" in draft));
  });

  it("warns rather than failing when a file supplies images", () => {
    const result = plan(
      sheet(header, ["Lamp", "4500", "cat-1", "/images/lamp.svg", ""])
    );
    assert.equal(result.rows[0].action, "create");
    assert.deepEqual(codes(result.rows[0].warnings), ["imagesIgnored"]);
  });

  it("stays quiet when the image columns are empty", () => {
    const result = plan(sheet(header, ["Lamp", "4500", "cat-1", "", ""]));
    assert.deepEqual(result.rows[0].warnings, []);
  });

  it("leaves an existing gallery untouched on update", () => {
    const existing = product();
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId", "images"],
        ["p-001", "Aurora Headphones", "17900", "cat-1", ""]
      ),
      [existing]
    );
    const draft = result.rows[0].draft;
    assert.equal(result.rows[0].action, "update");
    assert.ok(draft);
    // No gallery key at all, so a patch cannot clear what is already there.
    assert.ok(!("images" in draft));
    assert.equal(existing.images.length, 1);
  });
});

describe("planImport — updating", () => {
  it("matches an existing product by id", () => {
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId"],
        ["p-001", "Renamed", "9900", "cat-1"]
      ),
      [product()]
    );
    assert.equal(result.rows[0].action, "update");
    assert.equal(result.rows[0].existing?.id, "p-001");
    assert.equal(result.updateCount, 1);
  });

  it("matches by slug when no id is given", () => {
    const result = plan(
      sheet(
        ["slug", "title.en", "price", "categoryId"],
        ["aurora-headphones", "Aurora Headphones", "9900", "cat-1"]
      ),
      [product()]
    );
    assert.equal(result.rows[0].action, "update");
  });

  it("lets an id-matched row change the slug", () => {
    const result = plan(
      sheet(
        ["id", "slug", "title.en", "price", "categoryId"],
        ["p-001", "aurora-headphones-v2", "Aurora", "9900", "cat-1"]
      ),
      [product()]
    );
    assert.equal(result.rows[0].action, "update");
    assert.equal(result.rows[0].draft?.slug, "aurora-headphones-v2");
  });

  it("keeps the existing currency when the column is absent", () => {
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId"],
        ["p-001", "Aurora", "9900", "cat-1"]
      ),
      [product({ currency: "IRR" })]
    );
    assert.equal(result.rows[0].draft?.currency, "IRR");
  });

  it("keeps the existing active flag when the cell is blank", () => {
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId", "active"],
        ["p-001", "Aurora", "9900", "cat-1", ""]
      ),
      [product({ active: false })]
    );
    assert.equal(result.rows[0].draft?.active, false);
  });

  it("leaves adjustments alone when the file has no such column", () => {
    const existing = product({
      adjustments: [
        {
          id: "adj-1",
          kind: "tax",
          mode: "percent",
          value: 9,
          label: "VAT",
          startsAt: null,
          endsAt: null,
          active: true,
        },
      ],
    });
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId"],
        ["p-001", "Aurora", "9900", "cat-1"]
      ),
      [existing]
    );
    // A three-column price correction must not strip the price rules off
    // every product it touches.
    assert.deepEqual(result.rows[0].draft?.adjustments, existing.adjustments);
  });

  it("clears adjustments when the column is present but empty", () => {
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId", "adjustments"],
        ["p-001", "Aurora", "9900", "cat-1", ""]
      ),
      [product({ adjustments: [] })]
    );
    assert.deepEqual(result.rows[0].draft?.adjustments, []);
  });

  it("leaves tags, brand and stock alone when their columns are absent", () => {
    const existing = product();
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId"],
        ["p-001", "Aurora", "9900", "cat-1"]
      ),
      [existing]
    );
    const draft = result.rows[0].draft;
    assert.deepEqual(draft?.tags, existing.tags);
    assert.equal(draft?.brandId, existing.brandId);
    assert.equal(draft?.stock, existing.stock);
    assert.equal(draft?.compareAtPrice, existing.compareAtPrice);
    assert.deepEqual(draft?.description, existing.description);
  });

  it("leaves untouched facets in place when one facet column is given", () => {
    const existing = product({
      attributes: { connectivity: "wired", batteryHours: 40 },
    });
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId", `${ATTRIBUTE_PREFIX}batteryHours`],
        ["p-001", "Aurora", "9900", "cat-1", "50"]
      ),
      [existing]
    );
    assert.deepEqual(result.rows[0].draft?.attributes, {
      connectivity: "wired",
      batteryHours: 50,
    });
  });

  it("clears one facet when its column is present but empty", () => {
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId", `${ATTRIBUTE_PREFIX}batteryHours`],
        ["p-001", "Aurora", "9900", "cat-1", ""]
      ),
      [product({ attributes: { connectivity: "wired", batteryHours: 40 } })]
    );
    assert.deepEqual(result.rows[0].draft?.attributes, { connectivity: "wired" });
  });

  it("still starts a created product from nothing, not from a neighbour", () => {
    const result = plan(
      sheet(["title.en", "price", "categoryId"], ["Lamp", "4500", "cat-1"]),
      [product()]
    );
    const draft = result.rows[0].draft;
    assert.equal(result.rows[0].action, "create");
    assert.deepEqual(draft?.tags, []);
    assert.deepEqual(draft?.attributes, {});
    assert.deepEqual(draft?.adjustments, []);
    assert.equal(draft?.brandId, null);
    assert.equal(draft?.compareAtPrice, null);
  });

  it("clears tags when the column is present but empty", () => {
    const result = plan(
      sheet(
        ["id", "title.en", "price", "categoryId", "tags"],
        ["p-001", "Aurora", "9900", "cat-1", ""]
      ),
      [product()]
    );
    assert.deepEqual(result.rows[0].draft?.tags, []);
  });
});

describe("planImport — rejecting bad rows", () => {
  const header = ["id", "slug", "title.en", "price", "categoryId"];

  it("rejects a row with no English title", () => {
    const result = plan(sheet(header, ["", "lamp", "", "4500", "cat-1"]));
    assert.equal(result.rows[0].action, "error");
    assert.ok(codes(result.rows[0].errors).includes("required"));
  });

  it("rejects an unknown category", () => {
    const result = plan(sheet(header, ["", "lamp", "Lamp", "4500", "cat-9"]));
    assert.deepEqual(codes(result.rows[0].errors), ["unknownCategory"]);
  });

  it("rejects an unknown brand", () => {
    const result = plan(
      sheet(
        [...header, "brandId"],
        ["", "lamp", "Lamp", "4500", "cat-1", "b-nope"]
      )
    );
    assert.deepEqual(codes(result.rows[0].errors), ["unknownBrand"]);
  });

  it("rejects an id that matches nothing, rather than quietly creating", () => {
    const result = plan(
      sheet(header, ["p-404", "lamp", "Lamp", "4500", "cat-1"]),
      [product()]
    );
    assert.deepEqual(codes(result.rows[0].errors), ["unknownId"]);
  });

  it("rejects a non-numeric price", () => {
    const result = plan(sheet(header, ["", "lamp", "Lamp", "cheap", "cat-1"]));
    assert.deepEqual(codes(result.rows[0].errors), ["notANumber"]);
  });

  it("rejects a negative price", () => {
    const result = plan(sheet(header, ["", "lamp", "Lamp", "-1", "cat-1"]));
    assert.deepEqual(codes(result.rows[0].errors), ["negative"]);
  });

  it("rejects a missing price", () => {
    const result = plan(sheet(header, ["", "lamp", "Lamp", "", "cat-1"]));
    assert.deepEqual(codes(result.rows[0].errors), ["required"]);
  });

  it("treats a slug-only match as an update, not a collision", () => {
    const result = plan(
      sheet(header, ["", "aurora-headphones", "Renamed", "4500", "cat-1"]),
      [product()]
    );
    assert.equal(result.rows[0].action, "update");
  });

  it("rejects renaming one product onto another product's slug", () => {
    const result = plan(
      sheet(header, ["p-002", "aurora-headphones", "Pulse", "4500", "cat-1"]),
      [product(), product({ id: "p-002", slug: "pulse-buds" })]
    );
    assert.ok(codes(result.rows[0].errors).includes("slugTaken"));
  });

  it("rejects the second of two rows claiming one slug", () => {
    const result = plan(
      sheet(
        header,
        ["", "lamp", "Lamp", "4500", "cat-1"],
        ["", "lamp", "Lamp Two", "4600", "cat-1"]
      )
    );
    assert.equal(result.rows[0].action, "create");
    assert.equal(result.rows[1].action, "error");
    const issue = result.rows[1].errors[0].message;
    assert.equal(issue.code, "duplicateSlug");
    // Points at the line that took it, so the operator knows where to look.
    assert.equal("value" in issue && issue.value, "2");
  });

  it("rejects malformed adjustment JSON", () => {
    const result = plan(
      sheet(
        [...header, "adjustments"],
        ["", "lamp", "Lamp", "4500", "cat-1", "[{oops"]
      )
    );
    assert.deepEqual(codes(result.rows[0].errors), ["badJson"]);
  });

  it("rejects an adjustment with an unknown kind", () => {
    const result = plan(
      sheet(
        [...header, "adjustments"],
        [
          "",
          "lamp",
          "Lamp",
          "4500",
          "cat-1",
          '[{"kind":"bribe","mode":"percent","value":5}]',
        ]
      )
    );
    assert.deepEqual(codes(result.rows[0].errors), ["badAdjustment"]);
  });

  it("keeps good rows importable alongside broken ones", () => {
    const result = plan(
      sheet(
        header,
        ["", "good", "Good", "4500", "cat-1"],
        ["", "bad", "Bad", "4500", "cat-99"],
        ["", "also-good", "Also Good", "1000", "cat-2"]
      )
    );
    assert.equal(result.createCount, 2);
    assert.equal(result.errorCount, 1);
    assert.equal(result.rows[1].draft, undefined);
  });

  it("numbers rows by their line in the file, header included", () => {
    const result = plan(
      sheet(
        header,
        ["", "a", "A", "1", "cat-1"],
        ["", "b", "B", "2", "cat-1"]
      )
    );
    assert.deepEqual(
      result.rows.map((r) => r.line),
      [2, 3]
    );
  });
});

describe("planImport — attributes", () => {
  const header = ["title.en", "price", "categoryId"];

  it("reads a single value as a primitive", () => {
    const result = plan(
      sheet(
        [...header, `${ATTRIBUTE_PREFIX}batteryHours`],
        ["Lamp", "4500", "cat-1", "40"]
      )
    );
    assert.equal(result.rows[0].draft?.attributes.batteryHours, 40);
  });

  it("reads a separated cell as an array", () => {
    const result = plan(
      sheet(
        [...header, `${ATTRIBUTE_PREFIX}connectivity`],
        ["Lamp", "4500", "cat-1", "bluetooth;wired"]
      )
    );
    assert.deepEqual(result.rows[0].draft?.attributes.connectivity, [
      "bluetooth",
      "wired",
    ]);
  });

  it("coerces true and false to booleans", () => {
    const result = plan(
      sheet(
        [...header, `${ATTRIBUTE_PREFIX}noiseCancelling`],
        ["Lamp", "4500", "cat-1", "TRUE"]
      )
    );
    assert.equal(result.rows[0].draft?.attributes.noiseCancelling, true);
  });

  it("omits an attribute whose cell is empty", () => {
    const result = plan(
      sheet(
        [...header, `${ATTRIBUTE_PREFIX}batteryHours`],
        ["Lamp", "4500", "cat-1", ""]
      )
    );
    assert.deepEqual(result.rows[0].draft?.attributes, {});
  });

  it("warns about an attribute the category does not declare", () => {
    const result = plan(
      sheet(
        [...header, `${ATTRIBUTE_PREFIX}connectivity`],
        ["Watch", "4500", "cat-2", "bluetooth"]
      )
    );
    assert.equal(result.rows[0].action, "create");
    assert.deepEqual(codes(result.rows[0].warnings), ["unknownAttribute"]);
    // Still stored — it is unreachable by filters, not invalid.
    assert.equal(result.rows[0].draft?.attributes.connectivity, "bluetooth");
  });

  it("stays quiet for an attribute the category declares", () => {
    const result = plan(
      sheet(
        [...header, `${ATTRIBUTE_PREFIX}connectivity`],
        ["Lamp", "4500", "cat-1", "bluetooth"]
      )
    );
    assert.deepEqual(result.rows[0].warnings, []);
  });
});

describe("export then import", () => {
  it("plans every exported product as an update, not a duplicate", () => {
    const products = [
      product(),
      product({ id: "p-002", slug: "pulse-buds", brandId: "b-pulse" }),
    ];
    const result = plan(parseCsv(productsToCsv(products).csv), products);
    assert.equal(result.updateCount, 2);
    assert.equal(result.createCount, 0);
    assert.equal(result.errorCount, 0);
  });

  it("preserves the values that made the round trip", () => {
    const original = product({
      adjustments: [
        {
          id: "adj-1",
          kind: "tax",
          mode: "percent",
          value: 9,
          label: "VAT",
          startsAt: null,
          endsAt: null,
          active: true,
        },
      ],
    });
    const result = plan(parseCsv(productsToCsv([original]).csv), [original]);
    const draft = result.rows[0].draft;

    assert.equal(draft?.price, original.price);
    assert.equal(draft?.compareAtPrice, original.compareAtPrice);
    assert.equal(draft?.stock, original.stock);
    assert.equal(draft?.featured, original.featured);
    assert.equal(draft?.active, original.active);
    assert.equal(draft?.brandId, original.brandId);
    assert.deepEqual(draft?.title, original.title);
    assert.deepEqual(draft?.tags, original.tags);
    assert.deepEqual(draft?.attributes, original.attributes);
    assert.deepEqual(draft?.adjustments, original.adjustments);
  });

  it("warns that the exported image paths will not be written back", () => {
    const products = [product()];
    const result = plan(parseCsv(productsToCsv(products).csv), products);
    assert.deepEqual(codes(result.rows[0].warnings), ["imagesIgnored"]);
  });
});
