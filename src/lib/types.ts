import type { LocalizedText } from "@/i18n/localized";

export type DataSource = "mock" | "api";

export interface Category {
  id: string;
  name: LocalizedText;
  slug: string;
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
