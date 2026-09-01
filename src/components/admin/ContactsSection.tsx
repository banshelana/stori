"use client";

import { useState } from "react";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Badge, PageHeader } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import type { Contact } from "@/lib/data/commerce";
import { contactsRepo } from "@/lib/data/repositories";
import { formatDate } from "@/lib/format";
import { useResourceList } from "@/lib/useResourceList";

export function ContactsSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(contactsRepo, {
    initialSortKey: "createdAt",
    initialSortDir: "desc",
  });

  const [viewing, setViewing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [pending, setPending] = useState(false);

  const canWrite = can("contacts.write");

  async function mutate(fn: () => Promise<unknown>) {
    setPending(true);
    try {
      await fn();
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortable: true,
      render: (c) => <span className="font-medium text-slate-900">{c.name}</span>,
    },
    {
      key: "subject",
      header: t("contact.subject"),
      sortable: true,
      render: (c) => <span className="text-slate-600">{c.subject}</span>,
    },
    {
      key: "mobile",
      header: t("auth.mobile"),
      hideOnMobile: true,
      render: (c) => <span className="force-ltr text-slate-600">{c.mobile}</span>,
    },
    {
      key: "createdAt",
      header: t("common.date"),
      sortable: true,
      hideOnMobile: true,
      render: (c) => (
        <span className="text-slate-500">{formatDate(c.createdAt, locale)}</span>
      ),
    },
    {
      key: "handled",
      header: t("common.status"),
      render: (c) => (
        <Badge tone={c.handled ? "success" : "warning"}>
          {c.handled ? t("contact.handled") : t("contact.open")}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.contacts")} />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("admin.searchContacts")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "handled",
            label: t("common.status"),
            options: [
              { value: "false", label: t("contact.open") },
              { value: "true", label: t("contact.handled") },
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
        rowKey={(c) => c.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={[
          {
            icon: "eye",
            label: t("common.view"),
            onClick: (c) => setViewing(c),
          },
          ...(canWrite
            ? [
                {
                  icon: "check",
                  label: t("common.markHandled"),
                  visible: (c: Contact) => !c.handled,
                  onClick: (c: Contact) =>
                    mutate(() => contactsRepo.update(c.id, { handled: true })),
                },
                {
                  icon: "close",
                  label: t("common.markUnhandled"),
                  visible: (c: Contact) => c.handled,
                  onClick: (c: Contact) =>
                    mutate(() => contactsRepo.update(c.id, { handled: false })),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger" as const,
                  onClick: (c: Contact) => setDeleting(c),
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

      {viewing && (
        <Modal
          open
          title={viewing.subject}
          onClose={() => setViewing(null)}
          footer={
            canWrite && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  mutate(async () => {
                    await contactsRepo.update(viewing.id, {
                      handled: !viewing.handled,
                    });
                    setViewing(null);
                  })
                }
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {viewing.handled
                  ? t("common.markUnhandled")
                  : t("common.markHandled")}
              </button>
            )
          }
        >
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-500">{t("common.name")}:</dt>
              <dd className="font-medium text-slate-900">{viewing.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500">{t("account.email")}:</dt>
              <dd className="force-ltr font-medium text-slate-900">
                {viewing.email}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500">{t("auth.mobile")}:</dt>
              <dd className="force-ltr font-medium text-slate-900">
                {viewing.mobile}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-slate-500">{t("contact.body")}:</dt>
              <dd className="rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-700">
                {viewing.body}
              </dd>
            </div>
          </dl>
        </Modal>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deleteContact")}
        body={deleting?.subject}
        pending={pending}
        onConfirm={() =>
          deleting &&
          mutate(async () => {
            await contactsRepo.remove(deleting.id);
            setDeleting(null);
          })
        }
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
