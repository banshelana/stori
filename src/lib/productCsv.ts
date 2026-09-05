import { LOCALES } from "@/i18n/config";
import type { LocalizedText } from "@/i18n/localized";
import type {
  AttributeValue,
  Brand,
  Category,
  PriceAdjustment,
  Product,
} from "@/lib/types";
import { ADJUSTMENT_KINDS, ADJUSTMENT_MODES } from "@/lib/types";
import { toAsciiDigits } from "@/lib/validation";

// ---------------------------------------------------------------
// Bulk product import / export.
//
// CSV rather than JSON: the people who maintain a catalogue work in a
// spreadsheet. Nested structures are flattened into columns, with one
// exception — `adjustments` stays a JSON cell, because a price rule has
// five fields and a date range, and spreading that across twenty columns
// would be worse than a cell nobody edits by hand.
//
// Money is in minor units (cents), matching both `Product.price` and the
// number the admin already types into the product form. Converting only
// here would make the two screens disagree.
// ---------------------------------------------------------------

/** Cell separator for list-valued fields (tags, multi-attributes, images). */
export const LIST_SEPARATOR = ";";

/** Prefix marking a column as a category facet value. */
export const ATTRIBUTE_PREFIX = "attr.";

/** Excel needs this to read the file as UTF-8; without it Persian is mojibake. */
const BOM = "﻿";

/**
 * Columns written on export and understood on import, in order.
 *
 * `images` and `primaryImage` are exported but never imported — see
 * `planImport`. Any `attr.*` columns are appended after these.
 */
export const CSV_COLUMNS = [
  "id",
  "slug",
  ...LOCALES.map((l) => `title.${l}`),
  ...LOCALES.map((l) => `description.${l}`),
  "price",
  "compareAtPrice",
  "currency",
  "categoryId",
  "brandId",
  "tags",
  "stock",
  "active",
  "featured",
  "adjustments",
  "images",
  "primaryImage",
] as const;

/** Columns a file must carry for a row to mean anything. */
export const REQUIRED_COLUMNS = ["title.en", "price", "categoryId"] as const;

/** Columns accepted in a file but never written to a product. */
export const IGNORED_ON_IMPORT = ["images", "primaryImage"] as const;

// ---------------------------------------------------------------
// Parsing and serialising
// ---------------------------------------------------------------

/** Lowercase, dashes, no leading/trailing dash — matches the URL contract. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeCell(value: string): string {
  // Quote whenever the value could otherwise change the row's shape, and
  // when it starts or ends with whitespace a spreadsheet would trim away.
  return /[",\r\n]|^\s|\s$/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/**
 * RFC 4180 reader: quoted fields may contain commas, newlines and doubled
 * quotes. Blank lines are dropped, since a trailing newline is not a
 * product.
 */
export function parseCsv(text: string): string[][] {
  // Excel writes a BOM on UTF-8 files. Left in place it becomes part of
  // the first header name, and every column lookup misses.
  const input = text.startsWith(BOM) ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      // Swallow the \n of a \r\n pair rather than emitting a blank row.
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  return rows;
}

function serialiseCsv(header: string[], rows: string[][]): string {
  return (
    BOM +
    [header, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n") +
    "\r\n"
  );
}

// ---------------------------------------------------------------
// Export
// ---------------------------------------------------------------

export interface ExportResult {
  csv: string;
  productCount: number;
  /**
   * Images held inline as data URLs. They cannot go in a spreadsheet cell
   * (Excel truncates at ~32k characters) so they export as a reference
   * instead, and the caller says so rather than letting them vanish.
   */
  inlineImageCount: number;
}

function attributeCell(value: AttributeValue | AttributeValue[]): string {
  return Array.isArray(value)
    ? value.map(String).join(LIST_SEPARATOR)
    : String(value);
}

function imageCell(src: string, id: string): string {
  return src.startsWith("data:") ? `uploaded:${id}` : src;
}

/**
 * Every product as CSV, including image paths so a later backend import
 * can reattach them. Attribute columns are the union across the products
 * being exported, so nothing is dropped for being rare.
 */
export function productsToCsv(products: Product[]): ExportResult {
  const attributeKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.attributes)))
  ).sort();

  const header = [
    ...CSV_COLUMNS,
    ...attributeKeys.map((k) => `${ATTRIBUTE_PREFIX}${k}`),
  ];

  let inlineImageCount = 0;

  const rows = products.map((p) => {
    const primary = p.images.find((i) => i.id === p.primaryImageId);
    inlineImageCount += p.images.filter((i) => i.src.startsWith("data:")).length;

    const byName: Record<string, string> = {
      id: p.id,
      slug: p.slug,
      price: String(p.price),
      compareAtPrice:
        p.compareAtPrice === null || p.compareAtPrice === undefined
          ? ""
          : String(p.compareAtPrice),
      currency: p.currency,
      categoryId: p.categoryId,
      brandId: p.brandId ?? "",
      tags: p.tags.join(LIST_SEPARATOR),
      stock: String(p.stock),
      active: String(p.active),
      featured: String(p.featured ?? false),
      adjustments: p.adjustments.length ? JSON.stringify(p.adjustments) : "",
      images: p.images.map((i) => imageCell(i.src, i.id)).join(LIST_SEPARATOR),
      primaryImage: primary ? imageCell(primary.src, primary.id) : "",
    };
    for (const locale of LOCALES) {
      byName[`title.${locale}`] = p.title[locale] ?? "";
      byName[`description.${locale}`] = p.description[locale] ?? "";
    }

    return header.map((column) => {
      if (column.startsWith(ATTRIBUTE_PREFIX)) {
        const value = p.attributes[column.slice(ATTRIBUTE_PREFIX.length)];
        return value === undefined ? "" : attributeCell(value);
      }
      return byName[column] ?? "";
    });
  });

  return {
    csv: serialiseCsv(header, rows),
    productCount: products.length,
    inlineImageCount,
  };
}

