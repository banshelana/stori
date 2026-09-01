import { CustomersSection } from "@/components/admin/CustomersSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="customers.view">
      <CustomersSection />
    </Guard>
  );
}
