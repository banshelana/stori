"use client";

import { useMemo, useState } from "react";
import { Card, PageHeader } from "@/components/panel/ui";
import {
  ReadOnlyField,
  SelectField,
  TextField,
} from "@/components/form/Field";
import { AvatarUpload } from "@/components/form/ImageUpload";
import { useFormErrors } from "@/lib/useFormErrors";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import { formatPercent } from "@/lib/format";
import type { Sex } from "@/lib/auth/types";
import { toAsciiDigits, validateAge, validateEmail } from "@/lib/validation";

const SEXES: Sex[] = ["male", "female", "other"];

export function ProfileForm() {
  const { user, updateProfile, pending } = useAuth();
  const { t, locale } = useI18n();

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [form, setForm] = useState({
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    age: user?.age != null ? String(user.age) : "",
    sex: user?.sex ?? "",
  });
  const { errors, setErrors, clear } = useFormErrors();
  const [saved, setSaved] = useState(false);

  // Basic info is fixed at registration; the details block is what the
  // completion meter measures.
  const completion = useMemo(() => {
    if (!user) return 0;
    const fields = [
      user.email,
      user.phone,
      user.age,
      user.sex,
      user.avatarUrl,
      user.addresses?.length,
    ];
    return fields.filter(Boolean).length / fields.length;
  }, [user]);

  if (!user) return null;

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key);
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!validateEmail(form.email)) next.email = t("validation.emailInvalid");
    if (!validateAge(form.age)) next.age = t("validation.ageInvalid");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await updateProfile({
      avatarUrl,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      age: form.age ? Number(toAsciiDigits(form.age)) : undefined,
      sex: (form.sex || undefined) as Sex | undefined,
    });
    setSaved(true);
  }

  return (
    <>
      <PageHeader title={t("account.profile")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-bold text-slate-900">{t("account.basicInfo")}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("account.basicInfoHint")}
            </p>

            <div className="mt-4 border-b border-slate-100 pb-5">
              <AvatarUpload
                value={avatarUrl}
                onChange={(next) => {
                  setAvatarUrl(next);
                  setSaved(false);
                }}
                fallbackColor={user.avatarColor}
                fallbackText={`${user.firstName[0] ?? ""}${
                  user.lastName[0] ?? ""
                }`.toUpperCase()}
              />
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <ReadOnlyField
                label={t("auth.firstName")}
                value={user.firstName}
              />
              <ReadOnlyField
                label={t("auth.lastName")}
                value={user.lastName}
              />
              <ReadOnlyField label={t("auth.mobile")} value={user.mobile} ltr />
            </dl>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900">
              {t("account.detailsInfo")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("account.detailsInfoHint")}
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
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
                  options={SEXES.map((value) => ({
                    value,
                    label: t(`account.${value}`),
                  }))}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? t("common.loading") : t("common.save")}
                </button>
                {saved && (
                  <p role="status" className="text-sm font-medium text-emerald-600">
                    {t("account.profileSaved")}
                  </p>
                )}
              </div>
            </form>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="font-bold text-slate-900">
            {t("account.profileCompletion")}
          </h2>
          <p className="mt-3 text-3xl font-bold text-indigo-600">
            {formatPercent(completion, locale, 0)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width]"
              style={{ width: `${completion * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {t("account.detailsInfoHint")}
          </p>
        </Card>
      </div>
    </>
  );
}