/**
 * An empty file with the headers filled in, for a catalogue that does not
 * exist yet. Attribute columns come from the categories, so the operator
 * can see which facets each one expects.
 */
export function csvTemplate(categories: Category[]): string {
  const attributeKeys = Array.from(
    new Set(categories.flatMap((c) => c.filters.map((f) => f.key)))
  ).sort();

  return serialiseCsv(
    [...CSV_COLUMNS, ...attributeKeys.map((k) => `${ATTRIBUTE_PREFIX}${k}`)],
    []
  );
}

// ---------------------------------------------------------------
// Import
// ---------------------------------------------------------------

export type RowAction = "create" | "update" | "error";

/**
 * Problems are returned as codes, not sentences: this module has no
 * dictionary, and the panel renders both locales.
 */
export type ImportMessage =
  | { code: "required" }
  | { code: "notANumber" }
  | { code: "negative" }
  | { code: "unknownCategory"; value: string }
  | { code: "unknownBrand"; value: string }
  | { code: "unknownId"; value: string }
  | { code: "duplicateSlug"; value: string }
  | { code: "slugTaken"; value: string }
  | { code: "badJson" }
  | { code: "badAdjustment" }
  | { code: "unknownAttribute"; value: string }
  | { code: "imagesIgnored" };

export interface ImportIssue {
  /** Column the problem belongs to, or "" for a whole-row problem. */
  column: string;
  message: ImportMessage;
}

/**
 * Fields an import may write. `images` and `primaryImageId` are absent by
 * design — a spreadsheet has no business touching the gallery.
 */
export type ProductDraft = Omit<
  Product,
  "id" | "images" | "primaryImageId" | "createdAt"
>;

