import type { LocalizedText } from "@/i18n/localized";

export type DataSource = "mock" | "api";

/**
 * The value a facet can hold on a product. Attribute values are stored
 * as primitives so they survive a round trip through JSON and a database
 * column without a custom serialiser.
 */
export type AttributeValue = string | number | boolean;

export const FILTER_KINDS = ["select", "multi", "range", "boolean"] as const;
export type FilterKind = (typeof FILTER_KINDS)[number];

export interface FilterOption {
  value: string;
  label: LocalizedText;
}

/**
 * One filter control, described as data rather than code.
 *
 * A category carries its own list of these, so when categories move to
 * the database their filters travel with them and the storefront renders
 * whatever arrives — no deploy needed to add a facet to a category.
 *
 * `key` addresses `Product.attributes[key]`.
 */
export interface FilterSpec {
  key: string;
  kind: FilterKind;
  label: LocalizedText;
  /** select | multi */
  options?: FilterOption[];
  /** range — in the product's minor units, or a plain number for specs. */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface Category {
  id: string;
  name: LocalizedText;
  slug: string;
  /**
   * Facets shown only while this category is selected. Global filters
   * (brand, price, rating, stock) live in the filter bar itself.
   */
  filters: FilterSpec[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export const ADJUSTMENT_KINDS = ["offset", "discount", "tax"] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];

export const ADJUSTMENT_MODES = ["percent", "amount"] as const;
export type AdjustmentMode = (typeof ADJUSTMENT_MODES)[number];

/**
 * A price rule attached to a product. See src/lib/pricing.ts for the
 * order in which offsets, discounts and tax are applied.
 */
export interface PriceAdjustment {
  id: string;
  kind: AdjustmentKind;
  mode: AdjustmentMode;
  /**
   * Percent mode: a percentage (15 means 15%).
   * Amount mode: minor units, same currency as the product.
   * Offsets may be negative (a correction down); discounts and tax are
   * magnitudes, with their direction implied by the kind.
   */
  value: number;
  /** Admin-facing note, e.g. "Summer sale" or "VAT". */
  label?: string;
  /** YYYY-MM-DD, inclusive. Null means unbounded on that side. */
  startsAt: string | null;
  endsAt: string | null;
  /** Disabled rules are kept but stop applying — the off switch. */
  active: boolean;
}

/** One uploaded or bundled image belonging to a product. */
export interface ProductImage {
  id: string;
  /** A public path (bundled asset) or a data URL (uploaded). */
  src: string;
}

export interface Product {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  price: number; // in cents
  compareAtPrice?: number | null; // in cents, for showing a sale
  currency: string; // ISO-4217, e.g. "EUR"
  brandId: string | null;
  /**
   * Category-specific facet values, keyed by FilterSpec.key. Products
   * carry only the attributes their category declares; anything else is
   * ignored by the filter layer.
   */
  attributes: Record<string, AttributeValue | AttributeValue[]>;
  images: ProductImage[];
  /**
   * Which image the storefront shows in listings and first on the product
   * page. Held by id, not index, so deleting or reordering the gallery
   * cannot silently promote a different image.
   */
  primaryImageId: string | null;
  /** Inactive products stay in the admin but disappear from the storefront. */
  active: boolean;
  /** Offsets, discounts and tax; empty means the base price stands. */
  adjustments: PriceAdjustment[];
  categoryId: string;
  tags: string[];
  rating: number; // 0..5
  stock: number;
  featured?: boolean;
  createdAt: string; // ISO date
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface SearchFilters {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number; // cents
  maxPrice?: number; // cents
  minRating?: number;
  inStock?: boolean;
  /**
   * Category facet selections, keyed by FilterSpec.key. A string array is
   * an OR within that facet; facets are ANDed with each other.
   */
  attributes?: Record<string, string[]>;
  sort?:
    | "featured"
    | "newest"
    | "price-asc"
    | "price-desc"
    | "name-asc"
    | "rating-desc";
}
