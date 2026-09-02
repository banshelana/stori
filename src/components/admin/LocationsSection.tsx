"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/form/Field";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar, NewButton } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Tabs, TabPanel } from "@/components/panel/Tabs";
import { Badge, PageHeader } from "@/components/panel/ui";
import { LOCALE_LABEL, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/lib/auth/auth-context";
import {
  CITIES,
  cityCountOf,
  cityCountOfCountry,
  COUNTRIES,
  findCountry,
  findProvince,
  geoName,
  PROVINCES,
  provinceCountOf,
  type City,
  type Country,
  type GeoName,
  type Province,
} from "@/lib/data/geo";
import {
  citiesRepo,
  countriesRepo,
  provincesRepo,
} from "@/lib/data/repositories";
import { formatNumber } from "@/lib/format";
import { useResourceList } from "@/lib/useResourceList";
import { toAsciiDigits, validateRequired } from "@/lib/validation";

type TabId = "countries" | "provinces" | "cities";

const BLANK_NAME: GeoName = { en: "", fa: "" };

export function LocationsSection() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("countries");

  return (
    <>
      <PageHeader
        title={t("admin.locations")}
        subtitle={t("admin.locationsHint")}
      />

      <Tabs
        label={t("admin.locations")}
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: "countries", label: t("geo.countries"), badge: COUNTRIES.length },
          { id: "provinces", label: t("geo.provinces"), badge: PROVINCES.length },
          { id: "cities", label: t("geo.cities"), badge: CITIES.length },
        ]}
      />

      <TabPanel id="countries" active={tab}>
        <CountriesTab />
      </TabPanel>
      <TabPanel id="provinces" active={tab}>
        <ProvincesTab />
      </TabPanel>
      <TabPanel id="cities" active={tab}>
        <CitiesTab />
      </TabPanel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Countries                                                           */
/* ------------------------------------------------------------------ */

