"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function Price({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="text-lg font-semibold text-slate-900">
        {formatPrice(product.price, product.currency, locale)}
      </span>
      {onSale && (
        <>
          <span className="text-sm text-slate-400 line-through">
            {formatPrice(product.compareAtPrice!, product.currency, locale)}
          </span>
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-600">
            {t("product.sale")}
          </span>
        </>
      )}
    </div>
  );
}
