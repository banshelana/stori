"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  EmptyState,
  ORDER_STATUS_TONE,
  PageHeader,
  TableSkeleton,
} from "@/components/panel/ui";
import { OrderReviewDialog } from "@/components/account/OrderReviewDialog";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useAuth } from "@/lib/auth/auth-context";
import {
  mockOrdersForUser,
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/data/commerce";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { MOCK_REVIEWS } from "@/lib/data/reviews-data";
import { productsRepo } from "@/lib/data/repositories";
import { existingReview } from "@/lib/reviews";

type Tab = OrderStatus | "all";
const TABS: Tab[] = ["all", ...ORDER_STATUSES];

export function MyOrders() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [reviewing, setReviewing] = useState<{
    productId: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setOrders(null);
    mockOrdersForUser(user.id)
      .then((data) => active && setOrders(data))
      .catch(
        (e: unknown) =>
          active && setError(e instanceof Error ? e.message : "error")
      );
    return () => {
      active = false;
    };
  }, [user]);

  if (error) {
    return (
      <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        {t("common.error")}: {error}
      </p>
    );
  }

  const visible =
    orders?.filter((o) => tab === "all" || o.status === tab) ?? [];

  function countFor(status: Tab) {
    if (!orders) return 0;
    return status === "all"
      ? orders.length
      : orders.filter((o) => o.status === status).length;
  }

  return (
    <>
      <PageHeader title={t("account.orders")} />

      {/* Horizontal scroll keeps all six tabs reachable on a phone
          without wrapping into a second row. */}
      <div
        role="tablist"
        aria-label={t("account.orders")}
        className="mb-6 flex gap-1.5 overflow-x-auto pb-1"
      >
        {TABS.map((value) => {
          const active = tab === value;
          return (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(value)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {value === "all" ? t("common.all") : t(`order.status.${value}`)}
              <span
                className={`rounded-full px-1.5 text-xs ${
                  active ? "bg-white/20" : "bg-slate-100"
                }`}
              >
                {formatNumber(countFor(value), locale)}
              </span>
            </button>
          );
        })}
      </div>

      {!orders ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState title={t("order.noOrders")} />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => (
            <Card key={order.id} className="card-lift">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    <span className="force-ltr">{order.reference}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {t("order.placedOn")} {formatDate(order.createdAt, locale)}
                  </p>
                </div>
                <Badge tone={ORDER_STATUS_TONE[order.status]}>
                  {t(`order.status.${order.status}`)}
                </Badge>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
                {order.lines.map((l) => {
                  // Only a completed order can be reviewed — the same rule
                  // the product page enforces, surfaced where the customer
                  // actually is after receiving something.
                  const reviewable = order.status === "done";
                  const mine = user
                    ? existingReview(user.id, l.productId, MOCK_REVIEWS)
                    : undefined;

                  return (
                    <li
                      key={l.productId}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-slate-600">
                        {localized(l.title, locale)} &times;{" "}
                        {formatNumber(l.quantity, locale)}
                      </span>

                      {reviewable && (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewing({
                              productId: l.productId,
                              title: localized(l.title, locale),
                            })
                          }
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                            mine
                              ? mine.approved
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <Icon name="star" className="h-3 w-3" />
                          {mine
                            ? mine.approved
                              ? t("review.yourReview")
                              : t("review.pending")
                            : t("review.writeShort")}
                        </button>
                      )}

                      <span className="shrink-0 font-medium text-slate-900">
                        {formatPrice(
                          l.quantity * l.unitPrice,
                          order.currency,
                          locale
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex justify-between border-t border-slate-100 pt-3">
                <span className="text-sm text-slate-500">
                  {t("order.itemCount", {
                    count: formatNumber(
                      order.lines.reduce((s, l) => s + l.quantity, 0),
                      locale
                    ),
                  })}
                </span>
                <span className="font-bold text-slate-900">
                  {formatPrice(order.total, order.currency, locale)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {reviewing && user && (
        <OrderReviewDialog
          productTitle={reviewing.title}
          productSlug={
            productsRepo.all().find((p) => p.id === reviewing.productId)?.slug ??
            ""
          }
          review={existingReview(user.id, reviewing.productId, MOCK_REVIEWS)}
          onClose={() => setReviewing(null)}
        />
      )}
    </>
  );
}
