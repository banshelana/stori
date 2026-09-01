"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  EmptyState,
  PAYMENT_STATUS_TONE,
  PageHeader,
  TableSkeleton,
} from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import { mockPaymentsForUser, type Payment } from "@/lib/data/commerce";
import { formatDate, formatPrice } from "@/lib/format";

export function MyPayments() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    mockPaymentsForUser(user.id)
      .then((data) => active && setPayments(data))
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

  return (
    <>
      <PageHeader title={t("account.payments")} />

      {!payments ? (
        <TableSkeleton />
      ) : payments.length === 0 ? (
        <EmptyState title={t("payment.noPayments")} />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 text-start font-semibold">
                    {t("payment.reference")}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t("payment.method")}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t("payment.paidOn")}
                  </th>
                  <th className="px-5 py-3 text-start font-semibold">
                    {t("common.status")}
                  </th>
                  <th className="px-5 py-3 text-end font-semibold">
                    {t("common.amount")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <span className="force-ltr">{payment.reference}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {t(`payment.methods.${payment.method}`)}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(payment.paidAt, locale)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={PAYMENT_STATUS_TONE[payment.status]}>
                        {t(`payment.status.${payment.status}`)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-end font-semibold text-slate-900">
                      {formatPrice(payment.amount, payment.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
