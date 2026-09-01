"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock <= 0;

  function handleClick() {
    if (outOfStock) return;
    addItem(product.id);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={outOfStock}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        outOfStock
          ? "cursor-not-allowed bg-slate-200 text-slate-400"
          : added
          ? "bg-emerald-600 text-white"
          : "bg-indigo-600 text-white hover:bg-indigo-700"
      } ${className}`}
    >
      {outOfStock ? "Sold out" : added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
