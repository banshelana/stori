import { PaymentsSection } from "@/components/admin/PaymentsSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="payments.view">
      <PaymentsSection />
    </Guard>
  );
}
