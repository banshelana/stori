import { ContactsSection } from "@/components/admin/ContactsSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="contacts.view">
      <ContactsSection />
    </Guard>
  );
}
