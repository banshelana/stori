import { SalesSection } from "@/components/admin/SalesSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="sales.view">
      <SalesSection />
    </Guard>
  );
}
