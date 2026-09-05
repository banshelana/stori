"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { MapView } from "@/components/MapView";
import { Icon } from "@/components/panel/Icon";
import { Rating } from "@/components/Rating";
import {
  PrintButton,
  PrintFooter,
  PrintHeader,
  usePrint,
} from "@/components/panel/Print";
import {
  Badge,
  Card,
  EmptyState,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_TONE,
  PageHeader,
} from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/data/commerce";
import {
  findCity,
  findCountry,
  findProvince,
  geoName,
} from "@/lib/data/geo";
import {
  customersRepo,
  ordersRepo,
  paymentsRepo,
  productsRepo,
  reviewsRepo,
} from "@/lib/data/repositories";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { isValidLatLon } from "@/lib/map";
import { buildOrderDetail, paymentShortfall } from "@/lib/orderDetail";
import { primaryImageSrc } from "@/lib/product";
import { printFilename } from "@/lib/printing";

export function OrderDetailSection({ orderId }: { orderId: string }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const href = useLocaleHref();
  const print = usePrint();

  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);

  const canWriteOrders = can("sales.write");
  const canWriteReviews = can("reviews.write");

  const order = ordersRepo.all().find((o) => o.id === orderId);
  const customer = order
    ? customersRepo.all().find((u) => u.id === order.userId)
    : undefined;

  // Assembled on demand for this one order — the list pages carry none
  // of this.
  const detail = useMemo(
    () =>
      order
        ? buildOrderDetail({
            order,
            allOrders: ordersRepo.all(),
            products: productsRepo.all(),
            payments: paymentsRepo.all(),
            reviews: reviewsRepo.all(),
            addresses: customer?.addresses,
          })
        : null,
    // version forces a rebuild after a mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, customer, version]
  );

  if (!order || !detail) {
    return (
      <EmptyState
        title={t("orderDetail.notFound")}
        hint={t("orderDetail.notFoundHint")}
        action={
          <Link
            href={href("/admin/sales")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {t("admin.sales")}
          </Link>
        }
      />
    );
  }

  const shortfall = paymentShortfall(detail);
  const pin =
    detail.currentDefaultAddress &&
    isValidLatLon({
      lat: detail.currentDefaultAddress.lat,
      lon: detail.currentDefaultAddress.lon,
    })
      ? [
          {
            id: detail.currentDefaultAddress.id,
            lat: detail.currentDefaultAddress.lat as number,
            lon: detail.currentDefaultAddress.lon as number,
          },
        ]
      : [];

  async function setStatus(next: OrderStatus) {
    setPending(true);
    try {
      await ordersRepo.update(order!.id, {
        status: next,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      setVersion((v) => v + 1);
    } finally {
      setPending(false);
    }
  }

  async function setApproved(reviewId: string, approved: boolean) {
    setPending(true);
    try {
      await reviewsRepo.update(reviewId, { approved });
      setVersion((v) => v + 1);
    } finally {
      setPending(false);
    }
  }

  function addressLine(): string {
    const a = detail!.currentDefaultAddress;
    if (!a) return "";
    const place = [
      findCountry(a.countryId),
      findProvince(a.provinceId),
      findCity(a.cityId),
    ]
      .map((entry) => (entry ? geoName(entry.name, locale) : "—"))
      .join(" › ");
    const street = [
      a.street && `${t("address.street")} ${a.street}`,
      a.alley && `${t("address.alley")} ${a.alley}`,
      a.buildingNo && `${t("address.buildingNo")} ${a.buildingNo}`,
      a.unit && `${t("address.unit")} ${a.unit}`,
    ]
      .filter(Boolean)
      .join(locale === "fa" ? "، " : ", ");
    return `${place}\n${street}`;
  }

  return (
    <div className="print-area">
      {/* The letterhead below is the printed version of this. */}
      <div className="print-hide">
        <PageHeader
          title={`${t("order.orderNo")} ${order.reference}`}
          subtitle={t("orderDetail.subtitle")}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <PrintButton
                onClick={() =>
                  print(printFilename([t("order.orderNo"), order.reference]))
                }
              />
              <Link
                href={href("/admin/sales")}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Icon name="arrowRight" className="h-4 w-4 rotate-180 rtl-flip" />
                {t("common.back")}
              </Link>
            </div>
          }
        />
      </div>

      <PrintHeader
        title={`${t("order.orderNo")} ${order.reference}`}
        subtitle={customer ? `${customer.firstName} ${customer.lastName}` : undefined}
      />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* ------------------------------------------- left column */}
        <div className="min-w-0 space-y-5">
          {/* Status */}
          <Card className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("common.status")}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge tone={ORDER_STATUS_TONE[order.status]}>
                    {t(`order.status.${order.status}`)}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    {t("order.placedOn")} {formatDate(order.createdAt, locale)}
                  </span>
                </div>
              </div>

              {canWriteOrders && (
                <div className="print-hide flex flex-wrap gap-1">
                  {ORDER_STATUSES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={pending || value === order.status}
                      onClick={() => setStatus(value)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                        value === order.status
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {t(`order.status.${value}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Lines, each with the customer's review of that product */}
          <Card className="min-w-0">
            <h2 className="font-bold text-slate-900">{t("admin.orderLines")}</h2>

            <ul className="mt-4 divide-y divide-slate-100">
              {detail.lines.map(({ line, product, review }) => (
                <li key={line.productId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {product && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={primaryImageSrc(product)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      {product ? (
                        <Link
                          href={href(`/products/${product.slug}`)}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {localized(line.title, locale)}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-900">
                          {localized(line.title, locale)}
                          <Badge tone="danger">{t("orderDetail.deleted")}</Badge>
                        </span>
                      )}
                      <p className="mt-0.5 text-sm text-slate-500">
                        {formatNumber(line.quantity, locale)} &times;{" "}
                        {formatPrice(line.unitPrice, order.currency, locale)}
                      </p>
                    </div>

                    <span className="shrink-0 font-semibold text-slate-900">
                      {formatPrice(
                        line.quantity * line.unitPrice,
                        order.currency,
                        locale
                      )}
                    </span>
                  </div>

                  {/* The review this customer left for this product. */}
                  {review ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Rating value={review.rating} />
                          <Badge tone={review.approved ? "success" : "warning"}>
                            {review.approved
                              ? t("review.approved")
                              : t("review.pending")}
                          </Badge>
                        </span>

                        {canWriteReviews && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setApproved(review.id, !review.approved)}
                            className="print-hide rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {review.approved
                              ? t("common.unapprove")
                              : t("common.approve")}
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {review.body}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(review.createdAt, locale)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      {t("orderDetail.noReview")}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between font-bold text-slate-900">
                <dt>{t("common.total")}</dt>
                <dd>{formatPrice(order.total, order.currency, locale)}</dd>
              </div>
            </dl>
          </Card>

          {/* Payments */}
          <Card className="min-w-0">
            <h2 className="font-bold text-slate-900">{t("admin.payments")}</h2>

            {detail.payments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                {t("payment.noPayments")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm"
                  >
                    <span className="force-ltr font-medium text-slate-900">
                      {p.reference}
                    </span>
                    <span className="text-slate-500">
                      {t(`payment.methods.${p.method}`)}
                    </span>
                    <Badge tone={PAYMENT_STATUS_TONE[p.status]}>
                      {t(`payment.status.${p.status}`)}
                    </Badge>
                    <span className="font-semibold text-slate-900">
                      {formatPrice(p.amount, p.currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {shortfall > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                {t("orderDetail.shortfall", {
                  amount: formatPrice(shortfall, order.currency, locale),
                })}
              </p>
            )}
          </Card>
        </div>

        {/* ------------------------------------------ right column */}
        <div className="min-w-0 space-y-5">
          {/* Customer */}
          <Card className="min-w-0">
            <h2 className="font-bold text-slate-900">{t("common.customer")}</h2>

            {customer ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    firstName={customer.firstName}
                    lastName={customer.lastName}
                    avatarUrl={customer.avatarUrl}
                    avatarColor={customer.avatarColor}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <Badge tone={customer.subRole === "vip" ? "info" : "neutral"}>
                      {t(`roles.${customer.subRole}`)}
                    </Badge>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <Row label={t("auth.mobile")}>
                    <a
                      href={`tel:${customer.mobile}`}
                      className="force-ltr text-indigo-600 hover:underline"
                    >
                      {customer.mobile}
                    </a>
                  </Row>
                  {customer.email && (
                    <Row label={t("account.email")}>
                      <a
                        href={`mailto:${customer.email}`}
                        className="force-ltr text-indigo-600 hover:underline"
                      >
                        {customer.email}
                      </a>
                    </Row>
                  )}
                  <Row label={t("orderDetail.orderCount")}>
                    {formatNumber(detail.history.orderCount, locale)}
                  </Row>
                  <Row label={t("orderDetail.lifetimeValue")}>
                    {formatPrice(
                      detail.history.lifetimeValue,
                      order.currency,
                      locale
                    )}
                  </Row>
                  {detail.history.firstOrderAt && (
                    <Row label={t("orderDetail.customerSince")}>
                      {formatDate(detail.history.firstOrderAt, locale)}
                    </Row>
                  )}
                </dl>

                <Link
                  href={href("/admin/customers")}
                  className="print-hide mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Icon name="users" className="h-4 w-4" />
                  {t("admin.customers")}
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t("common.unknown")}</p>
            )}
          </Card>

          {/* Address */}
          <Card className="min-w-0">
            <h2 className="font-bold text-slate-900">{t("address.title")}</h2>

            {detail.currentDefaultAddress ? (
              <>
                {/* An order carries no address of its own, so this is the
                    customer's current default — not necessarily where this
                    order was sent. Saying so avoids a costly assumption. */}
                <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                  {t("orderDetail.addressCaveat")}
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {addressLine()}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {t("address.postalCode")}:{" "}
                  <span className="force-ltr font-medium">
                    {detail.currentDefaultAddress.postalCode}
                  </span>
                </p>

                {pin.length > 0 && (
                  <>
                    <div className="print-hide mt-3">
                      <MapView markers={pin} height={200} />
                    </div>
                    {/* Map tiles come out of a printer as grey mush, and
                        they are fetched from a tile server that may not
                        answer during a print. The coordinates carry the
                        same information and always render. */}
                    <p className="print-only mt-2 text-sm text-slate-500">
                      {t("print.coordinates", {
                        lat: pin[0].lat.toFixed(6),
                        lon: pin[0].lon.toFixed(6),
                      })}
                    </p>
                  </>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                {t("orderDetail.noAddress")}
              </p>
            )}
          </Card>

          {/* Other orders */}
          {detail.history.otherOrders.length > 0 && (
            <Card className="min-w-0">
              <h2 className="font-bold text-slate-900">
                {t("orderDetail.otherOrders")}
              </h2>
              <ul className="mt-3 space-y-2">
                {detail.history.otherOrders.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={href(`/admin/orders/${o.id}`)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-sm hover:bg-slate-50"
                    >
                      <span className="force-ltr font-medium text-slate-900">
                        {o.reference}
                      </span>
                      <Badge tone={ORDER_STATUS_TONE[o.status]}>
                        {t(`order.status.${o.status}`)}
                      </Badge>
                      <span className="font-semibold text-slate-700">
                        {formatPrice(o.total, o.currency, locale)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
      <PrintFooter />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-end font-medium text-slate-900">
        {children}
      </dd>
    </div>
  );
}
