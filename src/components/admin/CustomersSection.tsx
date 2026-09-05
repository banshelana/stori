"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/form/Field";
import { Avatar } from "@/components/Avatar";
import {
  CustomerLocationModal,
  hasLocation,
} from "@/components/admin/CustomerLocationModal";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar, NewButton } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import {
  PrintButton,
  PrintCell,
  PrintFooter,
  PrintHeader,
  PrintTable,
  usePrintRows,
  type PrintColumn,
} from "@/components/panel/Print";
import { Badge, PageHeader } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_SUB_ROLES } from "@/lib/auth/permissions";
import type { Sex, SubRole } from "@/lib/auth/types";
import { customersRepo } from "@/lib/data/repositories";
import type { MockUser } from "@/lib/data/users";
import { formatDate, formatNumber } from "@/lib/format";
import { describeFilters, printFilename } from "@/lib/printing";
import { useFormErrors } from "@/lib/useFormErrors";
import { useResourceList } from "@/lib/useResourceList";
import {
  toAsciiDigits,
  validateAge,
  validateEmail,
  validateMobile,
  validateRequired,
} from "@/lib/validation";

const BLANK = {
  firstName: "",
  lastName: "",
  mobile: "",
  email: "",
  phone: "",
  age: "",
  sex: "",
  subRole: "regular" as SubRole,
  password: "",
};

type FormState = typeof BLANK;

