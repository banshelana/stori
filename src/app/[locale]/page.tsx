import Link from "next/link";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { MOCK_CATEGORIES } from "@/lib/data/mock";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 px-6 py-16 text-white sm:px-12 sm:py-20">
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Gadgets, gear &amp; goodies for your everyday.
        </h1>
        <p className="mt-4 max-w-xl text-indigo-50">
          A demo storefront built with Next.js. Browse by category or filter the
          catalog with the URL query string — and switch the data source from
          the header at any time.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Shop all products
          </Link>
          <Link
            href="/products?sort=rating-desc"
            className="rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Top rated
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Shop by category</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {MOCK_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-center font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products (client, respects the data-source toggle) */}
      <section className="mt-12 pb-16">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Featured</h2>
          <Link
            href="/products"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all →
          </Link>
        </div>
        <FeaturedProducts />
      </section>
    </main>
  );
}
