import { PanelShell } from "@/components/panel/PanelShell";
import { Guard } from "@/lib/auth/Guard";
import { ADMIN_NAV } from "@/lib/nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard permission="dashboard.view">
      <PanelShell nav={ADMIN_NAV} titleKey="admin.title">
        {children}
      </PanelShell>
    </Guard>
  );
}
