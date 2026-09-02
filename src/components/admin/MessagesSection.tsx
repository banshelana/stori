"use client";

import { useState } from "react";
import { ComposeSmsModal } from "@/components/admin/ComposeSmsModal";
import { TextAreaField, TextField } from "@/components/form/Field";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar, NewButton } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Tabs, TabPanel } from "@/components/panel/Tabs";
import { Badge, PageHeader } from "@/components/panel/ui";
import { LOCALE_LABEL, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { localized, type LocalizedText } from "@/i18n/localized";
import { useAuth } from "@/lib/auth/auth-context";
import type { SmsMessage } from "@/lib/data/commerce";
import {
  MOCK_SMS_TEMPLATES,
  type SmsTemplate,
} from "@/lib/data/sms-templates";
import { messagesRepo, smsTemplatesRepo } from "@/lib/data/repositories";
import { formatDate, formatNumber } from "@/lib/format";
import { segmentInfo } from "@/lib/sms";
import { useFormErrors } from "@/lib/useFormErrors";
import { useResourceList } from "@/lib/useResourceList";
import { validateRequired } from "@/lib/validation";

type TabId = "messages" | "templates";

const SMS_STATUS_TONE: Record<string, "success" | "warning" | "danger"> = {
  sent: "success",
  queued: "warning",
  failed: "danger",
};

export function MessagesSection() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("messages");

  return (
    <>
      <PageHeader title={t("admin.messages")} subtitle={t("sms.panelHint")} />

      <Tabs
        label={t("admin.messages")}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: "messages", label: t("sms.history") },
          {
            id: "templates",
            label: t("sms.templates"),
            badge: MOCK_SMS_TEMPLATES.length,
          },
        ]}
      />

      <TabPanel id="messages" active={tab}>
        <MessagesTab />
      </TabPanel>
      <TabPanel id="templates" active={tab}>
        <TemplatesTab />
      </TabPanel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sent messages                                                       */
/* ------------------------------------------------------------------ */

