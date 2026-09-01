import type { Metadata } from "next";
import { ProductDetail } from "@/components/ProductDetail";
import { SiteShell } from "@/components/SiteShell";
import { isLocale, LOCALES, type Locale } from "@/i18n/config";
import { localized } from "@/i18n/localized";
import { getProductBySlug } from "@/lib/data";
import { DEFAULT_SOURCE } from "@/lib/data/config";
import { MOCK_PRODUCTS } from "@/lib/data/mock";

// One static shell per product per locale. The client component then
// reloads the product for whichever data source is active at runtime.
export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    MOCK_PRODUCTS.map((p) => ({ locale, slug: p.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const product = await getProductBySlug(DEFAULT_SOURCE, slug);
  if (!product) return { title: "Product" };

  // Per-product, per-language metadata — the title and description a
  // search engine indexes should match the page the visitor lands on.
  return {
    title: localized(product.title, locale),
    description: localized(product.description, locale),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <SiteShell>
      <ProductDetail slug={slug} />
    </SiteShell>
  );
}
