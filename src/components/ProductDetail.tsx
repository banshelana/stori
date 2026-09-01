"use client";

import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Price } from "@/components/Price";
import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { useProductBySlug } from "@/lib/hooks";

export function ProductDetail({ slug }: { slug: string }) {
  const { data: product, loading, error } = useProductBySlug(slug);
  const { t, locale } = useI18n();
  const href = useLocaleHref();

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200" aria-hidden />
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
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("product.backToProducts")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={localized(product.title, locale)}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <Rating value={product.rating} />
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
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

          <div className="mt-6">
            <AddToCartButton product={product} className="px-6 py-3 text-base" />
          </div>
        </div>
      </div>
    </main>
  );
}
