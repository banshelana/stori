"use client";

import Link from "next/link";
import { CartButton } from "@/components/CartButton";
import { DataSourceToggle } from "@/components/DataSourceToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";

export function Header() {
  const { t } = useI18n();
  const href = useLocaleHref();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4">
        <Link
          href={href("/")}
          className="group flex shrink-0 items-center gap-2 text-lg font-bold"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
            &#8962;
          </span>
          <span className="hidden sm:inline">{t("common.appName")}</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-1 text-sm font-medium text-slate-600">
          <Link
            className="truncate rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:px-3"
            href={href("/products")}
          >
            {t("nav.products")}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="hidden md:block">
            <DataSourceToggle />
          </div>
          <LocaleSwitcher compact />
          <CartButton />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
