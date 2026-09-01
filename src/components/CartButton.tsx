"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { useCart } from "@/lib/cart-context";
import { formatNumber } from "@/lib/format";

export function CartButton() {
  const { count } = useCart();
  const { t, locale } = useI18n();
  const href = useLocaleHref();

  return (
    <Link
      href={href("/cart")}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
      aria-label={`${t("nav.cart")} (${count})`}
    >
      <svg
        className="h-5 w-5 rtl-flip"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -end-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-bold text-white">
          {formatNumber(count, locale)}
        </span>
      )}
    </Link>
  );
}
