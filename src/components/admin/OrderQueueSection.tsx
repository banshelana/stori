"use client";

import { useEffect, useMemo, useState } from "react";
import { DateField } from "@/components/form/DateField";
import { Icon } from "@/components/panel/Icon";
import {
  Badge,
  Card,
  EmptyState,
  ORDER_STATUS_TONE,
  PageHeader,
} from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useAuth } from "@/lib/auth/auth-context";
import type { Order, OrderStatus } from "@/lib/data/commerce";
import { ordersRepo } from "@/lib/data/repositories";
import { useSettings } from "@/lib/settings-context";
import { productsRepo } from "@/lib/data/repositories";
import { nextStock, stockDeltas } from "@/lib/inventory";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import {
  filterQueue,
  QUEUE_STATUSES,
  urgencyOf,
  waitingDays,
  type QueueFilters,
  type Urgency,
} from "@/lib/orderQueue";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useOrderQueue } from "@/lib/useOrderQueue";
import { toAsciiDigits } from "@/lib/validation";

const URGENCY_STYLE: Record<Urgency, { ring: string; tone: "neutral" | "warning" | "danger" }> =
  {
    fresh: { ring: "border-slate-200", tone: "neutral" },
    waiting: { ring: "border-amber-300", tone: "warning" },
    overdue: { ring: "border-rose-300", tone: "danger" },
  };

export function OrderQueueSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const queue = useOrderQueue();
  const { settings } = useSettings();

  const canWrite = can("sales.write");

  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [status, setStatus] = useState<QueueFilters["status"]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Text fields debounce; the selects and dates apply at once.
  const dCustomer = useDebouncedValue(customer);
  const dProduct = useDebouncedValue(product);

  const filters: QueueFilters = useMemo(
    () => ({
      customer: dCustomer,
      product: dProduct,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      minTotal: minTotal ? Number(toAsciiDigits(minTotal)) * 100 : undefined,
      maxTotal: maxTotal ? Number(toAsciiDigits(maxTotal)) * 100 : undefined,
      status,
    }),
    [dCustomer, dProduct, dateFrom, dateTo, minTotal, maxTotal, status]
  );

  const visible = useMemo(
    () => filterQueue(queue.orders, filters, queue.lookupCustomer),
    [queue.orders, filters, queue.lookupCustomer]
  );

  const hasFilters =
    Boolean(customer || product || dateFrom || dateTo || minTotal || maxTotal) ||
    status !== "all";

  // Arriving on the page is the acknowledgement — the badge should not
  // still be shouting while the operator is looking at the list.
  useEffect(() => {
    if (queue.loading || queue.unseen.length === 0) return;
    const id = window.setTimeout(() => queue.markSeen(), 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.loading, queue.unseen.length]);

  function reset() {
    setCustomer("");
    setProduct("");
    setDateFrom("");
    setDateTo("");
    setMinTotal("");
    setMaxTotal("");
    setStatus("all");
  }

  async function advance(order: Order, next: OrderStatus) {
    setBusyId(order.id);
    try {
      await ordersRepo.update(order.id, {
        status: next,
        updatedAt: new Date().toISOString().slice(0, 10),
      });

      // Cancelling releases the units the order was holding.
      if (next === "canceled") {
        for (const [productId, delta] of stockDeltas(
          order.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
          "restore"
        )) {
          const product = productsRepo.all().find((p) => p.id === productId);
          if (!product) continue;
          await productsRepo.update(productId, {
            stock: nextStock(product.stock, delta),
          });
        }
      }

      queue.reload();
    } finally {
      setBusyId(null);
    }
  }

  const stats = [
    { key: "total", value: queue.summary.total, tone: "info" as const },
    { key: "created", value: queue.summary.created, tone: "info" as const },
    { key: "pending", value: queue.summary.pending, tone: "warning" as const },
    { key: "overdue", value: queue.summary.overdue, tone: "danger" as const },
  ];

  return (
    <>
      <PageHeader title={t("admin.queue")} subtitle={t("queue.hint")} />

      {/* Standing summary — the numbers an operator checks first. */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.key} className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              {t(`queue.stat.${stat.key}`)}
            </span>
            <span
              className={`text-2xl font-extrabold ${
                stat.key === "overdue" && stat.value > 0
                  ? "text-rose-600"
                  : "text-slate-900"
              }`}
            >
              {formatNumber(stat.value, locale)}
            </span>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label={t("queue.searchCustomer")}>
            <IconInput
              icon="users"
              value={customer}
              onChange={setCustomer}
              placeholder={t("queue.searchCustomerHint")}
            />
          </Field>

          <Field label={t("queue.searchProduct")}>
            <IconInput
              icon="box"
              value={product}
              onChange={setProduct}
              placeholder={t("queue.searchProductHint")}
            />
          </Field>

          <Field label={t("common.status")}>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as QueueFilters["status"])
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
            >
              <option value="all">{t("common.all")}</option>
              {QUEUE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`order.status.${value}`)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <DateField
              label={t("queue.dateFrom")}
              value={dateFrom}
              onChange={setDateFrom}
              max={dateTo || undefined}
            />
            <DateField
              label={t("queue.dateTo")}
              value={dateTo}
              onChange={setDateTo}
              min={dateFrom || undefined}
            />
          </div>

          <Field label={t("queue.priceRange")}>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={minTotal}
                onChange={(e) => setMinTotal(e.target.value)}
                placeholder={t("product.priceMin")}
                aria-label={t("product.priceMin")}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
              />
              <span className="text-slate-400">–</span>
              <input
                inputMode="numeric"
                value={maxTotal}
                onChange={(e) => setMaxTotal(e.target.value)}
                placeholder={t("product.priceMax")}
                aria-label={t("product.priceMax")}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </Field>

          <div className="flex items-end justify-between gap-2">
            <p className="text-sm text-slate-500">
              {t("queue.showing", {
                count: formatNumber(visible.length, locale),
                total: formatNumber(queue.orders.length, locale),
              })}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t("common.reset")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      {queue.loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" aria-hidden />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            queue.orders.length === 0 ? t("queue.allClear") : t("common.noResults")
          }
          hint={
            queue.orders.length === 0
              ? t("queue.allClearHint")
              : t("common.noResultsHint")
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((order, i) => (
            <OrderCard
              key={order.id}
              order={order}
              index={i}
              isNew={queue.isUnseen(order)}
              customer={queue.lookupCustomer(order.userId)}
              canWrite={canWrite}
              overdueAfterDays={settings.overdueAfterDays}
              busy={busyId === order.id}
              onAdvance={advance}
            />
          ))}
        </div>
      )}
    </>
  );
}

