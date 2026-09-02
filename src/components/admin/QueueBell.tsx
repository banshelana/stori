"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { useOrderQueue } from "@/lib/useOrderQueue";

/**
 * Unacknowledged-order indicator for the admin header.
 *
 * This is polling, not push — see useOrderQueue. The count reflects
 * orders this browser has not yet acknowledged, so it clears by looking
 * at the queue rather than by anyone else clearing it for you.
 */
export function QueueBell() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const href = useLocaleHref();
  const queue = useOrderQueue();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Nothing to show someone who cannot open the queue anyway.
  if (!can("sales.view")) return null;

  const count = queue.unseen.length;
  const preview = queue.unseen.slice(0, 5);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          count > 0
            ? t("queue.bellWithCount", { count: formatNumber(count, locale) })
            : t("queue.bellEmpty")
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
      >
        <Icon name="bell" className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {formatNumber(count, locale)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-900">
              {t("queue.newOrders")}
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => queue.markSeen()}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {t("queue.markAllSeen")}
              </button>
            )}
          </div>

          {preview.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              {t("queue.nothingNew")}
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {preview.map((order) => {
                const customer = queue.lookupCustomer(order.userId);
                return (
                  <li key={order.id}>
                    <Link
                      href={href("/admin/queue")}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50"
                      role="menuitem"
                    >
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                      <span className="min-w-0 flex-1">
                        <span className="force-ltr block text-sm font-semibold text-slate-900">
                          {order.reference}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {customer?.name ?? t("common.unknown")} ·{" "}
                          {formatDate(order.createdAt, locale)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-slate-700">
                        {formatPrice(order.total, order.currency, locale)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href={href("/admin/queue")}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-slate-50"
            role="menuitem"
          >
            {t("queue.openQueue")}
          </Link>
        </div>
      )}
    </div>
  );
}
