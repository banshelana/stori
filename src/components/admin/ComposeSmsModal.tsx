"use client";

import { useMemo, useState } from "react";
import { SelectField, TextAreaField } from "@/components/form/Field";
import {
  RecipientPicker,
  type Recipient,
} from "@/components/admin/RecipientPicker";
import { Icon } from "@/components/panel/Icon";
import { Modal } from "@/components/panel/Modal";
import { Badge } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { formatNumber } from "@/lib/format";
import type { SmsTemplate } from "@/lib/data/sms-templates";
import {
  applyPlaceholders,
  PLACEHOLDERS,
  segmentInfo,
  unresolvedFor,
  type PlaceholderValues,
} from "@/lib/sms";

/** Placeholder values for one recipient; bare numbers can fill only mobile. */
function valuesFor(recipient: Recipient): PlaceholderValues {
  const c = recipient.customer;
  return {
    firstName: c?.firstName,
    lastName: c?.lastName,
    fullName: c ? `${c.firstName} ${c.lastName}` : undefined,
    mobile: recipient.mobile,
  };
}

export function ComposeSmsModal({
  templates,
  pending,
  onSend,
  onSaveTemplate,
  onCancel,
}: {
  templates: SmsTemplate[];
  pending: boolean;
  onSend: (messages: { recipient: string; body: string }[]) => void;
  onSaveTemplate: (body: string) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const info = segmentInfo(body);

  // Preview against a real recipient — that is the only way to see what
  // the placeholders actually become.
  const previewFor = recipients[previewIndex] ?? recipients[0] ?? null;
  const preview = previewFor
    ? applyPlaceholders(body, valuesFor(previewFor))
    : body;
  const previewInfo = segmentInfo(preview);

  /**
   * Recipients whose data cannot fill every placeholder in the body —
   * typically bare numbers under a template that greets by first name.
   * Worth surfacing before sending, not after.
   */
  const gaps = useMemo(() => {
    if (!body) return [];
    return recipients
      .map((r) => ({ recipient: r, missing: unresolvedFor(body, valuesFor(r)) }))
      .filter((entry) => entry.missing.length > 0);
  }, [body, recipients]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((tpl) => tpl.id === id);
    if (template) setBody(localized(template.body, locale));
  }

  function insertPlaceholder(name: string) {
    setBody((prev) => `${prev}{${name}}`);
  }

  function handleSend() {
    if (recipients.length === 0) {
      setError(t("sms.noRecipients"));
      return;
    }
    if (!body.trim()) {
      setError(t("sms.noBody"));
      return;
    }
    setError(null);

    // One message per recipient, each with its own placeholders resolved.
    onSend(
      recipients.map((r) => ({
        recipient: r.mobile,
        body: applyPlaceholders(body, valuesFor(r)),
      }))
    );
  }

  const totalSegments = recipients.length * Math.max(1, info.segments);

  return (
    <Modal
      open
      size="lg"
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
            type="button"
            onClick={handleSend}
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Icon name="send" className="rtl-flip h-4 w-4" />
            {pending
              ? t("common.loading")
              : t("sms.sendToCount", { count: recipients.length })}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <RecipientPicker recipients={recipients} onChange={setRecipients} />

        <div className="border-t border-slate-200 pt-5">
          <SelectField
            label={t("sms.template")}
            value={templateId}
            placeholder={t("sms.noTemplate")}
            onChange={applyTemplate}
            options={templates.map((tpl) => ({
              value: tpl.id,
              label: localized(tpl.name, locale),
            }))}
          />
        </div>

        <div>
          <TextAreaField
            label={t("sms.body")}
            rows={4}
            value={body}
            onChange={(v) => {
              setBody(v);
              // Diverging from the template means it is no longer that one.
              setTemplateId("");
              setError(null);
            }}
          />

          {/* Placeholder chips — quicker and less error-prone than typing
              braces, and they document what is available. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400">{t("sms.insert")}:</span>
            {PLACEHOLDERS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => insertPlaceholder(name)}
                className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 hover:bg-slate-200"
              >
                {`{${name}}`}
              </button>
            ))}
          </div>

          {/* Encoding drives the limit: one Persian character takes the
              whole message from 160 characters to 70. */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2">
              <Badge tone={info.encoding === "UCS-2" ? "warning" : "neutral"}>
                {info.encoding}
              </Badge>
              <span className="text-slate-500">
                {t("sms.charCount", {
                  length: formatNumber(info.length, locale),
                  limit: formatNumber(info.limit, locale),
                })}
              </span>
            </span>
            <span className="font-medium text-slate-600">
              {t("sms.segmentCount", {
                segments: formatNumber(info.segments, locale),
              })}
              {recipients.length > 0 && (
                <span className="ms-1 text-slate-400">
                  ·{" "}
                  {t("sms.totalSegments", {
                    total: formatNumber(totalSegments, locale),
                  })}
                </span>
              )}
            </span>
          </div>
        </div>

        {gaps.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">{t("sms.unresolvedTitle")}</p>
            <p className="mt-1">
              {t("sms.unresolvedBody", {
                count: gaps.length,
                fields: [...new Set(gaps.flatMap((g) => g.missing))].join(", "),
              })}
            </p>
          </div>
        )}

        {preview.trim() && recipients.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("sms.preview")}
              </span>
              {recipients.length > 1 && (
                <select
                  value={previewIndex}
                  onChange={(e) => setPreviewIndex(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
                >
                  {recipients.map((r, i) => (
                    <option key={r.mobile} value={i}>
                      {r.customer
                        ? `${r.customer.firstName} ${r.customer.lastName}`
                        : r.mobile}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-relaxed text-slate-800 shadow-sm">
              {preview}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">
              {t("sms.segmentCount", {
                segments: formatNumber(previewInfo.segments, locale),
              })}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-rose-600">
            {error}
          </p>
        )}

        {body.trim() && (
          <button
            type="button"
            onClick={() => onSaveTemplate(body)}
            className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            {t("sms.saveAsTemplate")}
          </button>
        )}
      </div>
    </Modal>
  );
}