export function CustomersSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(customersRepo, {
    // The repo backs every user; this section is only the customers.
    initialFilters: { role: "customer" },
    initialSortKey: "createdAt",
    initialSortDir: "desc",
  });

  const [editing, setEditing] = useState<MockUser | "new" | null>(null);
  const [deleting, setDeleting] = useState<MockUser | null>(null);
  const [viewingLocation, setViewingLocation] = useState<MockUser | null>(
    null
  );
  const [pending, setPending] = useState(false);

  const canWrite = can("customers.write");

  async function handleSave(form: FormState) {
    setPending(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobile: toAsciiDigits(form.mobile).replace(/\D/g, ""),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        age: form.age ? Number(toAsciiDigits(form.age)) : undefined,
        sex: (form.sex || undefined) as Sex | undefined,
        subRole: form.subRole,
      };

      if (editing === "new") {
        await customersRepo.create({
          ...payload,
          role: "customer",
          active: true,
          password: form.password || "changeme",
          createdAt: new Date().toISOString().slice(0, 10),
          avatarColor: "#0ea5e9",
        });
      } else if (editing) {
        await customersRepo.update(editing.id, payload);
      }

      setEditing(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(user: MockUser, active: boolean) {
    await customersRepo.update(user.id, { active });
    list.reload();
  }

  async function handleDelete() {
    if (!deleting) return;
    setPending(true);
    try {
      await customersRepo.remove(deleting.id);
      setDeleting(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const sheet = usePrintRows<MockUser>(
    // Every customer matching the current filters, not the visible page.
    async () => {
      const all = await customersRepo.list({
        q: list.q,
        filters: list.filters,
        sortKey: list.sortKey,
        sortDir: list.sortDir,
        page: 1,
        pageSize: Math.max(list.total, 1),
      });
      return all.rows;
    },
    () =>
      printFilename([
        t("admin.customers"),
        new Date().toISOString().slice(0, 10),
      ])
  );

  const columns: Column<MockUser>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar
            firstName={u.firstName}
            lastName={u.lastName}
            avatarUrl={u.avatarUrl}
            avatarColor={u.avatarColor}
            size="sm"
          />
          <span
            className={`font-medium ${
              u.active ? "text-slate-900" : "text-slate-400 line-through"
            }`}
          >
            {u.firstName} {u.lastName}
          </span>
        </div>
      ),
    },
    {
      key: "mobile",
      header: t("auth.mobile"),
      sortable: true,
      render: (u) => <span className="force-ltr">{u.mobile}</span>,
    },
    {
      key: "email",
      header: t("account.email"),
      hideOnMobile: true,
      render: (u) =>
        u.email ? (
          <span className="force-ltr text-slate-600">{u.email}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "subRole",
      header: t("admin.subRole"),
      sortable: true,
      hideOnMobile: true,
      render: (u) => (
        <Badge tone={u.subRole === "vip" ? "info" : "neutral"}>
          {t(`roles.${u.subRole}`)}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: t("common.date"),
      sortable: true,
      hideOnMobile: true,
      render: (u) => (
        <span className="text-slate-500">{formatDate(u.createdAt, locale)}</span>
      ),
    },
    {
      key: "active",
      header: t("common.status"),
      render: (u) => (
        <Badge tone={u.active ? "success" : "neutral"}>
          {u.active ? t("common.active") : t("common.disabled")}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.customers")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton onClick={sheet.start} />
            {canWrite && (
              <NewButton
                label={t("admin.newCustomer")}
                onClick={() => setEditing("new")}
              />
            )}
          </div>
        }
      />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("admin.searchCustomers")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "subRole",
            label: t("admin.subRole"),
            options: ROLE_SUB_ROLES.customer.map((value) => ({
              value,
              label: t(`roles.${value}`),
            })),
          },
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

      {list.error && (
        <p className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {t("common.error")}: {list.error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(u) => u.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={[
          // Viewing a location needs only customers.view, which this page
          // already guards — a support agent can locate a customer without
          // being able to change them.
          {
            icon: "map",
            label: t("admin.viewLocation"),
            visible: (u) => hasLocation(u),
            onClick: (u) => setViewingLocation(u),
          },
          ...(canWrite
            ? [
                {
                  icon: "power",
                  label: t("common.disable"),
                  visible: (u: MockUser) => u.active,
                  onClick: (u: MockUser) => toggleActive(u, false),
                },
                {
                  icon: "power",
                  label: t("common.enable"),
                  visible: (u: MockUser) => !u.active,
                  onClick: (u: MockUser) => toggleActive(u, true),
                },
                {
                  icon: "pencil",
                  label: t("common.edit"),
                  onClick: (u: MockUser) => setEditing(u),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger" as const,
                  onClick: (u: MockUser) => setDeleting(u),
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

      {editing !== null && (
        <CustomerForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          pending={pending}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {viewingLocation && (
        <CustomerLocationModal
          customer={viewingLocation}
          onClose={() => setViewingLocation(null)}
        />
      )}

      {sheet.rows && (
        <CustomersPrintSheet
          rows={sheet.rows}
          filterLine={describeFilters(
            [
              { label: t("common.search"), value: list.q },
              {
                label: t("admin.subRole"),
                value: list.filters.subRole
                  ? t(`roles.${list.filters.subRole}`)
                  : undefined,
              },
              {
                label: t("common.status"),
                value:
                  list.filters.active === undefined
                    ? undefined
                    : list.filters.active === "true"
                      ? t("common.active")
                      : t("common.disabled"),
              },
            ],
            locale === "fa" ? "، " : " · "
          )}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deleteCustomer")}
        body={
          deleting ? `${deleting.firstName} ${deleting.lastName}` : undefined
        }
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function CustomerForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: MockUser | "new";
  pending: boolean;
  onSave: (form: FormState) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const isNew = initial === "new";

  const [form, setForm] = useState<FormState>(
    isNew
      ? BLANK
      : {
          firstName: initial.firstName,
          lastName: initial.lastName,
          mobile: initial.mobile,
          email: initial.email ?? "",
          phone: initial.phone ?? "",
          age: initial.age != null ? String(initial.age) : "",
          sex: initial.sex ?? "",
          subRole: initial.subRole,
          password: "",
        }
  );
  const { errors, setErrors, clear } = useFormErrors();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key as string);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!validateRequired(form.firstName)) {
      next.firstName = t("validation.required");
    }
    if (!validateRequired(form.lastName)) {
      next.lastName = t("validation.required");
    }
    if (!validateMobile(form.mobile)) next.mobile = t("validation.mobileInvalid");
    if (!validateEmail(form.email)) next.email = t("validation.emailInvalid");
    if (!validateAge(form.age)) next.age = t("validation.ageInvalid");

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave(form);
  }

  return (
    <Modal
      open
      size="lg"
      title={isNew ? t("admin.newCustomer") : t("admin.editCustomer")}
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
            form="customer-form"
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
      <form
        id="customer-form"
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
        noValidate
      >
        <TextField
          label={t("auth.firstName")}
          required
          value={form.firstName}
          onChange={(v) => set("firstName", v)}
          error={errors.firstName}
        />
        <TextField
          label={t("auth.lastName")}
          required
          value={form.lastName}
          onChange={(v) => set("lastName", v)}
          error={errors.lastName}
        />
        <TextField
          label={t("auth.mobile")}
          required
          type="tel"
          value={form.mobile}
          onChange={(v) => set("mobile", v)}
          error={errors.mobile}
        />
        <TextField
          label={t("account.email")}
          type="email"
          value={form.email}
          onChange={(v) => set("email", v)}
          error={errors.email}
        />
        <TextField
          label={t("account.phone")}
          type="tel"
          value={form.phone}
          onChange={(v) => set("phone", v)}
        />
        <TextField
          label={t("account.age")}
          inputMode="numeric"
          value={form.age}
          onChange={(v) => set("age", v)}
          error={errors.age}
        />
        <SelectField
          label={t("account.sex")}
          value={form.sex}
          onChange={(v) => set("sex", v)}
          placeholder={t("common.none")}
          options={(["male", "female", "other"] as const).map((value) => ({
            value,
            label: t(`account.${value}`),
          }))}
        />
        <SelectField
          label={t("admin.subRole")}
          value={form.subRole}
          onChange={(v) => set("subRole", v as SubRole)}
          options={ROLE_SUB_ROLES.customer.map((value) => ({
            value,
            label: t(`roles.${value}`),
          }))}
        />

        {isNew && (
          <TextField
            className="sm:col-span-2"
            label={t("admin.initialPassword")}
            hint={t("admin.initialPasswordHint")}
            value={form.password}
            onChange={(v) => set("password", v)}
          />
        )}
      </form>
    </Modal>
  );
}

/**
 * The customer list as a printed sheet.
 *
 * Carries the columns the on-screen table hides on a narrow viewport,
 * and closes with a headcount split by account state — the one figure
 * anyone reads a customer list for.
 */
function CustomersPrintSheet({
  rows,
  filterLine,
}: {
  rows: MockUser[];
  filterLine: string;
}) {
  const { t, locale } = useI18n();
  const active = rows.filter((u) => u.active).length;

  return (
    <div className="print-only print-area">
      <PrintHeader
        title={t("admin.customers")}
        subtitle={[
          t("print.customerCount", { count: formatNumber(rows.length, locale) }),
          filterLine,
        ]
          .filter(Boolean)
          .join(locale === "fa" ? "، " : " · ")}
      />

      <PrintTable
        rows={rows}
        rowKey={(u) => u.id}
        columns={
          [
            {
              header: t("common.name"),
              render: (u) => (
                <span className="font-medium">
                  {u.firstName} {u.lastName}
                </span>
              ),
            },
            {
              header: t("auth.mobile"),
              render: (u) => <span className="force-ltr">{u.mobile}</span>,
            },
            {
              header: t("account.email"),
              render: (u) => <span className="force-ltr">{u.email ?? "—"}</span>,
            },
            {
              header: t("admin.subRole"),
              render: (u) => t(`roles.${u.subRole}`),
            },
            {
              // "Date" alone says nothing on a customer sheet.
              header: t("orderDetail.customerSince"),
              render: (u) => formatDate(u.createdAt, locale),
            },
            {
              header: t("common.status"),
              render: (u) =>
                u.active ? t("common.active") : t("common.disabled"),
            },
          ] satisfies PrintColumn<MockUser>[]
        }
        footer={
          <tr className="border-t-2 border-slate-900">
            <PrintCell>
              <span className="font-bold">{t("common.total")}</span>
            </PrintCell>
            <PrintCell />
            <PrintCell />
            <PrintCell />
            <PrintCell />
            <PrintCell>
              <span className="font-bold">
                {t("print.activeOfTotal", {
                  active: formatNumber(active, locale),
                  total: formatNumber(rows.length, locale),
                })}
              </span>
            </PrintCell>
          </tr>
        }
      />

      <PrintFooter />
    </div>
  );
}
