import type { Product, ProductImage } from "@/lib/types";

// ---------------------------------------------------------------
// Accessors for the product gallery.
//
// Nothing should read `images[0]` directly: the primary is held by id
// so that reordering or deleting cannot silently promote a different
// image, and these helpers are the only place that fallback logic
// lives.
// ---------------------------------------------------------------

export const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

export function primaryImage(product: Product): ProductImage | undefined {
  const byId = product.images.find((img) => img.id === product.primaryImageId);
  // A product whose primary was deleted still needs something to show.
  return byId ?? product.images[0];
}

export function primaryImageSrc(product: Product): string {
  return primaryImage(product)?.src ?? PLACEHOLDER_IMAGE;
}

/** The full gallery with the primary first, for the product page. */
export function orderedImages(product: Product): ProductImage[] {
  const primary = primaryImage(product);
  if (!primary) return [];
  return [primary, ...product.images.filter((img) => img.id !== primary.id)];
}
