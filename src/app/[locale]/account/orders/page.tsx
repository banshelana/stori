import { MyOrders } from "@/components/account/MyOrders";
import { Guard } from "@/lib/auth/Guard";

export default function OrdersPage() {
  return (
    <Guard permission="account.orders">
      <MyOrders />
    </Guard>
  );
}
