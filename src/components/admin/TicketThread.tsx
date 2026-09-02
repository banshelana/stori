"use client";

import { useState } from "react";
import { SelectField, TextAreaField } from "@/components/form/Field";
import { Icon } from "@/components/panel/Icon";
import { Modal } from "@/components/panel/Modal";
import { Badge } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import {
  MESSAGE_CHANNELS,
  TICKET_STATUSES,
  type Contact,
  type MessageChannel,
  type TicketStatus,
} from "@/lib/data/commerce";
import {
  contactsRepo,
  customersRepo,
  messagesRepo,
  ticketRepliesRepo,
} from "@/lib/data/repositories";
import { formatDate } from "@/lib/format";
import { isValidRecipient, recipientFieldFor } from "@/lib/messaging";
import {
  buildThread,
  statusAfterReply,
  TICKET_STATUS_TONE,
} from "@/lib/tickets";

/**
 * The ticket conversation, with the reply box and the controls that
 * change who owns the ticket next.
 *
 * Replying can notify the customer on whichever channel they left
 * contact details for — that is the point of the messaging refactor
 * meeting ticketing.
 */
export function TicketThread({
  contact,
  onChanged,
  onClose,
}: {
  contact: Contact;
  onChanged: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const { user, can } = useAuth();

  const [body, setBody] = useState("");
  const [notify, setNotify] = useState<MessageChannel | "none">("none");
  const [status, setStatus] = useState<TicketStatus>(contact.status);
  const [assignedTo, setAssignedTo] = useState(contact.assignedTo ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canWrite = can("contacts.write");
  const thread = buildThread(contact, ticketRepliesRepo.all());

  // Only channels this person can actually be reached on.
  const reachable = MESSAGE_CHANNELS.filter((channel) =>
    isValidRecipient(channel, contact[recipientFieldFor(channel)] ?? "")
  );

  const staff = customersRepo.all().filter((u) => u.role === "admin");

  async function submitReply() {
    if (!body.trim()) {
      setError(t("ticket.noReply"));
      return;
    }
    setError(null);
    setPending(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const channel = notify === "none" ? undefined : notify;

      await ticketRepliesRepo.create({
        contactId: contact.id,
        author: "staff",
        authorName: user ? `${user.firstName} ${user.lastName}` : "Staff",
        body: body.trim(),
        createdAt: today,
        notifiedVia: channel,
      });

      // A staff reply hands the ticket back to the customer.
      const nextStatus = statusAfterReply(status, "staff");
      await contactsRepo.update(contact.id, {
        status: nextStatus,
        assignedTo: assignedTo || undefined,
        updatedAt: today,
      });
      setStatus(nextStatus);

      if (channel) {
        await messagesRepo.create({
          channel,
          recipient: contact[recipientFieldFor(channel)],
          subject:
            channel === "email"
              ? t("ticket.replySubject", { subject: contact.subject })
              : undefined,
          body: body.trim(),
          status: "queued",
          sentAt: today,
        });
      }

      setBody("");
      setNotify("none");
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function updateMeta(next: {
    status?: TicketStatus;
    assignedTo?: string;
  }) {
    await contactsRepo.update(contact.id, {
      ...next,
      assignedTo: next.assignedTo === "" ? undefined : next.assignedTo,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    onChanged();
  }

  return (
    <Modal
      open
      size="lg"
      title={contact.subject}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("common.back")}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Who, and how to reach them */}
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{contact.name}</p>
            <p className="force-ltr text-xs text-slate-500">
              {contact.email} · {contact.mobile}
            </p>
          </div>
          <Badge tone={TICKET_STATUS_TONE[status]}>
            {t(`ticket.status.${status}`)}
          </Badge>
        </div>

        {/* Conversation */}
        <ul className="space-y-3">
          {thread.map((entry) => {
            const fromStaff = entry.author === "staff";
            return (
              <li
                key={entry.id}
                // Staff messages sit on the far edge, so the two sides of
                // the conversation are distinguishable at a glance.
                className={`flex ${fromStaff ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 ${
                    fromStaff
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <p
                    className={`mb-1 text-xs font-semibold ${
                      fromStaff ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    {entry.authorName}
                    {entry.opening && (
                      <span className="ms-1 font-normal opacity-75">
                        · {t("ticket.opened")}
                      </span>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {entry.body}
                  </p>
                  <p
                    className={`mt-1 text-[11px] ${
                      fromStaff ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {formatDate(entry.createdAt, locale)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {canWrite && (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <TextAreaField
              label={t("ticket.reply")}
              rows={3}
              value={body}
              onChange={(v) => {
                setBody(v);
                setError(null);
              }}
              error={error ?? undefined}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label={t("ticket.notify")}
                value={notify}
                onChange={(v) => setNotify(v as MessageChannel | "none")}
                options={[
                  { value: "none", label: t("ticket.notifyNone") },
                  ...reachable.map((channel) => ({
                    value: channel,
                    label: t(`sms.channels.${channel}`),
                  })),
                ]}
              />
              <SelectField
                label={t("ticket.assignee")}
                value={assignedTo}
                placeholder={t("ticket.unassigned")}
                onChange={(v) => {
                  setAssignedTo(v);
                  updateMeta({ assignedTo: v });
                }}
                options={staff.map((u) => ({
                  value: u.id,
                  label: `${u.firstName} ${u.lastName}`,
                }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={submitReply}
                disabled={pending}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Icon name="send" className="rtl-flip h-4 w-4" />
                {pending ? t("common.loading") : t("ticket.sendReply")}
              </button>

              <div className="ms-auto flex gap-1">
                {TICKET_STATUSES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatus(value);
                      updateMeta({ status: value });
                    }}
                    aria-pressed={status === value}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      status === value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t(`ticket.status.${value}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
