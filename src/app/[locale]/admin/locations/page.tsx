import { LocationsSection } from "@/components/admin/LocationsSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="geo.view">
      <LocationsSection />
    </Guard>
  );
}
