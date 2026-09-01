import { ProductDetail } from "@/components/ProductDetail";
import { MOCK_PRODUCTS } from "@/lib/data/mock";

// Static generation: pre-render every product shell at build time.
// The client component then loads the live product for the chosen
// data source (mock or API) at runtime.
export function generateStaticParams() {
  return MOCK_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  // Lightweight metadata without needing the live data source during build.
  return {
    title: "Product",
    description: "Product details",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
