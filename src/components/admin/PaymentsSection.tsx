"use client";

import { useState } from "react";
import { SelectField } from "@/components/form/Field";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import {
  Badge,
  PAYMENT_STATUS_TONE,
  PageHeader,
} from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/data/commerce";
import {
  customersRepo,
  ordersRepo,
  paymentsRepo,
} from "@/lib/data/repositories";
import { formatDate, formatPrice } from "@/lib/format";
import { useResourceList } from "@/lib/useResourceList";

export function PaymentsSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(paymentsRepo, {
    initialSortKey: "paidAt",
    initialSortDir: "desc",
     rangeField: "paidAt",
  });

  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [pending, setPending] = useState(false);

  const canWrite = can("payments.write");

  function customerName(userId: string) {
    const user = customersRepo.all().find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : t("common.unknown");
  }

  function orderReference(orderId: string) {
    return ordersRepo.all().find((o) => o.id === orderId)?.reference ?? "—";
  }

  async function handleSave(status: PaymentStatus, method: PaymentMethod) {
    if (!editing) return;
    setPending(true);
    try {
      await paymentsRepo.update(editing.id, { status, method });
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
      await paymentsRepo.remove(deleting.id);
      setDeleting(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Payment>[] = [
    {
      key: "reference",
      header: t("payment.reference"),
      sortable: true,
      render: (p) => (
        <span className="force-ltr font-medium text-slate-900">{p.reference}</span>
      ),
    },
    {
      key: "order",
      header: t("order.orderNo"),
      hideOnMobile: true,
      render: (p) => (
        <span className="force-ltr text-slate-600">
          {orderReference(p.orderId)}
        </span>
      ),
    },
    {
      key: "customer",
      header: t("common.customer"),
      hideOnMobile: true,
      render: (p) => (
        <span className="text-slate-600">{customerName(p.userId)}</span>
      ),
    },
    {
      key: "method",
      header: t("payment.method"),
      sortable: true,
      hideOnMobile: true,
      render: (p) => (
        <span className="text-slate-600">{t(`payment.methods.${p.method}`)}</span>
      ),
    },
    {
      key: "paidAt",
      header: t("payment.paidOn"),
      sortable: true,
      hideOnMobile: true,
      render: (p) => (
        <span className="text-slate-500">{formatDate(p.paidAt, locale)}</span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (p) => (
        <Badge tone={PAYMENT_STATUS_TONE[p.status]}>
          {t(`payment.status.${p.status}`)}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      sortable: true,
      align: "end",
      render: (p) => (
        <span className="font-semibold text-slate-900">
          {formatPrice(p.amount, p.currency, locale)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.payments")} />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("admin.searchPayments")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        range={list.range}
        onRange={list.setRange}
        rangeLabel={t("range.paidOn")}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: PAYMENT_STATUSES.map((value) => ({
              value,
              label: t(`payment.status.${value}`),
            })),
          },
          {
            key: "method",
            label: t("payment.method"),
            options: PAYMENT_METHODS.map((value) => ({
              value,
              label: t(`payment.methods.${value}`),
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
        rowKey={(p) => p.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canWrite
            ? [
                {
                  icon: "pencil",
                  label: t("common.edit"),
                  onClick: (p) => setEditing(p),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (p) => setDeleting(p),
                },
              ]
            : undefined
        }
      />

      <Pagination
        page={list.page}
        pageCount={list.pageCount}
        total={list.total}
        onPage={list.setPage}
      />

      {editing && (
        <PaymentModal
          payment={editing}
          pending={pending}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deletePayment")}
        body={deleting?.reference}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function PaymentModal({
  payment,
  pending,
  onSave,
  onCancel,
}: {
  payment: Payment;
  pending: boolean;
  onSave: (status: PaymentStatus, method: PaymentMethod) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<PaymentStatus>(payment.status);
  const [method, setMethod] = useState<PaymentMethod>(payment.method);

  return (
    <Modal
      open
      title={`${t("payment.reference")} ${payment.reference}`}
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
          <button
            type="button"
            onClick={() => onSave(status, method)}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("common.saveChanges")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">{t("common.amount")}: </span>
          <span className="font-semibold text-slate-900">
            {formatPrice(payment.amount, payment.currency, locale)}
          </span>
        </p>

        <SelectField
          label={t("common.status")}
          value={status}
          onChange={(v) => setStatus(v as PaymentStatus)}
          options={PAYMENT_STATUSES.map((value) => ({
            value,
            label: t(`payment.status.${value}`),
          }))}
        />
        <SelectField
          label={t("payment.method")}
          value={method}
          onChange={(v) => setMethod(v as PaymentMethod)}
          options={PAYMENT_METHODS.map((value) => ({
            value,
            label: t(`payment.methods.${value}`),
          }))}
        />
      </div>
    </Modal>
  );
}
