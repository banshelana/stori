"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  ORDER_STATUS_TONE,
  PageHeader,
  StatCard,
  TableSkeleton,
} from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import {
  mockDashboardStats,
  type DashboardStats,
} from "@/lib/data/commerce";

export function Dashboard() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    mockDashboardStats()
      .then((data) => active && setStats(data))
      .catch((e: unknown) =>
        active && setError(e instanceof Error ? e.message : "error")
      );
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {t("common.error")}: {error}
      </p>
    );
  }

  if (!stats) {
    return (
      <>
        <PageHeader title={t("admin.dashboard")} />
        <TableSkeleton rows={4} />
      </>
    );
  }

  const maxStatus = Math.max(...stats.ordersByStatus.map((s) => s.count), 1);

  return (
    <>
      <PageHeader title={t("admin.dashboard")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("admin.statsRevenue")}
          value={formatPrice(stats.revenue, stats.currency, locale)}
          change={stats.revenueChange}
          icon="card"
        />
        <StatCard
          label={t("admin.statsOrders")}
          value={formatNumber(stats.orderCount, locale)}
          change={stats.orderChange}
          icon="cart"
        />
        <StatCard
          label={t("admin.statsCustomers")}
          value={formatNumber(stats.customerCount, locale)}
          icon="users"
        />
        <StatCard
          label={t("admin.statsAvgOrder")}
          value={formatPrice(stats.averageOrder, stats.currency, locale)}
          icon="box"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <h2 className="mb-4 font-bold text-slate-900">
            {t("admin.recentOrders")}
          </h2>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 text-start font-semibold">
                    {t("order.orderNo")}
                  </th>
                  <th className="pb-2 text-start font-semibold">
                    {t("common.date")}
                  </th>
                  <th className="pb-2 text-start font-semibold">
                    {t("common.status")}
                  </th>
                  <th className="pb-2 text-end font-semibold">
                    {t("common.amount")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 font-medium text-slate-900">
                      <span className="force-ltr">{order.reference}</span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {formatDate(order.createdAt, locale)}
                    </td>
                    <td className="py-3">
                      <Badge tone={ORDER_STATUS_TONE[order.status]}>
                        {t(`order.status.${order.status}`)}
                      </Badge>
                    </td>
                    <td className="py-3 text-end font-semibold text-slate-900">
                      {formatPrice(order.total, order.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-bold text-slate-900">
              {t("admin.topProducts")}
            </h2>
            <ul className="space-y-3">
              {stats.topProducts.map((p, index) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {formatNumber(index + 1, locale)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                    {localized(p.title, locale)}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatNumber(p.units, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-slate-900">
              {t("admin.ordersByStatus")}
            </h2>
            <ul className="space-y-3">
              {stats.ordersByStatus.map(({ status, count }) => (
                <li key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {t(`order.status.${status}`)}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(count, locale)}
                    </span>
                  </div>
                  {/* Bars grow from the reading edge, so RTL fills right-to-left. */}
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
