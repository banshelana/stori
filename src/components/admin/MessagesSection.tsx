"use client";

import { useState } from "react";
import { TextAreaField, TextField } from "@/components/form/Field";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar, NewButton } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Badge, PageHeader } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import type { SmsMessage } from "@/lib/data/commerce";
import { messagesRepo } from "@/lib/data/repositories";
import { formatDate, formatNumber } from "@/lib/format";
import { useFormErrors } from "@/lib/useFormErrors";
import { useResourceList } from "@/lib/useResourceList";
import {
  normalizeMobile,
  validateMobile,
  validateRequired,
} from "@/lib/validation";

const SMS_STATUSES = ["sent", "queued", "failed"] as const;

const STATUS_TONE: Record<SmsMessage["status"], "success" | "warning" | "danger"> =
  {
    sent: "success",
    queued: "warning",
    failed: "danger",
  };

export function MessagesSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(messagesRepo, {
    initialSortKey: "sentAt",
    initialSortDir: "desc",
  });

  const [composing, setComposing] = useState(false);
  const [deleting, setDeleting] = useState<SmsMessage | null>(null);
  const [pending, setPending] = useState(false);

  const canSend = can("messages.send");

  async function handleSend(recipient: string, body: string) {
    setPending(true);
    try {
      await messagesRepo.create({
        recipient: normalizeMobile(recipient),
        body: body.trim(),
        // A real gateway acknowledges asynchronously, so a new message
        // starts queued rather than claiming it was delivered.
        status: "queued",
        sentAt: new Date().toISOString().slice(0, 10),
      });
      setComposing(false);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setPending(true);
    try {
      await messagesRepo.remove(deleting.id);
      setDeleting(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<SmsMessage>[] = [
    {
      key: "recipient",
      header: t("sms.recipient"),
      sortable: true,
      render: (m) => (
        <span className="force-ltr font-medium text-slate-900">
          {m.recipient}
        </span>
      ),
    },
    {
      key: "body",
      header: t("sms.body"),
      render: (m) => (
        <span className="line-clamp-2 max-w-md text-slate-600">{m.body}</span>
      ),
    },
    {
      key: "sentAt",
      header: t("common.date"),
      sortable: true,
      hideOnMobile: true,
      render: (m) => (
        <span className="text-slate-500">{formatDate(m.sentAt, locale)}</span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (m) => (
        <Badge tone={STATUS_TONE[m.status]}>{t(`sms.status.${m.status}`)}</Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.messages")}
        action={
          canSend && (
            <NewButton
              label={t("admin.newMessage")}
              onClick={() => setComposing(true)}
            />
          )
        }
      />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("admin.searchMessages")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "status",
            label: t("common.status"),
            options: SMS_STATUSES.map((value) => ({
              value,
              label: t(`sms.status.${value}`),
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
        rowKey={(m) => m.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canSend
            ? [
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (m) => setDeleting(m),
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

      {composing && (
        <ComposeModal
          pending={pending}
          onSend={handleSend}
          onCancel={() => setComposing(false)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deleteMessage")}
        body={deleting?.recipient}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function ComposeModal({
  pending,
  onSend,
  onCancel,
}: {
  pending: boolean;
  onSend: (recipient: string, body: string) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const { errors, setErrors, clear } = useFormErrors();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!validateMobile(recipient)) {
      next.recipient = t("validation.mobileInvalid");
    }
    if (!validateRequired(body)) next.body = t("validation.required");

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSend(recipient, body);
  }

  return (
    <Modal
      open
      title={t("admin.newMessage")}
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
            form="sms-form"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("sms.send")}
          </button>
        </>
      }
    >
      <form id="sms-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label={t("sms.recipient")}
          required
          type="tel"
          placeholder="09xxxxxxxxx"
          value={recipient}
          onChange={(v) => {
            setRecipient(v);
            clear("recipient");
          }}
          error={errors.recipient}
        />
        <TextAreaField
          label={t("sms.body")}
          required
          rows={4}
          value={body}
          onChange={(v) => {
            setBody(v);
            clear("body");
          }}
          error={errors.body}
          hint={t("sms.bodyHint", { count: formatNumber(body.length, locale) })}
        />
      </form>
    </Modal>
  );
}
