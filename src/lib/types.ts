import type { LocalizedText } from "@/i18n/localized";

export type DataSource = "mock" | "api";

export interface Category {
  id: string;
  name: LocalizedText;
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
  maxPrice?: number; // cents
  minRating?: number;
  inStock?: boolean;
  sort?:
    | "featured"
    | "newest"
    | "price-asc"
    | "price-desc"
    | "name-asc"
    | "rating-desc";
}
