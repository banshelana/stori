"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { formatPrice } from "@/lib/format";
import { effectivePrice, strikeThroughPrice } from "@/lib/pricing";
import type { Product } from "@/lib/types";

/**
 * The price a shopper actually pays, with the pre-discount figure struck
 * through when there is one.
 *
 * The adjustment breakdown itself stays admin-facing — the storefront
 * shows one number, not a tax line.
 */
export function Price({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const total = effectivePrice(product);
  const was = strikeThroughPrice(product);

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="text-lg font-semibold text-slate-900">
        {formatPrice(total, product.currency, locale)}
      </span>
      {was !== null && (
        <>
          <span className="text-sm text-slate-400 line-through">
            {formatPrice(was, product.currency, locale)}
          </span>
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-600">
            {t("product.sale")}
          </span>
        </>
      )}
    </div>
  );
}
