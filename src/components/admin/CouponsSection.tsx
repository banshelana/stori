"use client";

import { useState } from "react";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/form/Field";
import { DateField } from "@/components/form/DateField";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar, NewButton } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Badge, PageHeader } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import { COUPON_KINDS, type Coupon, type CouponKind } from "@/lib/data/coupons";
import { couponsRepo } from "@/lib/data/repositories";
import { isRedeemable, normalizeCode } from "@/lib/coupons";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { useFormErrors } from "@/lib/useFormErrors";
import { useResourceList } from "@/lib/useResourceList";
import { toAsciiDigits, validateRequired } from "@/lib/validation";

const BLANK = {
  code: "",
  kind: "percent" as CouponKind,
  value: "10",
  minSubtotal: "",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  active: true,
};

type FormState = typeof BLANK;

function toMinor(major: string): number {
  const n = Number(toAsciiDigits(major));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function toMajor(minor: number): string {
  return minor === 0 ? "" : String(minor / 100);
}

export function CouponsSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(couponsRepo, {
    initialSortKey: "code",
    // A coupon occupies a period, so the window is matched by overlap.
    // See couponsRepo's rangeMatch.
    rangeField: "startsAt",
  });

  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [pending, setPending] = useState(false);

  const canWrite = can("sales.write");

  async function handleSave(form: FormState) {
    setPending(true);
    try {
      const payload = {
        code: normalizeCode(form.code),
        kind: form.kind,
        value:
          form.kind === "percent"
            ? Number(toAsciiDigits(form.value)) || 0
            : toMinor(form.value),
        minSubtotal: form.minSubtotal ? toMinor(form.minSubtotal) : 0,
        maxDiscount: form.maxDiscount ? toMinor(form.maxDiscount) : 0,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        usageLimit: form.usageLimit ? Number(toAsciiDigits(form.usageLimit)) : 0,
        active: form.active,
      };

      if (editing === "new") {
        await couponsRepo.create({ ...payload, usedCount: 0 });
      } else if (editing) {
        await couponsRepo.update(editing.id, payload);
      }
      setEditing(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: t("coupon.code"),
      sortable: true,
      render: (c) => (
        <span className="force-ltr font-mono font-semibold text-slate-900">
          {c.code}
        </span>
      ),
    },
    {
      key: "value",
      header: t("coupon.value"),
      sortable: true,
      render: (c) => (
        <span className="text-slate-700">
          {c.kind === "percent"
            ? `${formatNumber(c.value, locale)}%`
            : formatPrice(c.value, "EUR", locale)}
        </span>
      ),
    },
    {
      key: "minSubtotal",
      header: t("coupon.minSubtotal"),
      hideOnMobile: true,
      render: (c) =>
        c.minSubtotal > 0 ? (
          <span className="text-slate-600">
            {formatPrice(c.minSubtotal, "EUR", locale)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "usedCount",
      header: t("coupon.used"),
      sortable: true,
      align: "end",
      render: (c) => (
        <span className="text-slate-600">
          {formatNumber(c.usedCount, locale)}
          {c.usageLimit > 0 && (
            <span className="text-slate-400">
              {" "}
              / {formatNumber(c.usageLimit, locale)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "endsAt",
      header: t("coupon.window"),
      sortable: true,
      hideOnMobile: true,
      render: (c) =>
        c.startsAt || c.endsAt ? (
          <span className="text-xs text-slate-500">
            {c.startsAt ? formatDate(c.startsAt, locale) : "…"} –{" "}
            {c.endsAt ? formatDate(c.endsAt, locale) : "…"}
          </span>
        ) : (
          <span className="text-slate-300">{t("coupon.always")}</span>
        ),
    },
    {
      key: "status",
      header: t("common.status"),
      render: (c) => {
        // Live is stricter than active: a code can be switched on yet be
        // expired or fully used, and the table should say which.
        if (!c.active) return <Badge tone="neutral">{t("common.disabled")}</Badge>;
        return isRedeemable(c) ? (
          <Badge tone="success">{t("coupon.live")}</Badge>
        ) : (
          <Badge tone="warning">{t("coupon.notLive")}</Badge>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.coupons")}
        subtitle={t("coupon.hint")}
        action={
          canWrite && (
            <NewButton
              label={t("coupon.newCoupon")}
              onClick={() => setEditing("new")}
            />
          )
        }
      />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("coupon.searchCoupons")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        range={list.range}
        onRange={list.setRange}
        rangeLabel={t("range.validBetween")}
        filters={[
          {
            key: "active",
            label: t("common.status"),
            options: [
              { value: "true", label: t("common.active") },
              { value: "false", label: t("common.disabled") },
            ],
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(c) => c.id}
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
                  onClick: (c) => setEditing(c),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (c) => setDeleting(c),
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

      {editing !== null && (
        <CouponModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          pending={pending}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("coupon.deleteCoupon")}
        body={deleting?.code}
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          setPending(true);
          try {
            await couponsRepo.remove(deleting.id);
            setDeleting(null);
            list.reload();
          } finally {
            setPending(false);
          }
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function CouponModal({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Coupon | "new";
  pending: boolean;
  onSave: (form: FormState) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const isNew = initial === "new";
  const { errors, setErrors, clear } = useFormErrors();

  const [form, setForm] = useState<FormState>(
    isNew
      ? BLANK
      : {
          code: initial.code,
          kind: initial.kind,
          value:
            initial.kind === "percent"
              ? String(initial.value)
              : toMajor(initial.value),
          minSubtotal: toMajor(initial.minSubtotal),
          maxDiscount: toMajor(initial.maxDiscount),
          startsAt: initial.startsAt ?? "",
          endsAt: initial.endsAt ?? "",
          usageLimit: initial.usageLimit ? String(initial.usageLimit) : "",
          active: initial.active,
        }
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key as string);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};

    if (!validateRequired(form.code)) next.code = t("validation.required");
    const value = Number(toAsciiDigits(form.value));
    if (!Number.isFinite(value) || value <= 0) {
      next.value = t("coupon.valuePositive");
    } else if (form.kind === "percent" && value > 100) {
      next.value = t("settings.percentRange");
    }
    if (form.startsAt && form.endsAt && form.startsAt > form.endsAt) {
      next.endsAt = t("coupon.endBeforeStart");
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave(form);
  }

  return (
    <Modal
      open
      size="lg"
      title={isNew ? t("coupon.newCoupon") : t("coupon.editCoupon")}
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
            type="submit"
            form="coupon-form"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending
              ? t("common.loading")
              : isNew
                ? t("common.create")
                : t("common.saveChanges")}
          </button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("coupon.code")}
            required
            dir="ltr"
            hint={t("coupon.codeHint")}
            value={form.code}
            onChange={(v) => set("code", v.toUpperCase())}
            error={errors.code}
          />
          <SelectField
            label={t("coupon.kind")}
            value={form.kind}
            onChange={(v) => set("kind", v as CouponKind)}
            options={COUPON_KINDS.map((value) => ({
              value,
              label: t(`coupon.kinds.${value}`),
            }))}
          />
          <TextField
            label={
              form.kind === "percent" ? t("coupon.percent") : t("coupon.amount")
            }
            required
            inputMode="numeric"
            value={form.value}
            onChange={(v) => set("value", v)}
            error={errors.value}
          />
          {form.kind === "percent" && (
            <TextField
              label={t("coupon.maxDiscount")}
              inputMode="numeric"
              hint={t("coupon.maxDiscountHint")}
              value={form.maxDiscount}
              onChange={(v) => set("maxDiscount", v)}
            />
          )}
          <TextField
            label={t("coupon.minSubtotal")}
            inputMode="numeric"
            hint={t("settings.majorUnits")}
            value={form.minSubtotal}
            onChange={(v) => set("minSubtotal", v)}
          />
          <TextField
            label={t("coupon.usageLimit")}
            inputMode="numeric"
            hint={t("coupon.usageLimitHint")}
            value={form.usageLimit}
            onChange={(v) => set("usageLimit", v)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            label={t("coupon.startsAt")}
            value={form.startsAt}
            onChange={(v) => set("startsAt", v)}
            max={form.endsAt || undefined}
          />
          <div>
            <DateField
              label={t("coupon.endsAt")}
              value={form.endsAt}
              onChange={(v) => set("endsAt", v)}
              min={form.startsAt || undefined}
            />
            {errors.endsAt && (
              <p className="mt-1 text-xs text-rose-600">{errors.endsAt}</p>
            )}
          </div>
        </div>

        <CheckboxField
          label={t("common.active")}
          checked={form.active}
          onChange={(v) => set("active", v)}
        />
      </form>
    </Modal>
  );
}
