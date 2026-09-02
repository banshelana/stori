"use client";

import { useState } from "react";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Badge, PageHeader } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import {
  TICKET_STATUSES,
  type Contact,
} from "@/lib/data/commerce";
import { TicketThread } from "@/components/admin/TicketThread";
import {
  lastAuthor,
  replyCount,
  TICKET_STATUS_TONE,
} from "@/lib/tickets";
import { ticketRepliesRepo } from "@/lib/data/repositories";
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
      key: "replies",
      header: t("ticket.replies"),
      align: "end",
      hideOnMobile: true,
      render: (c) => {
        const count = replyCount(c.id, ticketRepliesRepo.all());
        const waiting = lastAuthor(c, ticketRepliesRepo.all()) === "customer";
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-slate-600">{count}</span>
            {/* The customer having spoken last is the real signal that a
                ticket is waiting on us, independent of its status. */}
            {waiting && (
              <span
                title={t("ticket.awaitingUs")}
                className="h-2 w-2 rounded-full bg-rose-500"
              />
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (c) => (
        <Badge tone={TICKET_STATUS_TONE[c.status]}>
          {t(`ticket.status.${c.status}`)}
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
            key: "status",
            label: t("common.status"),
            options: TICKET_STATUSES.map((value) => ({
              value,
              label: t(`ticket.status.${value}`),
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
                  label: t("ticket.markResolved"),
                  visible: (c: Contact) => c.status !== "resolved",
                  onClick: (c: Contact) =>
                    mutate(() =>
                      contactsRepo.update(c.id, {
                        status: "resolved",
                        updatedAt: new Date().toISOString().slice(0, 10),
                      })
                    ),
                },
                {
                  icon: "close",
                  label: t("ticket.reopen"),
                  visible: (c: Contact) => c.status === "resolved",
                  onClick: (c: Contact) =>
                    mutate(() =>
                      contactsRepo.update(c.id, {
                        status: "open",
                        updatedAt: new Date().toISOString().slice(0, 10),
                      })
                    ),
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
        <TicketThread
          contact={viewing}
          onChanged={() => {
            list.reload();
            // Re-read so the thread reflects the status it just set.
            setViewing(
              contactsRepo.all().find((c) => c.id === viewing.id) ?? null
            );
          }}
          onClose={() => setViewing(null)}
        />
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
