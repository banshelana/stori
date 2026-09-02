"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { productsRepo, stockAlertsRepo } from "@/lib/data/repositories";
import { formatNumber } from "@/lib/format";
import { isLowStock } from "@/lib/settings";
import { useSettings } from "@/lib/settings-context";
import { pendingCountByProduct } from "@/lib/stockAlerts";

/**
 * Products that need restocking, with the number of people waiting on
 * each — the count is what turns "low stock" into a priority order.
 */
export function LowStockCard() {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const href = useLocaleHref();

  const waiting = pendingCountByProduct(stockAlertsRepo.all());

  const rows = productsRepo
    .all()
    .filter((p) => p.active && (p.stock <= 0 || isLowStock(p.stock, settings)))
    // Sold out first, then closest to running out, then most waited-on.
    .sort(
      (a, b) =>
        a.stock - b.stock ||
        (waiting.get(b.id) ?? 0) - (waiting.get(a.id) ?? 0)
    )
    .slice(0, 6);

  return (
    <Card className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">{t("admin.lowStock")}</h2>
        <Link
          href={href("/admin/products")}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {t("home.viewAll")}
        </Link>
      </div>
      <p className="mb-4 text-xs text-slate-400">{t("admin.lowStockHint")}</p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {t("admin.stockOk")}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((product) => {
            const count = waiting.get(product.id) ?? 0;
            return (
              <li key={product.id} className="flex items-center gap-3">
                <span className="h-9 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      product.images.find((i) => i.id === product.primaryImageId)
                        ?.src ?? product.images[0]?.src
                    }
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {localized(product.title, locale)}
                  </span>
                  {count > 0 && (
                    <span className="text-xs text-indigo-600">
                      {formatNumber(count, locale)} {t("stockAlert.waiting")}
                    </span>
                  )}
                </span>

                {product.stock <= 0 ? (
                  <Badge tone="danger">{t("admin.outOfStock")}</Badge>
                ) : (
                  <Badge tone="warning">
                    {formatNumber(product.stock, locale)}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
