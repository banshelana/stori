import { PanelShell } from "@/components/panel/PanelShell";
import { Guard } from "@/lib/auth/Guard";
import { ACCOUNT_NAV } from "@/lib/nav";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Guard permission="account.view">
      <PanelShell nav={ACCOUNT_NAV} titleKey="account.title">
        {children}
      </PanelShell>
    </Guard>
  );
}
