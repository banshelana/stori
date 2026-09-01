"use client";

import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Price } from "@/components/Price";
import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { primaryImageSrc } from "@/lib/product";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { t, locale } = useI18n();
  const href = useLocaleHref();

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={href(`/products/${product.slug}`)}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primaryImageSrc(product)}
          alt={localized(product.title, locale)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {product.stock <= 0 && (
          <span className="absolute top-2 start-2 rounded bg-slate-900/80 px-2 py-0.5 text-xs font-medium text-white">
            {t("product.soldOut")}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Rating value={product.rating} />
        <Link
          href={href(`/products/${product.slug}`)}
          className="line-clamp-2 font-semibold text-slate-900 hover:text-indigo-600"
        >
          {localized(product.title, locale)}
        </Link>
        <p className="line-clamp-2 text-sm text-slate-500">
          {localized(product.description, locale)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Price product={product} />
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
