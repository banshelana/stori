"use client";

import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Price } from "@/components/Price";
import { Rating } from "@/components/Rating";
import { useProductBySlug } from "@/lib/hooks";

export function ProductDetail({ slug }: { slug: string }) {
  const { data: product, loading, error } = useProductBySlug(slug);

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
        <h1 className="text-2xl font-bold text-slate-900">Product not found</h1>
        <p className="mt-2 text-slate-500">We couldn&apos;t find that product.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Back to products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/products" className="hover:text-indigo-600">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{product.title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <Rating value={product.rating} />
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {product.title}
          </h1>
          <Price product={product} className="mt-3" />
          <p className="mt-4 leading-relaxed text-slate-600">
            {product.description}
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
              ? `${product.stock} in stock`
              : "Currently unavailable"}
          </p>

          <div className="mt-6">
            <AddToCartButton product={product} className="px-6 py-3 text-base" />
          </div>
        </div>
      </div>
    </main>
  );
}
