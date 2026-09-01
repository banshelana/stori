"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { useCart } from "@/lib/cart-context";
import { formatNumber, formatPrice } from "@/lib/format";
import { useCartLines } from "@/lib/hooks";

export function CheckoutView() {
  const router = useRouter();
  const href = useLocaleHref();
  const { items, clear, hydrated } = useCart();
  const { lines, subtotal, currency, loading } = useCartLines();
  const { t, locale } = useI18n();
  const [placed, setPlaced] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Phase 2 posts the order through the axios client and only clears the
    // cart once the API confirms it. Card details are intentionally not
    // collected here — a real integration hands that to a payment provider
    // so the card never touches this application.
    setPlaced(true);
    clear();
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
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
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200" aria-hidden />;
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
          <Field label={t("auth.firstName")} name="firstName" required />
          <Field label={t("auth.lastName")} name="lastName" required />
          <Field
            label={t("account.email")}
            name="email"
            type="email"
            className="sm:col-span-2"
          />
          <Field
            label={t("auth.mobile")}
            name="mobile"
            type="tel"
            required
            className="sm:col-span-2"
          />
        </div>

        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {t("checkout.paymentNote")}
        </p>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{t("cart.summary")}</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.map(({ productId, quantity, product }) => (
            <li key={productId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-slate-600">
                {localized(product.title, locale)} &times; {formatNumber(quantity, locale)}
              </span>
              <span className="shrink-0 font-medium">
                {formatPrice(quantity * product.price, product.currency, locale)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-3 font-bold text-slate-900">
          <span>{t("common.total")}</span>
          <span>{formatPrice(subtotal, currency, locale)}</span>
        </div>
        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("checkout.pay", { amount: formatPrice(subtotal, currency, locale) })}
        </button>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
      />
    </label>
  );
}
