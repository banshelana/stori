"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { useProducts } from "@/lib/hooks";

export function CheckoutView() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { data: catalog } = useProducts({});
  const [placed, setPlaced] = useState(false);

  const productById = new Map((catalog ?? []).map((p) => [p.id, p]));
  const lines = items.flatMap((item) => {
    const product = productById.get(item.productId);
    return product ? [{ item, product }] : [];
  });
  const subtotal = lines.reduce(
    (sum, { item, product }) => sum + item.quantity * product.price,
    0
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Replace with a real payment / order API call here.
    setPlaced(true);
    clear();
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Order placed!</h2>
        <p className="mt-2 text-slate-500">
          Thanks for your purchase. A confirmation is on its way.
        </p>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Continue shopping
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-xl font-semibold text-slate-800">
          Nothing to check out
        </p>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Browse products
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Payment details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            required
            placeholder="First name"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
          <input
            required
            placeholder="Last name"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
          <input
            required
            type="email"
            placeholder="Email"
            className="col-span-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
          <input
            required
            placeholder="Card number"
            className="col-span-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
          <input
            required
            placeholder="MM / YY"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
          <input
            required
            placeholder="CVC"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Summary</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.map(({ item, product }) => (
            <li key={item.productId} className="flex justify-between">
              <span className="text-slate-600">
                {product.title} × {item.quantity}
              </span>
              <span className="font-medium">
                {formatPrice(item.quantity * product.price, product.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-slate-200 pt-3 font-bold text-slate-900">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Pay {formatPrice(subtotal)}
        </button>
      </aside>
    </form>
  );
}
