import { SettingsSection } from "@/components/admin/SettingsSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="settings.manage">
      <SettingsSection />
    </Guard>
  );
}
