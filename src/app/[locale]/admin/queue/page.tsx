import { OrderQueueSection } from "@/components/admin/OrderQueueSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="sales.view">
      <OrderQueueSection />
    </Guard>
  );
}
