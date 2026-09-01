import { ProductsSection } from "@/components/admin/ProductsSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="products.view">
      <ProductsSection />
    </Guard>
  );
}
