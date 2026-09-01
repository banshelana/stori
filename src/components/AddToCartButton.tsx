"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { addItem, quantityOf } = useCart();
  const { t } = useI18n();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | null>(null);

  // Clear the pending timeout on unmount so it can't set state on a
  // component that has already gone away.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const inCart = quantityOf(product.id);
  const atStockLimit = inCart >= product.stock;
  const disabled = product.stock <= 0 || atStockLimit;

  function handleClick() {
    if (disabled) return;
    addItem(product.id, 1, product.stock);
    setAdded(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        disabled
          ? "cursor-not-allowed bg-slate-200 text-slate-400"
          : added
            ? "bg-emerald-600 text-white"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
      } ${className}`}
    >
      {product.stock <= 0
        ? t("product.soldOut")
        : added
          ? t("product.added")
          : t("product.addToCart")}
    </button>
  );
}