function OrderCard({
  order,
  index,
  isNew,
  customer,
  canWrite,
  overdueAfterDays,
  busy,
  onAdvance,
}: {
  order: Order;
  index: number;
  isNew: boolean;
  customer: { name: string; mobile: string } | undefined;
  canWrite: boolean;
  overdueAfterDays: number;
  busy: boolean;
  onAdvance: (order: Order, next: OrderStatus) => void;
}) {
  const { t, locale } = useI18n();
  const days = waitingDays(order);
  const urgency = urgencyOf(days, overdueAfterDays);
  const style = URGENCY_STYLE[urgency];
  const units = order.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <article
      className={`animate-fade-up card-lift relative flex flex-col rounded-2xl border-2 bg-white p-5 shadow-sm ${style.ring}`}
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      {isNew && (
        <span className="absolute -top-2 start-4 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow">
          {t("queue.new")}
        </span>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="force-ltr text-base font-bold text-slate-900">
            {order.reference}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {formatDate(order.createdAt, locale)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={ORDER_STATUS_TONE[order.status]}>
            {t(`order.status.${order.status}`)}
          </Badge>
          <Badge tone={style.tone}>
            {days === 0
              ? t("queue.today")
              : t("queue.waitingDays", { days: formatNumber(days, locale) })}
          </Badge>
        </div>
      </div>

      {/* Customer */}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
        <Icon name="user" className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">
            {customer?.name ?? t("common.unknown")}
          </span>
          {customer && (
            <a
              href={`tel:${customer.mobile}`}
              className="force-ltr block text-xs text-indigo-600 hover:underline"
            >
              {customer.mobile}
            </a>
          )}
        </span>
      </div>

      {/* Lines */}
      <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
        {order.lines.map((line) => (
          <li key={line.productId} className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-slate-600">
              {localized(line.title, locale)}
              <span className="ms-1 text-slate-400">
                &times; {formatNumber(line.quantity, locale)}
              </span>
            </span>
            <span className="shrink-0 font-medium text-slate-900">
              {formatPrice(line.quantity * line.unitPrice, order.currency, locale)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-500">
          {t("order.itemCount", { count: formatNumber(units, locale) })}
        </span>
        <span className="text-lg font-bold text-slate-900">
          {formatPrice(order.total, order.currency, locale)}
        </span>
      </div>

      {/* One-click transitions — the whole point of a work queue. */}
      {canWrite && (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === "created" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdvance(order, "pending")}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
            >
              <Icon name="check" className="h-4 w-4" />
              {t("queue.markPending")}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance(order, "processing")}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Icon name="box" className="h-4 w-4" />
            {busy ? t("common.loading") : t("queue.startProcessing")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance(order, "canceled")}
            className="ms-auto rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            {t("order.status.canceled")}
          </button>
        </div>
      )}
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function IconInput({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pe-3 ps-9 text-sm outline-none focus:border-indigo-500 focus:bg-white"
      />
    </div>
  );
}