export interface PlannedRow {
  /** 1-based line in the file, header included, for "row 14 is broken". */
  line: number;
  action: RowAction;
  slug: string;
  title: string;
  /** Set when the row updates an existing product. */
  existing?: Product;
  /** What to write. Absent when the row has errors. */
  draft?: ProductDraft;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

export interface ImportPlan {
  rows: PlannedRow[];
  createCount: number;
  updateCount: number;
  errorCount: number;
  /** Headers the importer does not recognise; they are skipped. */
  unknownColumns: string[];
  /** Required headers the file lacks. Nothing can be imported. */
  missingColumns: string[];
}

function parseBoolean(raw: string, fallback: boolean): boolean {
  const value = raw.trim().toLowerCase();
  if (value === "") return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function parseInteger(
  raw: string,
  column: string,
  errors: ImportIssue[],
  { required }: { required: boolean }
): number | null {
  const value = toAsciiDigits(raw).trim();
  if (value === "") {
    if (required) errors.push({ column, message: { code: "required" } });
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    errors.push({ column, message: { code: "notANumber" } });
    return null;
  }
  if (n < 0) {
    errors.push({ column, message: { code: "negative" } });
    return null;
  }
  return Math.round(n);
}

/** Coerces a cell to the primitive a facet would hold. */
function coerceAttribute(raw: string): AttributeValue {
  const value = raw.trim();
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  const n = Number(toAsciiDigits(value));
  if (value !== "" && Number.isFinite(n)) return n;
  return value;
}

function parseAdjustments(
  raw: string,
  errors: ImportIssue[]
): PriceAdjustment[] {
  const value = raw.trim();
  if (value === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    errors.push({ column: "adjustments", message: { code: "badJson" } });
    return [];
  }

  if (!Array.isArray(parsed)) {
    errors.push({ column: "adjustments", message: { code: "badJson" } });
    return [];
  }

  const out: PriceAdjustment[] = [];
  for (const entry of parsed as Record<string, unknown>[]) {
    const kind = entry?.kind as PriceAdjustment["kind"];
    const mode = entry?.mode as PriceAdjustment["mode"];
    const numeric = Number(entry?.value);

    if (
      !ADJUSTMENT_KINDS.includes(kind) ||
      !ADJUSTMENT_MODES.includes(mode) ||
      !Number.isFinite(numeric)
    ) {
      errors.push({ column: "adjustments", message: { code: "badAdjustment" } });
      return [];
    }

    out.push({
      id:
        typeof entry.id === "string" && entry.id
          ? entry.id
          : `adj-${Math.random().toString(36).slice(2, 9)}`,
      kind,
      mode,
      value: numeric,
      label: typeof entry.label === "string" ? entry.label : undefined,
      startsAt: typeof entry.startsAt === "string" ? entry.startsAt : null,
      endsAt: typeof entry.endsAt === "string" ? entry.endsAt : null,
      active: entry.active !== false,
    });
  }
  return out;
}

/**
 * Reads a parsed CSV against the current catalogue and works out what it
 * would do, without doing any of it. The panel shows this for approval
 * first: a bulk write nobody previewed is a bulk mistake nobody saw.
 */
export function planImport(
  rows: string[][],
  {
    products,
    categories,
    brands,
  }: { products: Product[]; categories: Category[]; brands: Brand[] }
): ImportPlan {
  const empty: ImportPlan = {
    rows: [],
    createCount: 0,
    updateCount: 0,
    errorCount: 0,
    unknownColumns: [],
    missingColumns: [],
  };

  const [header, ...body] = rows;
  if (!header) return { ...empty, missingColumns: [...REQUIRED_COLUMNS] };

  const columns = header.map((h) => h.trim());
  const known = new Set<string>([...CSV_COLUMNS]);

  const missingColumns = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  const unknownColumns = columns.filter(
    (c) => c !== "" && !known.has(c) && !c.startsWith(ATTRIBUTE_PREFIX)
  );

  if (missingColumns.length > 0) {
    return { ...empty, missingColumns, unknownColumns };
  }

  const attributeColumns = columns.filter((c) => c.startsWith(ATTRIBUTE_PREFIX));

  // Slugs claimed by earlier rows in this same file. Two rows fighting
  // over one slug is a mistake, not a last-one-wins race.
  const seenSlugs = new Map<string, number>();
  const planned: PlannedRow[] = [];

  body.forEach((cells, index) => {
    const line = index + 2; // the header is line 1
    const has = (name: string) => columns.includes(name);
    const cell = (name: string) => {
      const at = columns.indexOf(name);
      return at === -1 ? "" : (cells[at] ?? "").trim();
    };

    /**
     * A column the file does not have means "leave this alone"; a column
     * it does have with an empty cell means "clear this". Without the
     * distinction, importing a three-column sheet of price corrections
     * would strip the tags, brand and price rules off every product it
     * touched.
     */
    const keepOr = <T,>(name: string, parsed: T, existing: T | undefined): T =>
      has(name) || existing === undefined ? parsed : existing;

    const errors: ImportIssue[] = [];
    const warnings: ImportIssue[] = [];

    const title = {} as LocalizedText;
    for (const locale of LOCALES) title[locale] = cell(`title.${locale}`);
    if (!title.en) {
      errors.push({ column: "title.en", message: { code: "required" } });
    }
    // A missing Persian title would render as a blank on the storefront,
    // so fall back to English rather than shipping an empty card.
    for (const locale of LOCALES) if (!title[locale]) title[locale] = title.en;

    const description = {} as LocalizedText;
    for (const locale of LOCALES) {
      description[locale] = cell(`description.${locale}`);
    }
    for (const locale of LOCALES) {
      if (!description[locale]) description[locale] = description.en;
    }

    const id = cell("id");
    const slug = cell("slug") || slugify(title.en);
    if (!slug) errors.push({ column: "slug", message: { code: "required" } });

    // Match on id first: it is the one field a rename cannot break.
    let existing: Product | undefined;
    if (id) {
      existing = products.find((p) => p.id === id);
      if (!existing) {
        errors.push({ column: "id", message: { code: "unknownId", value: id } });
      }
    } else {
      existing = products.find((p) => p.slug === slug);
    }

    const clash = products.find((p) => p.slug === slug && p.id !== existing?.id);
    if (clash) {
      errors.push({
        column: "slug",
        message: { code: "slugTaken", value: slug },
      });
    }

    const firstUse = seenSlugs.get(slug);
    if (firstUse !== undefined) {
      errors.push({
        column: "slug",
        message: { code: "duplicateSlug", value: String(firstUse) },
      });
    } else if (slug) {
      seenSlugs.set(slug, line);
    }

    const price = parseInteger(cell("price"), "price", errors, {
      required: true,
    });
    const compareAtPrice = parseInteger(
      cell("compareAtPrice"),
      "compareAtPrice",
      errors,
      { required: false }
    );
    const stock = parseInteger(cell("stock"), "stock", errors, {
      required: false,
    });

    const categoryRef = cell("categoryId");
    const category = categories.find(
      (c) => c.id === categoryRef || c.slug === categoryRef
    );
    if (!category) {
      errors.push({
        column: "categoryId",
        message: { code: "unknownCategory", value: categoryRef },
      });
    }

    const brandRef = cell("brandId");
    const brand = brandRef
      ? brands.find((b) => b.id === brandRef || b.slug === brandRef)
      : undefined;
    if (brandRef && !brand) {
      errors.push({
        column: "brandId",
        message: { code: "unknownBrand", value: brandRef },
      });
    }

    // Start from what the product already has, so a sheet carrying one
    // facet column does not erase the rest.
    const attributes: Record<string, AttributeValue | AttributeValue[]> = {
      ...(existing?.attributes ?? {}),
    };
    const declared = new Set(category?.filters.map((f) => f.key) ?? []);
    for (const column of attributeColumns) {
      const raw = cell(column);
      const key = column.slice(ATTRIBUTE_PREFIX.length);
      // Present but empty clears that one facet — the only way to remove
      // an attribute through a spreadsheet.
      if (raw === "") {
        delete attributes[key];
        continue;
      }
      attributes[key] = raw.includes(LIST_SEPARATOR)
        ? raw.split(LIST_SEPARATOR).map((v) => coerceAttribute(v))
        : coerceAttribute(raw);

      // Not an error — an attribute the category does not declare is
      // stored and simply never filtered on. Worth saying out loud,
      // because the symptom is a filter that silently finds nothing.
      if (category && !declared.has(key)) {
        warnings.push({
          column,
          message: { code: "unknownAttribute", value: key },
        });
      }
    }

    const adjustments = parseAdjustments(cell("adjustments"), errors);

    if (IGNORED_ON_IMPORT.some((c) => cell(c) !== "")) {
      warnings.push({ column: "images", message: { code: "imagesIgnored" } });
    }

    const tagsCell = cell("tags");

    if (errors.length > 0 || !category || price === null) {
      planned.push({
        line,
        action: "error",
        slug,
        title: title.en,
        existing,
        errors,
        warnings,
      });
      return;
    }

    planned.push({
      line,
      action: existing ? "update" : "create",
      slug,
      title: title.en,
      existing,
      errors,
      warnings,
      draft: {
        slug,
        title,
        description: LOCALES.every((l) => !has(`description.${l}`))
          ? (existing?.description ?? description)
          : description,
        price,
        compareAtPrice: keepOr(
          "compareAtPrice",
          compareAtPrice,
          existing?.compareAtPrice
        ),
        currency: cell("currency") || existing?.currency || "EUR",
        brandId: keepOr("brandId", brand?.id ?? null, existing?.brandId),
        attributes,
        active: parseBoolean(cell("active"), existing?.active ?? true),
        adjustments: keepOr("adjustments", adjustments, existing?.adjustments),
        categoryId: category.id,
        tags: keepOr(
          "tags",
          tagsCell
            ? tagsCell
                .split(LIST_SEPARATOR)
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          existing?.tags
        ),
        stock: keepOr("stock", stock ?? 0, existing?.stock),
        featured: parseBoolean(cell("featured"), existing?.featured ?? false),
      },
    });
  });

  return {
    rows: planned,
    createCount: planned.filter((r) => r.action === "create").length,
    updateCount: planned.filter((r) => r.action === "update").length,
    errorCount: planned.filter((r) => r.action === "error").length,
    unknownColumns,
    missingColumns,
  };
}

/**
 * What a create writes for the gallery.
 *
 * Always empty: images arrive through the product form, where they can be
 * previewed and a primary chosen. An update leaves the existing gallery
 * untouched, which is why this is only used on the create path.
 */
export const BLANK_GALLERY = {
  images: [],
  primaryImageId: null,
} satisfies Pick<Product, "images" | "primaryImageId">;
