"use client";

import { useState } from "react";
import { Icon } from "@/components/panel/Icon";
import { MapPicker } from "@/components/MapPicker";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/form/Field";
import { useFormErrors } from "@/lib/useFormErrors";
import { Badge, Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserAddress } from "@/lib/auth/types";
import {
  citiesOf,
  COUNTRIES,
  findCity,
  findCountry,
  findProvince,
  geoName,
  isValidGeoSelection,
  provincesOf,
} from "@/lib/data/geo";
import type { LatLon } from "@/lib/map";
import { toAsciiDigits, validatePostalCode, validateRequired } from "@/lib/validation";

const EMPTY: Omit<UserAddress, "id"> = {
  countryId: "",
  provinceId: "",
  cityId: "",
  street: "",
  alley: "",
  buildingNo: "",
  floor: "",
  unit: "",
  postalCode: "",
  lat: undefined,
  lon: undefined,
};

export function AddressBook() {
  const { user, updateProfile, pending } = useAuth();
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<UserAddress | "new" | null>(null);

  if (!user) return null;
  const addresses = user.addresses ?? [];

  async function persist(next: UserAddress[]) {
    await updateProfile({ addresses: next });
    setEditing(null);
  }

  async function handleSave(value: Omit<UserAddress, "id">, id?: string) {
    const entry: UserAddress = { ...value, id: id ?? `a-${Date.now()}` };
    const rest = addresses.filter((a) => a.id !== entry.id);
    // Exactly one default must survive, whichever way the flag was set.
    const next = entry.isDefault
      ? [...rest.map((a) => ({ ...a, isDefault: false })), entry]
      : [...rest, entry];
    if (!next.some((a) => a.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    await persist(next);
  }

  async function handleDelete(id: string) {
    const next = addresses.filter((a) => a.id !== id);
    if (next.length > 0 && !next.some((a) => a.isDefault)) {
      next[0] = { ...next[0], isDefault: true };
    }
    await persist(next);
  }

  return (
    <>
      <PageHeader
        title={t("account.addresses")}
        action={
          editing === null && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Icon name="plus" className="h-4 w-4" />
              {t("address.addNew")}
            </button>
          )
        }
      />

      {editing !== null && (
        <Card className="mb-6">
          <AddressForm
            initial={editing === "new" ? EMPTY : editing}
            pending={pending}
            onCancel={() => setEditing(null)}
            onSave={(value) =>
              handleSave(value, editing === "new" ? undefined : editing.id)
            }
          />
        </Card>
      )}

      {addresses.length === 0 && editing === null ? (
        <EmptyState title={t("address.noAddresses")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {[
                      findCountry(address.countryId),
                      findProvince(address.provinceId),
                      findCity(address.cityId),
                    ]
                      .map((entry) => (entry ? geoName(entry.name, locale) : "—"))
                      .join(" › ")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {[
                      address.street && `${t("address.street")} ${address.street}`,
                      address.alley && `${t("address.alley")} ${address.alley}`,
                      address.buildingNo &&
                        `${t("address.buildingNo")} ${address.buildingNo}`,
                      address.floor && `${t("address.floor")} ${address.floor}`,
                      address.unit && `${t("address.unit")} ${address.unit}`,
                    ]
                      .filter(Boolean)
                      // Persian uses its own comma; joining with "," would
                      // look wrong on the Farsi side.
                      .join(locale === "fa" ? "، " : ", ")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("address.postalCode")}:{" "}
                    <span className="force-ltr font-medium">
                      {address.postalCode}
                    </span>
                  </p>
                </div>
                {address.isDefault && (
                  <Badge tone="success">{t("address.defaultLabel")}</Badge>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(address)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Icon name="pencil" className="h-4 w-4" />
                  {t("common.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(address.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Icon name="trash" className="h-4 w-4" />
                  {t("common.delete")}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Country → Province → City cascade.
 *
 * Selecting a country clears the province and city, and selecting a province
 * clears the city, so the form cannot submit a combination that doesn't exist
 * in the reference data. Everything below city is free text.
 */
function AddressForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Omit<UserAddress, "id"> & { id?: string };
  pending: boolean;
  onSave: (value: Omit<UserAddress, "id">) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState(initial);
  const { errors, setErrors, clear } = useFormErrors();

  const provinces = provincesOf(form.countryId);
  const cities = citiesOf(form.provinceId);

  // Where the map opens before a pin exists. Cities carry coordinates in
  // the reference data, so choosing one already puts the shopper in the
  // right place.
  const selectedCity = findCity(form.cityId);
  const cityCenter =
    selectedCity?.lat != null && selectedCity.lon != null
      ? { lat: selectedCity.lat, lon: selectedCity.lon }
      : null;

  function set(patch: Partial<UserAddress>) {
    setForm((prev) => ({ ...prev, ...patch }));
    Object.keys(patch).forEach(clear);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!isValidGeoSelection(form.countryId, form.provinceId, form.cityId)) {
      if (!form.countryId) next.countryId = t("validation.required");
      else if (!form.provinceId) next.provinceId = t("validation.required");
      else next.cityId = t("validation.required");
    }
    if (!validateRequired(form.street)) next.street = t("validation.required");
    if (!validateRequired(form.postalCode)) {
      next.postalCode = t("validation.required");
    } else if (!validatePostalCode(form.postalCode)) {
      next.postalCode = t("validation.postalCodeInvalid");
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({ ...form, postalCode: toAsciiDigits(form.postalCode) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2 className="font-bold text-slate-900">{t("address.title")}</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label={t("address.country")}
          value={form.countryId}
          placeholder={t("address.selectCountry")}
          error={errors.countryId}
          options={COUNTRIES.map((c) => ({
            value: c.id,
            label: geoName(c.name, locale),
          }))}
          onChange={(v) => set({ countryId: v, provinceId: "", cityId: "" })}
        />
        <SelectField
          label={t("address.province")}
          value={form.provinceId}
          placeholder={
            form.countryId
              ? t("address.selectProvince")
              : t("address.provinceNeedsCountry")
          }
          disabled={!form.countryId}
          error={errors.provinceId}
          options={provinces.map((p) => ({
            value: p.id,
            label: geoName(p.name, locale),
          }))}
          onChange={(v) => set({ provinceId: v, cityId: "" })}
        />
        <SelectField
          label={t("address.city")}
          value={form.cityId}
          placeholder={
            form.provinceId
              ? t("address.selectCity")
              : t("address.cityNeedsProvince")
          }
          disabled={!form.provinceId}
          error={errors.cityId}
          options={cities.map((c) => ({
            value: c.id,
            label: geoName(c.name, locale),
          }))}
          onChange={(v) => set({ cityId: v })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("address.street")}
          value={form.street}
          onChange={(v) => set({ street: v })}
          error={errors.street}
        />
        <TextField
          label={t("address.alley")}
          value={form.alley ?? ""}
          onChange={(v) => set({ alley: v })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <TextField
          label={t("address.buildingNo")}
          value={form.buildingNo ?? ""}
          onChange={(v) => set({ buildingNo: v })}
          inputMode="numeric"
        />
        <TextField
          label={t("address.floor")}
          value={form.floor ?? ""}
          onChange={(v) => set({ floor: v })}
          inputMode="numeric"
        />
        <TextField
          label={t("address.unit")}
          value={form.unit ?? ""}
          onChange={(v) => set({ unit: v })}
          inputMode="numeric"
        />
        <TextField
          label={t("address.postalCode")}
          value={form.postalCode}
          onChange={(v) => set({ postalCode: v })}
          error={errors.postalCode}
          inputMode="numeric"
        />
      </div>

      {/* Optional: an address is valid without a pin. The map opens on
          the chosen city so the shopper starts near where they live. */}
      <MapPicker
        value={
          form.lat != null && form.lon != null
            ? { lat: form.lat, lon: form.lon }
            : null
        }
        center={cityCenter}
        onChange={(next: LatLon | null) =>
          set({ lat: next?.lat, lon: next?.lon })
        }
      />

      <CheckboxField
        label={t("address.setDefault")}
        checked={Boolean(form.isDefault)}
        onChange={(v) => set({ isDefault: v })}
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? t("common.loading") : t("common.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
