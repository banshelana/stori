"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { useCart } from "@/lib/cart-context";
import { formatNumber, formatPrice } from "@/lib/format";
import { useCartLines } from "@/lib/hooks";

export function CartView() {
  const { items, setQuantity, removeItem, clear, count, hydrated } = useCart();
  const { lines, missingIds, subtotal, currency, loading, error } =
    useCartLines();
  const { t, locale } = useI18n();
  const href = useLocaleHref();

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-2xl font-semibold text-slate-800">{t("cart.empty")}</p>
        <p className="mt-2 text-slate-500">{t("cart.emptyHint")}</p>
        <Link
          href={href("/products")}
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("cart.browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            {items.map((i) => (
              <div
                key={i.productId}
                className="h-24 animate-pulse rounded-xl bg-slate-200"
                aria-hidden
              />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
            {t("common.error")}: {error}
          </p>
        )}

        {/* Silently dropping an unresolvable line would make the total
            disagree with the cart badge, so say so explicitly. */}
        {missingIds.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p>{t("cart.unavailableLines")}</p>
            <button
              type="button"
              onClick={() => missingIds.forEach(removeItem)}
              className="mt-1 font-semibold underline hover:no-underline"
            >
              {t("cart.removeUnavailable")}
            </button>
          </div>
        )}

        {!loading &&
          lines.map(({ productId, quantity, product }) => (
            <div
              key={productId}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image}
                  alt={localized(product.title, locale)}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={href(`/products/${product.slug}`)}
                  className="line-clamp-1 font-semibold text-slate-900 hover:text-indigo-600"
                >
                  {localized(product.title, locale)}
                </Link>
                <p className="text-sm text-slate-500">
                  {formatPrice(product.price, product.currency, locale)}{" "}
                  {t("cart.each")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(productId, quantity - 1)}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label={t("cart.decrease")}
                >
                  &minus;
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {formatNumber(quantity, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(productId, quantity + 1, product.stock)}
                  disabled={quantity >= product.stock}
                  className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("cart.increase")}
                >
                  +
                </button>
              </div>

              <div className="w-24 text-end font-semibold">
                {formatPrice(quantity * product.price, product.currency, locale)}
              </div>

              <button
                type="button"
                onClick={() => removeItem(productId)}
                className="text-slate-400 hover:text-rose-600"
                aria-label={t("cart.remove")}
              >
                &#10005;
              </button>
            </div>
          ))}
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{t("cart.summary")}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("order.items")}</dt>
            <dd className="font-medium">{formatNumber(count, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("cart.subtotal")}</dt>
            <dd className="font-semibold">
              {formatPrice(subtotal, currency, locale)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("cart.shipping")}</dt>
            <dd className="font-medium text-emerald-600">{t("cart.free")}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
            <dt className="font-bold text-slate-900">{t("common.total")}</dt>
            <dd className="font-bold text-slate-900">
              {formatPrice(subtotal, currency, locale)}
            </dd>
          </div>
        </dl>

        <Link
          href={href("/checkout")}
          className="mt-6 block w-full rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("cart.proceed")}
        </Link>
        <button
          type="button"
          onClick={clear}
          className="mt-2 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("cart.clear")}
        </button>
      </aside>
    </div>
  );
}
