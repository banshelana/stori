"use client";

import { useState } from "react";
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/form/Field";
import { GalleryUpload } from "@/components/form/ImageUpload";
import { AdjustmentsEditor } from "@/components/admin/AdjustmentsEditor";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar, NewButton } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Badge, PageHeader } from "@/components/panel/ui";
import { LOCALE_LABEL, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { localized, type LocalizedText } from "@/i18n/localized";
import { useAuth } from "@/lib/auth/auth-context";
import { MOCK_CATEGORIES } from "@/lib/data/mock";
import { productsRepo } from "@/lib/data/repositories";
import { formatNumber, formatPrice } from "@/lib/format";
import { primaryImageSrc } from "@/lib/product";
import type { PriceAdjustment, Product, ProductImage } from "@/lib/types";
import { effectivePrice, strikeThroughPrice } from "@/lib/pricing";
import { useFormErrors } from "@/lib/useFormErrors";
import { useResourceList } from "@/lib/useResourceList";
import { toAsciiDigits, validateRequired } from "@/lib/validation";

interface FormState {
  title: LocalizedText;
  description: LocalizedText;
  slug: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  images: ProductImage[];
  primaryImageId: string | null;
  active: boolean;
  adjustments: PriceAdjustment[];
  categoryId: string;
  tags: string;
  stock: string;
  rating: string;
  featured: boolean;
}

const BLANK: FormState = {
  title: { en: "", fa: "" },
  description: { en: "", fa: "" },
  slug: "",
  price: "",
  compareAtPrice: "",
  currency: "EUR",
  images: [],
  primaryImageId: null,
  active: true,
  adjustments: [],
  categoryId: MOCK_CATEGORIES[0]?.id ?? "",
  tags: "",
  stock: "0",
  rating: "0",
  featured: false,
};

/** Lowercase, dashes, no leading/trailing dash — matches the URL contract. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductsSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(productsRepo, {
    initialSortKey: "title",
    initialSortDir: "asc",
  });

  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [pending, setPending] = useState(false);

  const canWrite = can("products.write");

  async function handleSave(form: FormState) {
    setPending(true);
    try {
      const compareAt = toAsciiDigits(form.compareAtPrice).trim();
      const payload = {
        title: form.title,
        description: form.description,
        slug: form.slug,
        price: Number(toAsciiDigits(form.price)) || 0,
        compareAtPrice: compareAt ? Number(compareAt) : null,
        currency: form.currency,
        images: form.images,
        primaryImageId: form.primaryImageId,
        active: form.active,
        adjustments: form.adjustments,
        categoryId: form.categoryId,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        stock: Number(toAsciiDigits(form.stock)) || 0,
        rating: Number(toAsciiDigits(form.rating)) || 0,
        featured: form.featured,
      };

      if (editing === "new") {
        await productsRepo.create({
          ...payload,
          // Brand and facets are edited from the catalogue import
          // flow, not this form; a new product starts unclassified.
          brandId: null,
          attributes: {},
          createdAt: new Date().toISOString().slice(0, 10),
        });
      } else if (editing) {
        await productsRepo.update(editing.id, payload);
      }

      setEditing(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(product: Product, active: boolean) {
    await productsRepo.update(product.id, { active });
    list.reload();
  }

  async function handleDelete() {
    if (!deleting) return;
    setPending(true);
    try {
      await productsRepo.remove(deleting.id);
      setDeleting(null);
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "title",
      header: t("common.product"),
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <span className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImageSrc(p)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-slate-900">
              {localized(p.title, locale)}
            </span>
            <span className="force-ltr block truncate text-xs text-slate-400">
              {p.slug}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "price",
      header: t("product.price"),
      sortable: true,
      align: "end",
      render: (p) => {
        const was = strikeThroughPrice(p);
        return (
          <span className="inline-flex flex-col items-end">
            <span className="font-semibold text-slate-900">
              {formatPrice(effectivePrice(p), p.currency, locale)}
            </span>
            {was !== null && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(was, p.currency, locale)}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "stock",
      header: t("product.stockLabel"),
      sortable: true,
      align: "end",
      hideOnMobile: true,
      render: (p) =>
        p.stock > 0 ? (
          <span className="text-slate-600">{formatNumber(p.stock, locale)}</span>
        ) : (
          <Badge tone="danger">{t("product.soldOut")}</Badge>
        ),
    },
    {
      key: "rating",
      header: t("product.ratingLabel"),
      sortable: true,
      align: "end",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-slate-600">
          {formatNumber(Number(p.rating.toFixed(1)), locale)}
        </span>
      ),
    },
    {
      key: "featured",
      header: t("product.featured"),
      hideOnMobile: true,
      render: (p) =>
        p.featured ? (
          <Badge tone="success">{t("common.yes")}</Badge>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "active",
      header: t("common.status"),
      render: (p) => (
        <Badge tone={p.active ? "success" : "neutral"}>
          {p.active ? t("common.active") : t("common.disabled")}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.products")}
        action={
          canWrite && (
            <NewButton
              label={t("admin.newProduct")}
              onClick={() => setEditing("new")}
            />
          )
        }
      />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("admin.searchProducts")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "categoryId",
            label: t("product.category"),
            options: MOCK_CATEGORIES.map((c) => ({
              value: c.id,
              label: localized(c.name, locale),
            })),
          },
          {
            key: "active",
            label: t("common.status"),
            options: [
              { value: "true", label: t("common.active") },
              { value: "false", label: t("common.disabled") },
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
        rowKey={(p) => p.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canWrite
            ? [
                {
                  icon: "power",
                  label: t("common.disable"),
                  visible: (p) => p.active,
                  onClick: (p) => toggleActive(p, false),
                },
                {
                  icon: "power",
                  label: t("common.enable"),
                  visible: (p) => !p.active,
                  onClick: (p) => toggleActive(p, true),
                },
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
        <ProductForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          pending={pending}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deleteProduct")}
        body={deleting ? localized(deleting.title, locale) : undefined}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function ProductForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Product | "new";
  pending: boolean;
  onSave: (form: FormState) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const isNew = initial === "new";

  const [form, setForm] = useState<FormState>(
    isNew
      ? BLANK
      : {
          title: { ...initial.title },
          description: { ...initial.description },
          slug: initial.slug,
          price: String(initial.price),
          compareAtPrice:
            initial.compareAtPrice != null ? String(initial.compareAtPrice) : "",
          currency: initial.currency,
          images: [...initial.images],
          primaryImageId: initial.primaryImageId,
          active: initial.active,
          adjustments: (initial.adjustments ?? []).map((a) => ({ ...a })),
          categoryId: initial.categoryId,
          tags: initial.tags.join(", "),
          stock: String(initial.stock),
          rating: String(initial.rating),
          featured: Boolean(initial.featured),
        }
  );
  const { errors, setErrors, clear } = useFormErrors();
  // Once the slug has been edited by hand, stop overwriting it.
  const [slugTouched, setSlugTouched] = useState(!isNew);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clear(key as string);
  }

  function setTranslation(
    field: "title" | "description",
    lang: Locale,
    value: string
  ) {
    clear(`${field}.${lang}`);
    setForm((prev) => {
      const next = { ...prev, [field]: { ...prev[field], [lang]: value } };
      // The slug comes from the English title, which is the one that has
      // to survive in a URL.
      if (field === "title" && lang === "en" && !slugTouched) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    for (const lang of LOCALES) {
      if (!validateRequired(form.title[lang])) {
        next[`title.${lang}`] = t("validation.required");
      }
    }
    if (!validateRequired(form.slug)) next.slug = t("validation.required");
    if (!validateRequired(form.price)) next.price = t("validation.required");

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({ ...form, slug: slugify(form.slug) });
  }

  return (
    <Modal
      open
      size="lg"
      title={isNew ? t("admin.newProduct") : t("admin.editProduct")}
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
            form="product-form"
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
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Content is per-language, so every locale gets its own pair of
            fields with the input direction pinned to that language. */}
        {LOCALES.map((lang) => (
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
              value={form.title[lang]}
              onChange={(v) => setTranslation("title", lang, v)}
              error={errors[`title.${lang}`]}
            />
            <TextAreaField
              label={t("product.description")}
              dir={lang === "fa" ? "rtl" : "ltr"}
              value={form.description[lang]}
              onChange={(v) => setTranslation("description", lang, v)}
            />
          </div>
        ))}

        <TextField
          label={t("product.slug")}
          required
          dir="ltr"
          hint={t("product.slugHint")}
          value={form.slug}
          onChange={(v) => {
            setSlugTouched(true);
            set("slug", v);
          }}
          error={errors.slug}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("product.price")}
            required
            inputMode="numeric"
            hint={t("product.priceHint")}
            value={form.price}
            onChange={(v) => set("price", v)}
            error={errors.price}
          />
          <TextField
            label={t("product.compareAtPrice")}
            inputMode="numeric"
            hint={t("product.compareAtPriceHint")}
            value={form.compareAtPrice}
            onChange={(v) => set("compareAtPrice", v)}
          />
          <SelectField
            label={t("product.category")}
            value={form.categoryId}
            onChange={(v) => set("categoryId", v)}
            options={MOCK_CATEGORIES.map((c) => ({
              value: c.id,
              label: c.name.en,
            }))}
          />
          <SelectField
            label={t("product.currency")}
            value={form.currency}
            onChange={(v) => set("currency", v)}
            options={["EUR", "USD", "IRR"].map((value) => ({
              value,
              label: value,
            }))}
          />
          <TextField
            label={t("product.stockLabel")}
            inputMode="numeric"
            value={form.stock}
            onChange={(v) => set("stock", v)}
          />
          <TextField
            label={t("product.ratingLabel")}
            inputMode="numeric"
            value={form.rating}
            onChange={(v) => set("rating", v)}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <AdjustmentsEditor
            adjustments={form.adjustments}
            basePrice={Number(toAsciiDigits(form.price)) || 0}
            currency={form.currency}
            onChange={(adjustments) =>
              setForm((prev) => ({ ...prev, adjustments }))
            }
          />
        </div>

        <GalleryUpload
          images={form.images}
          primaryId={form.primaryImageId}
          onChange={(images, primaryImageId) =>
            setForm((prev) => ({ ...prev, images, primaryImageId }))
          }
        />

        <TextField
          label={t("product.tags")}
          hint={t("product.tagsHint")}
          value={form.tags}
          onChange={(v) => set("tags", v)}
        />

        <div className="space-y-2">
          <CheckboxField
            label={t("product.featured")}
            checked={form.featured}
            onChange={(v) => set("featured", v)}
          />
          <CheckboxField
            label={t("common.activeLabel")}
            checked={form.active}
            onChange={(v) => set("active", v)}
          />
        </div>
      </form>
    </Modal>
  );
}
