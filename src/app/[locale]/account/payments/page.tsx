import { MyPayments } from "@/components/account/MyPayments";
import { Guard } from "@/lib/auth/Guard";

export default function AccountPaymentsPage() {
  return (
    <Guard permission="account.payments">
      <MyPayments />
    </Guard>
  );
}