function CountriesTab() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(countriesRepo, { initialSortKey: "name" });

  const [editing, setEditing] = useState<Country | "new" | null>(null);
  const [deleting, setDeleting] = useState<Country | null>(null);
  const [pending, setPending] = useState(false);

  const canManage = can("geo.manage");

  // A country with provinces cannot be removed without orphaning them.
  const blockedBy = deleting
    ? {
        provinces: provinceCountOf(deleting.id),
        cities: cityCountOfCountry(deleting.id),
      }
    : null;
  const blocked = Boolean(blockedBy && blockedBy.provinces > 0);

  async function handleSave(form: CountryForm) {
    setPending(true);
    try {
      const payload = {
        name: form.name,
        iso2: form.iso2.trim().toUpperCase(),
        dialCode: form.dialCode.trim(),
      };
      if (editing === "new") await countriesRepo.create(payload);
      else if (editing) await countriesRepo.update(editing.id, payload);
      setEditing(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Country>[] = [
    {
      key: "name",
      header: t("address.country"),
      sortable: true,
      render: (c) => (
        <span className="font-medium text-slate-900">
          {geoName(c.name, locale)}
        </span>
      ),
    },
    {
      key: "iso2",
      header: t("geo.iso2"),
      sortable: true,
      render: (c) => <span className="force-ltr text-slate-600">{c.iso2}</span>,
    },
    {
      key: "dialCode",
      header: t("geo.dialCode"),
      sortable: true,
      hideOnMobile: true,
      render: (c) => (
        <span className="force-ltr text-slate-600">{c.dialCode}</span>
      ),
    },
    {
      key: "provinces",
      header: t("geo.provinces"),
      align: "end",
      render: (c) => (
        <Badge tone={provinceCountOf(c.id) > 0 ? "info" : "neutral"}>
          {formatNumber(provinceCountOf(c.id), locale)}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        {canManage && (
          <NewButton
            label={t("geo.newCountry")}
            onClick={() => setEditing("new")}
          />
        )}
      </div>

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("geo.searchCountries")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(c) => c.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canManage
            ? [
                {
                  icon: "pencil",
                  label: t("common.edit"),
                  onClick: (c) => setEditing(c),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (c) => setDeleting(c),
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
        <CountryModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          pending={pending}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={blocked ? t("geo.cannotDelete") : t("geo.deleteCountry")}
        body={
          blocked
            ? t("geo.countryInUse", {
                provinces: formatNumber(blockedBy?.provinces ?? 0, locale),
                cities: formatNumber(blockedBy?.cities ?? 0, locale),
              })
            : deleting
              ? geoName(deleting.name, locale)
              : undefined
        }
        confirmLabel={blocked ? t("common.confirm") : t("common.delete")}
        pending={pending}
        onConfirm={async () => {
          // Blocked deletes fall through to a plain dismiss, so the
          // dialog doubles as the explanation.
          if (blocked) {
            setDeleting(null);
            return;
          }
          if (!deleting) return;
          setPending(true);
          try {
            await countriesRepo.remove(deleting.id);
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

interface CountryForm {
  name: GeoName;
  iso2: string;
  dialCode: string;
}

function CountryModal({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Country | "new";
  pending: boolean;
  onSave: (form: CountryForm) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const isNew = initial === "new";
  const [form, setForm] = useState<CountryForm>(
    isNew
      ? { name: { ...BLANK_NAME }, iso2: "", dialCode: "" }
      : { name: { ...initial.name }, iso2: initial.iso2, dialCode: initial.dialCode }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const lang of LOCALES) {
      if (!validateRequired(form.name[lang])) {
        next[`name.${lang}`] = t("validation.required");
      }
    }
    if (!/^[A-Za-z]{2}$/.test(form.iso2.trim())) next.iso2 = t("geo.iso2Invalid");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave(form);
  }

  return (
    <GeoModal
      title={isNew ? t("geo.newCountry") : t("geo.editCountry")}
      formId="country-form"
      isNew={isNew}
      pending={pending}
      onCancel={onCancel}
    >
      <form id="country-form" onSubmit={submit} className="space-y-4" noValidate>
        <NameFields
          value={form.name}
          errors={errors}
          onChange={(lang, v) =>
            setForm((prev) => ({ ...prev, name: { ...prev.name, [lang]: v } }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("geo.iso2")}
            required
            dir="ltr"
            hint={t("geo.iso2Hint")}
            value={form.iso2}
            onChange={(v) => setForm((p) => ({ ...p, iso2: v }))}
            error={errors.iso2}
          />
          <TextField
            label={t("geo.dialCode")}
            dir="ltr"
            value={form.dialCode}
            onChange={(v) => setForm((p) => ({ ...p, dialCode: v }))}
          />
        </div>
      </form>
    </GeoModal>
  );
}

/* ------------------------------------------------------------------ */
/* Provinces                                                           */
/* ------------------------------------------------------------------ */

function ProvincesTab() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(provincesRepo, { initialSortKey: "name" });

  const [editing, setEditing] = useState<Province | "new" | null>(null);
  const [deleting, setDeleting] = useState<Province | null>(null);
  const [pending, setPending] = useState(false);

  const canManage = can("geo.manage");
  const blocked = deleting ? cityCountOf(deleting.id) > 0 : false;

  const columns: Column<Province>[] = [
    {
      key: "name",
      header: t("address.province"),
      sortable: true,
      render: (p) => (
        <span className="font-medium text-slate-900">
          {geoName(p.name, locale)}
        </span>
      ),
    },
    {
      key: "countryId",
      header: t("address.country"),
      sortable: true,
      render: (p) => {
        const country = findCountry(p.countryId);
        return country ? (
          <span className="text-slate-600">{geoName(country.name, locale)}</span>
        ) : (
          // A dangling foreign key should be loud, not invisible.
          <Badge tone="danger">{t("geo.orphaned")}</Badge>
        );
      },
    },
    {
      key: "cities",
      header: t("geo.cities"),
      align: "end",
      render: (p) => (
        <Badge tone={cityCountOf(p.id) > 0 ? "info" : "neutral"}>
          {formatNumber(cityCountOf(p.id), locale)}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        {canManage && (
          <NewButton
            label={t("geo.newProvince")}
            onClick={() => setEditing("new")}
          />
        )}
      </div>

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("geo.searchProvinces")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "countryId",
            label: t("address.country"),
            options: COUNTRIES.map((c) => ({
              value: c.id,
              label: geoName(c.name, locale),
            })),
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(p) => p.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canManage
            ? [
                {
                  icon: "pencil",
                  label: t("common.edit"),
                  onClick: (p) => setEditing(p),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (p) => setDeleting(p),
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
        <ProvinceModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          pending={pending}
          onSave={async (form) => {
            setPending(true);
            try {
              if (editing === "new") await provincesRepo.create(form);
              else await provincesRepo.update(editing.id, form);
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
        title={blocked ? t("geo.cannotDelete") : t("geo.deleteProvince")}
        body={
          blocked
            ? t("geo.provinceInUse", {
                cities: formatNumber(
                  deleting ? cityCountOf(deleting.id) : 0,
                  locale
                ),
              })
            : deleting
              ? geoName(deleting.name, locale)
              : undefined
        }
        confirmLabel={blocked ? t("common.confirm") : t("common.delete")}
        pending={pending}
        onConfirm={async () => {
          if (blocked) {
            setDeleting(null);
            return;
          }
          if (!deleting) return;
          setPending(true);
          try {
            await provincesRepo.remove(deleting.id);
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

function ProvinceModal({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Province | "new";
  pending: boolean;
  onSave: (form: { name: GeoName; countryId: string }) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const isNew = initial === "new";
  const [form, setForm] = useState(
    isNew
      ? { name: { ...BLANK_NAME }, countryId: COUNTRIES[0]?.id ?? "" }
      : { name: { ...initial.name }, countryId: initial.countryId }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const lang of LOCALES) {
      if (!validateRequired(form.name[lang])) {
        next[`name.${lang}`] = t("validation.required");
      }
    }
    if (!form.countryId) next.countryId = t("validation.required");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave(form);
  }

  return (
    <GeoModal
      title={isNew ? t("geo.newProvince") : t("geo.editProvince")}
      formId="province-form"
      isNew={isNew}
      pending={pending}
      onCancel={onCancel}
    >
      <form id="province-form" onSubmit={submit} className="space-y-4" noValidate>
        <NameFields
          value={form.name}
          errors={errors}
          onChange={(lang, v) =>
            setForm((prev) => ({ ...prev, name: { ...prev.name, [lang]: v } }))
          }
        />
        <SelectField
          label={t("address.country")}
          required
          hint={t("geo.parentHint")}
          value={form.countryId}
          onChange={(v) => setForm((p) => ({ ...p, countryId: v }))}
          error={errors.countryId}
          options={COUNTRIES.map((c) => ({
            value: c.id,
            label: geoName(c.name, locale),
          }))}
        />
      </form>
    </GeoModal>
  );
}

/* ------------------------------------------------------------------ */
/* Cities                                                              */
/* ------------------------------------------------------------------ */

function CitiesTab() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(citiesRepo, { initialSortKey: "name" });

  const [editing, setEditing] = useState<City | "new" | null>(null);
  const [deleting, setDeleting] = useState<City | null>(null);
  const [pending, setPending] = useState(false);

  const canManage = can("geo.manage");

  const columns: Column<City>[] = [
    {
      key: "name",
      header: t("address.city"),
      sortable: true,
      render: (c) => (
        <span className="font-medium text-slate-900">
          {geoName(c.name, locale)}
        </span>
      ),
    },
    {
      key: "provinceId",
      header: t("address.province"),
      sortable: true,
      render: (c) => {
        const province = findProvince(c.provinceId);
        return province ? (
          <span className="text-slate-600">{geoName(province.name, locale)}</span>
        ) : (
          <Badge tone="danger">{t("geo.orphaned")}</Badge>
        );
      },
    },
    {
      key: "country",
      header: t("address.country"),
      hideOnMobile: true,
      render: (c) => {
        const country = findCountry(findProvince(c.provinceId)?.countryId);
        return (
          <span className="text-slate-500">
            {country ? geoName(country.name, locale) : "—"}
          </span>
        );
      },
    },
    {
      key: "coords",
      header: t("geo.coordinates"),
      align: "end",
      hideOnMobile: true,
      render: (c) =>
        c.lat != null && c.lon != null ? (
          <span className="force-ltr text-xs text-slate-500">
            {c.lat.toFixed(4)}, {c.lon.toFixed(4)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        {canManage && (
          <NewButton label={t("geo.newCity")} onClick={() => setEditing("new")} />
        )}
      </div>

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("geo.searchCities")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "provinceId",
            label: t("address.province"),
            options: PROVINCES.map((p) => ({
              value: p.id,
              label: geoName(p.name, locale),
            })),
          },
        ]}
      />

      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(c) => c.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canManage
            ? [
                {
                  icon: "pencil",
                  label: t("common.edit"),
                  onClick: (c) => setEditing(c),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (c) => setDeleting(c),
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
        <CityModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          pending={pending}
          onSave={async (form) => {
            setPending(true);
            try {
              if (editing === "new") await citiesRepo.create(form);
              else await citiesRepo.update(editing.id, form);
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
        title={t("geo.deleteCity")}
        body={deleting ? geoName(deleting.name, locale) : undefined}
        pending={pending}
        onConfirm={async () => {
          if (!deleting) return;
          setPending(true);
          try {
            await citiesRepo.remove(deleting.id);
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

function CityModal({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: City | "new";
  pending: boolean;
  onSave: (form: {
    name: GeoName;
    provinceId: string;
    lat?: number;
    lon?: number;
  }) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const isNew = initial === "new";

  // The country select is form state only — a city's foreign key is its
  // province. Country just narrows the province list.
  const initialProvince = isNew ? (PROVINCES[0]?.id ?? "") : initial.provinceId;
  const [countryId, setCountryId] = useState(
    findProvince(initialProvince)?.countryId ?? COUNTRIES[0]?.id ?? ""
  );
  const [form, setForm] = useState({
    name: isNew ? { ...BLANK_NAME } : { ...initial.name },
    provinceId: initialProvince,
    lat: isNew ? "" : (initial.lat?.toString() ?? ""),
    lon: isNew ? "" : (initial.lon?.toString() ?? ""),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const provinces = PROVINCES.filter((p) => p.countryId === countryId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const lang of LOCALES) {
      if (!validateRequired(form.name[lang])) {
        next[`name.${lang}`] = t("validation.required");
      }
    }
    if (!form.provinceId) next.provinceId = t("validation.required");

    const lat = form.lat ? Number(toAsciiDigits(form.lat)) : undefined;
    const lon = form.lon ? Number(toAsciiDigits(form.lon)) : undefined;
    if (lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      next.lat = t("geo.latInvalid");
    }
    if (lon !== undefined && (!Number.isFinite(lon) || lon < -180 || lon > 180)) {
      next.lon = t("geo.lonInvalid");
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({ name: form.name, provinceId: form.provinceId, lat, lon });
  }

  return (
    <GeoModal
      title={isNew ? t("geo.newCity") : t("geo.editCity")}
      formId="city-form"
      isNew={isNew}
      pending={pending}
      onCancel={onCancel}
    >
      <form id="city-form" onSubmit={submit} className="space-y-4" noValidate>
        <NameFields
          value={form.name}
          errors={errors}
          onChange={(lang, v) =>
            setForm((prev) => ({ ...prev, name: { ...prev.name, [lang]: v } }))
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t("address.country")}
            value={countryId}
            onChange={(v) => {
              setCountryId(v);
              // The old province belongs to the old country.
              setForm((p) => ({ ...p, provinceId: "" }));
            }}
            options={COUNTRIES.map((c) => ({
              value: c.id,
              label: geoName(c.name, locale),
            }))}
          />
          <SelectField
            label={t("address.province")}
            required
            hint={t("geo.parentHint")}
            value={form.provinceId}
            placeholder={t("address.selectProvince")}
            onChange={(v) => setForm((p) => ({ ...p, provinceId: v }))}
            error={errors.provinceId}
            options={provinces.map((p) => ({
              value: p.id,
              label: geoName(p.name, locale),
            }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("geo.latitude")}
            dir="ltr"
            inputMode="numeric"
            value={form.lat}
            onChange={(v) => setForm((p) => ({ ...p, lat: v }))}
            error={errors.lat}
          />
          <TextField
            label={t("geo.longitude")}
            dir="ltr"
            inputMode="numeric"
            value={form.lon}
            onChange={(v) => setForm((p) => ({ ...p, lon: v }))}
            error={errors.lon}
          />
        </div>
      </form>
    </GeoModal>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Place names are translated, so every geo record has one field per locale. */
function NameFields({
  value,
  errors,
  onChange,
}: {
  value: GeoName;
  errors: Record<string, string>;
  onChange: (lang: Locale, value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {LOCALES.map((lang) => (
        <TextField
          key={lang}
          label={`${t("common.name")} — ${LOCALE_LABEL[lang]}`}
          required
          dir={lang === "fa" ? "rtl" : "ltr"}
          value={value[lang]}
          onChange={(v) => onChange(lang, v)}
          error={errors[`name.${lang}`]}
        />
      ))}
    </div>
  );
}

function GeoModal({
  title,
  formId,
  isNew,
  pending,
  onCancel,
  children,
}: {
  title: string;
  formId: string;
  isNew: boolean;
  pending: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open
      title={title}
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
            form={formId}
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
      {children}
    </Modal>
  );
}
