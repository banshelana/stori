import { MessagesSection } from "@/components/admin/MessagesSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="messages.view">
      <MessagesSection />
    </Guard>
  );
}
