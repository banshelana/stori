"use client";

import { useState } from "react";
import { TextAreaField, TextField } from "@/components/form/Field";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import { contactsRepo } from "@/lib/data/repositories";
import { useFormErrors } from "@/lib/useFormErrors";
import {
  normalizeMobile,
  validateEmail,
  validateMobile,
  validateRequired,
} from "@/lib/validation";

/**
 * Opens a support ticket.
 *
 * A signed-in sender is linked by id so they can follow the thread from
 * their account; a guest can still write in, they just cannot come back
 * to it later.
 */
export function ContactForm() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { errors, setErrors, clear } = useFormErrors();

  const [form, setForm] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : "",
    email: user?.email ?? "",
    mobile: user?.mobile ?? "",
    subject: "",
    body: "",
  });
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!validateRequired(form.name)) next.name = t("validation.required");
    if (!validateRequired(form.subject)) next.subject = t("validation.required");
    if (!validateRequired(form.body)) next.body = t("validation.required");
    // At least one way to reply, or the ticket is a dead end.
    if (!form.email.trim() && !form.mobile.trim()) {
      next.email = t("contact.needContact");
    } else {
      if (form.email.trim() && !validateEmail(form.email)) {
        next.email = t("validation.emailInvalid");
      }
      if (form.mobile.trim() && !validateMobile(form.mobile)) {
        next.mobile = t("validation.mobileInvalid");
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await contactsRepo.create({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile ? normalizeMobile(form.mobile) : "",
        subject: form.subject.trim(),
        body: form.body.trim(),
        status: "open",
        userId: user?.id,
        createdAt: today,
        updatedAt: today,
      });
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-scale-in rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {t("contact.sentTitle")}
        </h1>
        <p className="mt-2 text-slate-500">{t("contact.sentBody")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {t("contact.title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t("contact.subtitle")}</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <TextField
          label={t("common.name")}
          required
          value={form.name}
          onChange={(v) => set("name", v)}
          error={errors.name}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("account.email")}
            type="email"
            value={form.email}
            onChange={(v) => set("email", v)}
            error={errors.email}
          />
          <TextField
            label={t("auth.mobile")}
            type="tel"
            value={form.mobile}
            onChange={(v) => set("mobile", v)}
            error={errors.mobile}
          />
        </div>
        <TextField
          label={t("contact.subject")}
          required
          value={form.subject}
          onChange={(v) => set("subject", v)}
          error={errors.subject}
        />
        <TextAreaField
          label={t("contact.body")}
          required
          rows={5}
          value={form.body}
          onChange={(v) => set("body", v)}
          error={errors.body}
        />

        <button
          type="submit"
          disabled={pending}
          className="btn-glow w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? t("common.loading") : t("contact.send")}
        </button>
      </form>
    </div>
  );
}