function MessagesTab() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(messagesRepo, {
    initialSortKey: "sentAt",
    initialSortDir: "desc",
  });

  const [composing, setComposing] = useState(false);
  const [deleting, setDeleting] = useState<SmsMessage | null>(null);
  const [pending, setPending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const canSend = can("messages.send");

  async function handleSend(messages: { recipient: string; body: string }[]) {
    setPending(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      // One record per recipient, so the history reflects what was
      // actually delivered rather than one row for a broadcast.
      for (const message of messages) {
        await messagesRepo.create({
          recipient: message.recipient,
          body: message.body,
          status: "queued",
          sentAt: today,
        });
      }
      setComposing(false);
      setSentCount(messages.length);
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
      key: "segments",
      header: t("sms.segments"),
      align: "end",
      hideOnMobile: true,
      render: (m) => {
        const info = segmentInfo(m.body);
        return (
          <span className="text-xs text-slate-500">
            {formatNumber(info.segments, locale)}
            <span className="ms-1 text-slate-400">{info.encoding}</span>
          </span>
        );
      },
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
        <Badge tone={SMS_STATUS_TONE[m.status]}>
          {t(`sms.status.${m.status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        {canSend && (
          <NewButton
            label={t("admin.newMessage")}
            onClick={() => setComposing(true)}
          />
        )}
      </div>

      {sentCount !== null && (
        <p
          role="status"
          className="animate-fade-in mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700"
        >
          {t("sms.queued", { count: formatNumber(sentCount, locale) })}
        </p>
      )}

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
            options: (["sent", "queued", "failed"] as const).map((value) => ({
              value,
              label: t(`sms.status.${value}`),
            })),
          },
        ]}
      />

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
        <ComposeSmsModal
          templates={smsTemplatesRepo.all()}
          pending={pending}
          onSend={handleSend}
          onSaveTemplate={(body) => setSavingTemplate(body)}
          onCancel={() => setComposing(false)}
        />
      )}

      {/* Saving from the composer pre-fills the current locale's body and
          leaves the other language for the operator to fill in. */}
      {savingTemplate !== null && (
        <TemplateModal
          initial="new"
          seedBody={savingTemplate}
          pending={pending}
          onSave={async (form) => {
            setPending(true);
            try {
              await smsTemplatesRepo.create({
                ...form,
                createdAt: new Date().toISOString().slice(0, 10),
              });
              setSavingTemplate(null);
            } finally {
              setPending(false);
            }
          }}
          onCancel={() => setSavingTemplate(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deleteMessage")}
        body={deleting?.recipient}
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          setPending(true);
          try {
            await messagesRepo.remove(deleting.id);
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

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function TemplatesTab() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(smsTemplatesRepo, { initialSortKey: "name" });

  const [editing, setEditing] = useState<SmsTemplate | "new" | null>(null);
  const [deleting, setDeleting] = useState<SmsTemplate | null>(null);
  const [pending, setPending] = useState(false);

  const canSend = can("messages.send");

  const columns: Column<SmsTemplate>[] = [
    {
      key: "name",
      header: t("common.name"),
      sortable: true,
      render: (tpl) => (
        <span className="font-medium text-slate-900">
          {localized(tpl.name, locale)}
        </span>
      ),
    },
    {
      key: "body",
      header: t("sms.body"),
      render: (tpl) => (
        <span className="line-clamp-2 max-w-md text-slate-600">
          {localized(tpl.body, locale)}
        </span>
      ),
    },
    {
      key: "segments",
      header: t("sms.segments"),
      align: "end",
      hideOnMobile: true,
      render: (tpl) => {
        const info = segmentInfo(localized(tpl.body, locale));
        return (
          <span className="text-xs text-slate-500">
            {formatNumber(info.segments, locale)}
            <span className="ms-1 text-slate-400">{info.encoding}</span>
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: t("common.date"),
      sortable: true,
      hideOnMobile: true,
      render: (tpl) => (
        <span className="text-slate-500">{formatDate(tpl.createdAt, locale)}</span>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        {canSend && (
          <NewButton
            label={t("sms.newTemplate")}
            onClick={() => setEditing("new")}
          />
        )}
      </div>

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("sms.searchTemplates")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(tpl) => tpl.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canSend
            ? [
                {
                  icon: "pencil",
                  label: t("common.edit"),
                  onClick: (tpl) => setEditing(tpl),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (tpl) => setDeleting(tpl),
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
        <TemplateModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          pending={pending}
          onSave={async (form) => {
            setPending(true);
            try {
              if (editing === "new") {
                await smsTemplatesRepo.create({
                  ...form,
                  createdAt: new Date().toISOString().slice(0, 10),
                });
              } else {
                await smsTemplatesRepo.update(editing.id, form);
              }
              setEditing(null);
              list.reload();
            } finally {
              setPending(false);
            }
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("sms.deleteTemplate")}
        body={deleting ? localized(deleting.name, locale) : undefined}
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          setPending(true);
          try {
            await smsTemplatesRepo.remove(deleting.id);
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

function TemplateModal({
  initial,
  seedBody,
  pending,
  onSave,
  onCancel,
}: {
  initial: SmsTemplate | "new";
  /** Pre-fills the active locale's body when saving from the composer. */
  seedBody?: string;
  pending: boolean;
  onSave: (form: { name: LocalizedText; body: LocalizedText }) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const isNew = initial === "new";

  const [form, setForm] = useState<{ name: LocalizedText; body: LocalizedText }>(
    isNew
      ? {
          name: { en: "", fa: "" },
          body: { en: "", fa: "", ...(seedBody ? { [locale]: seedBody } : {}) },
        }
      : { name: { ...initial.name }, body: { ...initial.body } }
  );
  const { errors, setErrors, clear } = useFormErrors();

  function setField(field: "name" | "body", lang: Locale, value: string) {
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }));
    clear(`${field}.${lang}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const lang of LOCALES) {
      if (!validateRequired(form.name[lang])) {
        next[`name.${lang}`] = t("validation.required");
      }
      if (!validateRequired(form.body[lang])) {
        next[`body.${lang}`] = t("validation.required");
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave(form);
  }

  return (
    <Modal
      open
      size="lg"
      title={isNew ? t("sms.newTemplate") : t("sms.editTemplate")}
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
            form="template-form"
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
      <form id="template-form" onSubmit={submit} className="space-y-4" noValidate>
        {LOCALES.map((lang) => {
          const info = segmentInfo(form.body[lang]);
          return (
            <div
              key={lang}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {LOCALE_LABEL[lang]}
              </p>
              <TextField
                label={t("common.name")}
                required
                dir={lang === "fa" ? "rtl" : "ltr"}
                value={form.name[lang]}
                onChange={(v) => setField("name", lang, v)}
                error={errors[`name.${lang}`]}
              />
              <TextAreaField
                label={t("sms.body")}
                required
                rows={3}
                dir={lang === "fa" ? "rtl" : "ltr"}
                value={form.body[lang]}
                onChange={(v) => setField("body", lang, v)}
                error={errors[`body.${lang}`]}
              />
              <p className="text-xs text-slate-500">
                <Badge tone={info.encoding === "UCS-2" ? "warning" : "neutral"}>
                  {info.encoding}
                </Badge>
                <span className="ms-2">
                  {t("sms.segmentCount", { segments: info.segments })}
                </span>
              </p>
            </div>
          );
        })}

        <p className="text-xs text-slate-400">{t("sms.placeholderHint")}</p>
      </form>
    </Modal>
  );
}
