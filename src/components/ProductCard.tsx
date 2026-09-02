"use client";

import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Icon } from "@/components/panel/Icon";
import { Price } from "@/components/Price";
import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { effectivePrice, strikeThroughPrice } from "@/lib/pricing";
import { primaryImageSrc } from "@/lib/product";
import { useSettings } from "@/lib/settings-context";
import { isLowStock } from "@/lib/settings";
import type { Product } from "@/lib/types";

/** Whole-percent saving, for the discount badge. */
function discountPercent(product: Product): number | null {
  const was = strikeThroughPrice(product);
  if (was === null || was <= 0) return null;
  const pct = Math.round((1 - effectivePrice(product) / was) * 100);
  return pct > 0 ? pct : null;
}

export function ProductCard({ product }: { product: Product }) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const href = useLocaleHref();

  const productHref = href(`/products/${product.slug}`);
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && isLowStock(product.stock, settings);
  const saving = discountPercent(product);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_-18px_rgb(15_23_42/0.3)] focus-within:-translate-y-1 focus-within:border-indigo-300">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primaryImageSrc(product)}
          alt={localized(product.title, locale)}
          className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08] ${
            soldOut ? "opacity-60 grayscale" : ""
          }`}
          loading="lazy"
        />

        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        {/* Status badges. Stacked on the reading edge so they flip in RTL. */}
        <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
              {t("product.soldOut")}
            </span>
          ) : (
            <>
              {saving !== null && (
                <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                  −{formatNumber(saving, locale)}%
                </span>
              )}
              {lowStock && (
                <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-sm">
                  {t("product.lowStock", {
                    count: formatNumber(product.stock, locale),
                  })}
                </span>
              )}
            </>
          )}
        </div>

        {/* Above the stretched title link so it stays clickable. */}
        <div className="absolute top-2.5 end-2.5 z-10">
          <FavoriteButton productId={product.id} />
        </div>

        {/* Quick-view affordance. Hidden from touch, where hover is a lie. */}
        <Link
          href={productHref}
          tabIndex={-1}
          aria-hidden
          className="absolute bottom-2.5 start-2.5 hidden translate-y-2 items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 opacity-0 shadow-md backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:inline-flex"
        >
          <Icon name="eye" className="h-3.5 w-3.5" />
          {t("common.view")}
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Rating value={product.rating} />

        <h3 className="text-sm font-semibold leading-snug text-slate-900 sm:text-base">
          <Link
            href={productHref}
            className="line-clamp-2 outline-none transition-colors after:absolute after:inset-0 hover:text-indigo-600 focus-visible:text-indigo-600"
          >
            {localized(product.title, locale)}
          </Link>
        </h3>

        {/* Dropped on the narrowest cards, where it only adds noise. */}
        <p className="hidden line-clamp-2 text-sm leading-relaxed text-slate-500 sm:block">
          {localized(product.description, locale)}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <Price product={product} />
          {/* Above the title's stretched link, so the button stays clickable. */}
          <div className="relative z-10">
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}
