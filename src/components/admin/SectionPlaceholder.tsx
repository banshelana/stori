"use client";

import { ComingSoon, PageHeader } from "@/components/panel/ui";
import { Guard } from "@/lib/auth/Guard";
import { useI18n } from "@/i18n/I18nProvider";
import type { Permission } from "@/lib/auth/types";

/**
 * Each admin section carries its own permission on top of the layout's
 * dashboard.view, so a sub-role without (say) payments.view is refused
 * here even if it reaches the URL directly.
 */
export function SectionPlaceholder({
  permission,
  titleKey,
}: {
  permission: Permission;
  titleKey: string;
}) {
  const { t } = useI18n();

  return (
    <Guard permission={permission}>
      <PageHeader title={t(titleKey)} />
      <ComingSoon section={t(titleKey)} />
    </Guard>
  );
}
