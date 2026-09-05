"use client";

import { useState } from "react";
import { SelectField } from "@/components/form/Field";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import {
  Badge,
  ORDER_STATUS_TONE,
  PageHeader,
} from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { localized } from "@/i18n/localized";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/data/commerce";
import { customersRepo, ordersRepo } from "@/lib/data/repositories";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { useResourceList } from "@/lib/useResourceList";

/** Resolves the buyer for display; orders store only the id. */
function useCustomerName() {
  const { t } = useI18n();
  return (userId: string) => {
    const user = customersRepo.all().find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : t("common.unknown");
  };
}

export function SalesSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const customerName = useCustomerName();
  const href = useLocaleHref();
  const router = useRouter();
  const list = useResourceList(ordersRepo, {
    initialSortKey: "createdAt",
    initialSortDir: "desc",
  });

  const [editing, setEditing] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [pending, setPending] = useState(false);

  const canWrite = can("sales.write");

  async function handleSave(status: OrderStatus) {
    if (!editing) return;
    setPending(true);
    try {
      await ordersRepo.update(editing.id, {
        status,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      setEditing(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setPending(true);
    try {
      await ordersRepo.remove(deleting.id);
      setDeleting(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Order>[] = [
    {
      key: "reference",
      header: t("order.orderNo"),
      sortable: true,
      render: (o) => (
        <span className="force-ltr font-medium text-slate-900">
          {o.reference}
        </span>
      ),
    },
    {
      key: "customer",
      header: t("common.customer"),
      render: (o) => <span className="text-slate-600">{customerName(o.userId)}</span>,
    },
    {
      key: "createdAt",
      header: t("common.date"),
      sortable: true,
      hideOnMobile: true,
      render: (o) => (
        <span className="text-slate-500">{formatDate(o.createdAt, locale)}</span>
      ),
    },
    {
      key: "items",
      header: t("order.items"),
      align: "end",
      hideOnMobile: true,
      render: (o) => (
        <span className="text-slate-600">
          {formatNumber(
            o.lines.reduce((sum, l) => sum + l.quantity, 0),
            locale
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (o) => (
        <Badge tone={ORDER_STATUS_TONE[o.status]}>
          {t(`order.status.${o.status}`)}
        </Badge>
      ),
    },
    {
      key: "total",
      header: t("common.amount"),
      sortable: true,
      align: "end",
      render: (o) => (
        <span className="font-semibold text-slate-900">
          {formatPrice(o.total, o.currency, locale)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.sales")} />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("admin.searchOrders")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: ORDER_STATUSES.map((value) => ({
              value,
              label: t(`order.status.${value}`),
            })),
          },
        ]}
      />

      {list.error && (
        <p className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {t("common.error")}: {list.error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(o) => o.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={[
          {
            icon: "inbox",
            label: t("orderDetail.open"),
            onClick: (o) => router.push(href(`/admin/orders/${o.id}`)),
          },
          {
            icon: canWrite ? "pencil" : "eye",
            label: canWrite ? t("common.edit") : t("common.view"),
            onClick: (o) => setEditing(o),
          },
          ...(canWrite
            ? [
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger" as const,
                  onClick: (o: Order) => setDeleting(o),
                },
              ]
            : []),
        ]}
      />

      <Pagination
        page={list.page}
        pageCount={list.pageCount}
        total={list.total}
        onPage={list.setPage}
      />

      {editing && (
        <OrderModal
          order={editing}
          canWrite={canWrite}
          pending={pending}
          customerName={customerName(editing.userId)}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deleteOrder")}
        body={deleting?.reference}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/**
 * Lines are a record of what was bought, so they're read-only here —
 * status is the only field an operator moves.
 */
function OrderModal({
  order,
  canWrite,
  pending,
  customerName,
  onSave,
  onCancel,
}: {
  order: Order;
  canWrite: boolean;
  pending: boolean;
  customerName: string;
  onSave: (status: OrderStatus) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<OrderStatus>(order.status);

  return (
    <Modal
      open
      size="lg"
      title={`${t("order.orderNo")} ${order.reference}`}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t("common.cancel")}
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={() => onSave(status)}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? t("common.loading") : t("common.saveChanges")}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("common.customer")}
            </dt>
            <dd className="mt-1 font-medium text-slate-900">{customerName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("order.placedOn")}
            </dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatDate(order.createdAt, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("common.total")}
            </dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatPrice(order.total, order.currency, locale)}
            </dd>
          </div>
        </dl>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("admin.orderLines")}
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {order.lines.map((l) => (
              <li
                key={l.productId}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate text-slate-700">
                  {localized(l.title, locale)} &times;{" "}
                  {formatNumber(l.quantity, locale)}
                </span>
                <span className="shrink-0 font-medium text-slate-900">
                  {formatPrice(l.quantity * l.unitPrice, order.currency, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <SelectField
          label={t("common.status")}
          value={status}
          disabled={!canWrite}
          onChange={(v) => setStatus(v as OrderStatus)}
          options={ORDER_STATUSES.map((value) => ({
            value,
            label: t(`order.status.${value}`),
          }))}
        />
      </div>
    </Modal>
  );
}
