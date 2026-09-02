import { CouponsSection } from "@/components/admin/CouponsSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="sales.view">
      <CouponsSection />
    </Guard>
  );
}
