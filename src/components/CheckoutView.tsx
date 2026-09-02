"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/form/Field";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useCart } from "@/lib/cart-context";
import { ordersRepo } from "@/lib/data/repositories";
import { couponsRepo } from "@/lib/data/repositories";
import { couponDiscount, useCoupon, useCouponCheck } from "@/lib/coupon-context";
import { shippingFor, taxFor } from "@/lib/settings";
import { useSettings } from "@/lib/settings-context";
import { productsRepo } from "@/lib/data/repositories";
import { findShortages, nextStock, stockDeltas } from "@/lib/inventory";
import { formatNumber, formatPrice } from "@/lib/format";
import { useCartLines } from "@/lib/hooks";
import { effectivePrice } from "@/lib/pricing";

export function CheckoutView() {
  const router = useRouter();
  const href = useLocaleHref();
  const { items, clear, hydrated } = useCart();
  const { user } = useAuth();
  const { remove: removeCoupon } = useCoupon();
  const { lines, subtotal, currency, loading } = useCartLines();
  const { settings } = useSettings();
  // Read straight from the repository: cart lines snapshot price and
  // title, but stock has to be the live number at the moment of order.
  const allProducts = productsRepo.all();

  const couponCheck = useCouponCheck(subtotal);
  const discount = couponDiscount(couponCheck);
  const discounted = Math.max(0, subtotal - discount);
  const shipping = shippingFor(discounted, settings);
  const tax = taxFor(discounted + shipping, settings);
  const grandTotal = discounted + shipping + tax;
  const { t, locale } = useI18n();
  const [placed, setPlaced] = useState(false);
  // Controlled, so the values survive a re-render and are available
  // to the order payload once a real API is wired in.
  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
  });

  const [placing, setPlacing] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    setStockError(null);

    try {
      // A real order needs an account to belong to. A guest checkout
      // would need the API to mint a customer first, so for now the
      // signed-out path stays a demo confirmation.
      if (user && lines.length > 0) {
        // Refuse rather than oversell, when the store asks us to.
        if (settings.enforceStock) {
          const shortages = findShortages(
            lines.map(({ product, quantity }) => ({
              productId: product.id,
              quantity,
            })),
            (id) => allProducts.find((p) => p.id === id)?.stock
          );
          if (shortages.length > 0) {
            setStockError(
              shortages
                .map((s) => {
                  const product = allProducts.find((p) => p.id === s.productId);
                  return `${
                    product ? localized(product.title, locale) : s.productId
                  } (${s.available})`;
                })
                .join(", ")
            );
            return;
          }
        }

        const reference = `ORD-${Date.now().toString().slice(-7)}`;
        await ordersRepo.create({
          reference,
          userId: user.id,
          // Lands in the admin queue as work to pick up.
          status: "created",
          lines: lines.map(({ product, quantity }) => ({
            productId: product.id,
            // Snapshotted, so renaming the product later does not
            // rewrite what this customer bought.
            title: { ...product.title },
            quantity,
            unitPrice: effectivePrice(product),
          })),
          total: grandTotal,
          currency,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        });
      }

      // Card details are deliberately not collected — a real integration
      // hands that to a payment provider so the card never touches this
      // application.
      // Reserve the units this order takes out of inventory.
      for (const [productId, delta] of stockDeltas(
        lines.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
        "reserve"
      )) {
        const product = allProducts.find((p) => p.id === productId);
        if (!product) continue;
        await productsRepo.update(productId, {
          stock: nextStock(product.stock, delta),
        });
      }

      // A redeemed code counts against its usage limit.
      if (couponCheck?.ok) {
        await couponsRepo.update(couponCheck.coupon.id, {
          usedCount: couponCheck.coupon.usedCount + 1,
        });
      }

      setPlaced(true);
      clear();
      removeCoupon();
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <div className="animate-scale-in mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
          &#10003;
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          {t("checkout.placed")}
        </h2>
        <p className="mt-2 text-slate-500">{t("checkout.placedBody")}</p>
        <button
          type="button"
          onClick={() => router.push(href("/products"))}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("checkout.continueShopping")}
        </button>
      </div>
    );
  }

  if (!hydrated || loading) {
    return <div className="skeleton h-64 rounded-2xl" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-xl font-semibold text-slate-800">
          {t("checkout.nothingToCheckout")}
        </p>
        <button
          type="button"
          onClick={() => router.push(href("/products"))}
          className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("cart.browse")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          {t("checkout.contactDetails")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("auth.firstName")}
            required
            value={contact.firstName}
            onChange={(v) => setContact((c) => ({ ...c, firstName: v }))}
          />
          <TextField
            label={t("auth.lastName")}
            required
            value={contact.lastName}
            onChange={(v) => setContact((c) => ({ ...c, lastName: v }))}
          />
          <TextField
            className="sm:col-span-2"
            label={t("account.email")}
            type="email"
            value={contact.email}
            onChange={(v) => setContact((c) => ({ ...c, email: v }))}
          />
          <TextField
            className="sm:col-span-2"
            label={t("auth.mobile")}
            type="tel"
            required
            value={contact.mobile}
            onChange={(v) => setContact((c) => ({ ...c, mobile: v }))}
          />
        </div>

        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {t("checkout.paymentNote")}
        </p>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-lg font-bold text-slate-900">{t("cart.summary")}</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.map(({ productId, quantity, product }) => (
            <li key={productId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-slate-600">
                {localized(product.title, locale)} &times; {formatNumber(quantity, locale)}
              </span>
              <span className="shrink-0 font-medium">
                {formatPrice(
                  quantity * effectivePrice(product),
                  product.currency,
                  locale
                )}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("cart.subtotal")}</dt>
            <dd className="font-medium">
              {formatPrice(subtotal, currency, locale)}
            </dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>{t("coupon.discount")}</dt>
              <dd className="font-semibold">
                −{formatPrice(discount, currency, locale)}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("cart.shipping")}</dt>
            <dd className="font-medium">
              {shipping === 0 ? (
                <span className="text-emerald-600">{t("cart.free")}</span>
              ) : (
                formatPrice(shipping, currency, locale)
              )}
            </dd>
          </div>
          {tax > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">{t("settings.taxPercent")}</dt>
              <dd className="font-medium">{formatPrice(tax, currency, locale)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <dt>{t("common.total")}</dt>
            <dd>{formatPrice(grandTotal, currency, locale)}</dd>
          </div>
        </dl>
        {stockError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
          >
            {t("checkout.stockShortage", { items: stockError })}
          </p>
        )}

        <button
          type="submit"
          disabled={placing}
          className="btn-glow mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white"
        >
          {placing
            ? t("common.loading")
            : t("checkout.pay", { amount: formatPrice(grandTotal, currency, locale) })}
        </button>
      </aside>
    </form>
  );
}
