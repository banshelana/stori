"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { useProducts } from "@/lib/hooks";

export function CartView() {
  const { items, setQuantity, removeItem, clear, count } = useCart();
  const { data: catalog, loading, error } = useProducts({});

  const productById = new Map((catalog ?? []).map((p) => [p.id, p]));

  const lines = items.flatMap((item) => {
    const product = productById.get(item.productId);
    return product ? [{ item, product }] : [];
  });

  const subtotal = lines.reduce(
    (sum, { item, product }) => sum + item.quantity * product.price,
    0
  );

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-2xl font-semibold text-slate-800">Your cart is empty</p>
        <p className="mt-2 text-slate-500">
          Add some products to get started.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Lines */}
      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.productId} className="h-24 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        )}
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

        {!loading && !error && (
          <>
            {lines.map(({ item, product }) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${product.slug}`}
                    className="line-clamp-1 font-semibold text-slate-900 hover:text-indigo-600"
                  >
                    {product.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {formatPrice(product.price, product.currency)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div className="w-20 text-right font-semibold">
                  {formatPrice(item.quantity * product.price, product.currency)}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="text-slate-400 hover:text-rose-600"
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Items</dt>
            <dd className="font-medium">{count}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="font-semibold">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Shipping</dt>
            <dd className="font-medium text-emerald-600">Free</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
            <dt className="font-bold text-slate-900">Total</dt>
            <dd className="font-bold text-slate-900">{formatPrice(subtotal)}</dd>
          </div>
        </dl>
        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Proceed to checkout
        </Link>
        <button
          type="button"
          onClick={clear}
          className="mt-2 w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Clear cart
        </button>
      </aside>
    </div>
  );
}
