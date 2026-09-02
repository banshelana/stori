"use client";

import { useState } from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BackInStockForm } from "@/components/BackInStockForm";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Price } from "@/components/Price";
import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { useProductBySlug } from "@/lib/hooks";
import { orderedImages, PLACEHOLDER_IMAGE } from "@/lib/product";
import type { ProductImage } from "@/lib/types";

export function ProductDetail({ slug }: { slug: string }) {
  const { data: product, loading, error } = useProductBySlug(slug);
  const { t, locale } = useI18n();
  const href = useLocaleHref();

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="skeleton h-72 rounded-2xl" aria-hidden />
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("product.notFound")}
        </h1>
        {/* A failed request and a genuine 404 are different problems, so
            show the underlying error rather than blaming the URL. */}
        <p className="mt-2 text-slate-500">
          {error ? `${t("common.error")}: ${error}` : t("product.notFoundBody")}
        </p>
        <Link
          href={href("/products")}
          className="btn-glow mt-6 inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          {t("product.backToProducts")}
        </Link>
      </main>
    );
  }

  return (
    <main className="animate-fade-up mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href={href("/products")} className="hover:text-indigo-600">
          {t("nav.products")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">
          {localized(product.title, locale)}
        </span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery
          images={orderedImages(product)}
          alt={localized(product.title, locale)}
        />

        <div className="flex flex-col">
          <Rating value={product.rating} />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {localized(product.title, locale)}
          </h1>
          <Price product={product} className="mt-3" />
          <p className="mt-4 leading-relaxed text-slate-600">
            {localized(product.description, locale)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                #{tag}
              </span>
            ))}
          </div>

          <p
            className={`mt-4 text-sm font-medium ${
              product.stock > 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {product.stock > 0
              ? t("product.inStock", { count: formatNumber(product.stock, locale) })
              : t("product.unavailable")}
          </p>

          {product.stock <= 0 && (
            <div className="mt-6">
              <BackInStockForm productId={product.id} />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton product={product} className="px-6 py-3 text-base" />
            <FavoriteButton productId={product.id} variant="full" />
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Primary image plus thumbnails. The gallery arrives already ordered with
 * the admin's chosen primary first, so this component never decides which
 * image leads.
 */
function ProductGallery({
  images,
  alt,
}: {
  images: ProductImage[];
  alt: string;
}) {
  const [activeId, setActiveId] = useState(images[0]?.id);
  const active = images.find((img) => img.id === activeId) ?? images[0];

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active?.src ?? PLACEHOLDER_IMAGE}
          alt={alt}
          className="aspect-[4/3] h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveId(img.id)}
              aria-label={alt}
              aria-current={img.id === active?.id}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                img.id === active?.id
                  ? "border-indigo-500"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
