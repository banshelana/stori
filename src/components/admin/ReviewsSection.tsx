"use client";

import { useState } from "react";
import { SelectField, TextAreaField } from "@/components/form/Field";
import { DataTable, Pagination, type Column } from "@/components/panel/DataTable";
import { FilterToolbar } from "@/components/panel/FilterToolbar";
import { ConfirmDialog, Modal } from "@/components/panel/Modal";
import { Badge, PageHeader } from "@/components/panel/ui";
import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useAuth } from "@/lib/auth/auth-context";
import type { Review } from "@/lib/data/commerce";
import {
  customersRepo,
  productsRepo,
  reviewsRepo,
} from "@/lib/data/repositories";
import { formatDate } from "@/lib/format";
import { useResourceList } from "@/lib/useResourceList";
import { validateRequired } from "@/lib/validation";

export function ReviewsSection() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const list = useResourceList(reviewsRepo, {
    initialSortKey: "createdAt",
    initialSortDir: "desc",
  });

  const [editing, setEditing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [pending, setPending] = useState(false);

  const canWrite = can("reviews.write");

  function productTitle(productId: string) {
    const product = productsRepo.all().find((p) => p.id === productId);
    return product ? localized(product.title, locale) : t("common.unknown");
  }

  function authorName(userId: string) {
    const user = customersRepo.all().find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : t("common.unknown");
  }

  async function mutate(fn: () => Promise<unknown>) {
    setPending(true);
    try {
      await fn();
      list.reload();
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Review>[] = [
    {
      key: "product",
      header: t("common.product"),
      render: (r) => (
        <span className="font-medium text-slate-900">
          {productTitle(r.productId)}
        </span>
      ),
    },
    {
      key: "author",
      header: t("common.customer"),
      hideOnMobile: true,
      render: (r) => (
        <span className="text-slate-600">{authorName(r.userId)}</span>
      ),
    },
    {
      key: "rating",
      header: t("review.rating"),
      sortable: true,
      render: (r) => <Rating value={r.rating} />,
    },
    {
      key: "body",
      header: t("review.body"),
      hideOnMobile: true,
      render: (r) => (
        <span className="line-clamp-2 max-w-xs text-slate-600">{r.body}</span>
      ),
    },
    {
      key: "approved",
      header: t("common.status"),
      render: (r) => (
        <Badge tone={r.approved ? "success" : "warning"}>
          {r.approved ? t("review.approved") : t("review.pending")}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: t("common.date"),
      sortable: true,
      hideOnMobile: true,
      render: (r) => (
        <span className="text-slate-500">{formatDate(r.createdAt, locale)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("admin.reviews")} />

      <FilterToolbar
        q={list.q}
        onQ={list.setQ}
        placeholder={t("admin.searchReviews")}
        values={list.filters}
        onFilter={list.setFilter}
        onReset={list.reset}
        hasActiveFilters={list.hasActiveFilters}
        filters={[
          {
            key: "approved",
            label: t("common.status"),
            // The repository compares String(row[key]), so booleans are
            // filtered with their stringified form.
            options: [
              { value: "true", label: t("review.approved") },
              { value: "false", label: t("review.pending") },
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
        rowKey={(r) => r.id}
        loading={list.loading}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSort={list.toggleSort}
        actions={
          canWrite
            ? [
                {
                  icon: "check",
                  label: t("common.approve"),
                  visible: (r) => !r.approved,
                  onClick: (r) =>
                    mutate(() => reviewsRepo.update(r.id, { approved: true })),
                },
                {
                  icon: "close",
                  label: t("common.unapprove"),
                  visible: (r) => r.approved,
                  onClick: (r) =>
                    mutate(() => reviewsRepo.update(r.id, { approved: false })),
                },
                {
                  icon: "pencil",
                  label: t("common.edit"),
                  onClick: (r) => setEditing(r),
                },
                {
                  icon: "trash",
                  label: t("common.delete"),
                  tone: "danger",
                  onClick: (r) => setDeleting(r),
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

      {editing && (
        <ReviewModal
          review={editing}
          productTitle={productTitle(editing.productId)}
          pending={pending}
          onSave={(patch) =>
            mutate(async () => {
              await reviewsRepo.update(editing.id, patch);
              setEditing(null);
            })
          }
          onCancel={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t("admin.deleteReview")}
        pending={pending}
        onConfirm={() =>
          deleting &&
          mutate(async () => {
            await reviewsRepo.remove(deleting.id);
            setDeleting(null);
          })
        }
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function ReviewModal({
  review,
  productTitle,
  pending,
  onSave,
  onCancel,
}: {
  review: Review;
  productTitle: string;
  pending: boolean;
  onSave: (patch: Partial<Review>) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [body, setBody] = useState(review.body);
  const [rating, setRating] = useState(String(review.rating));
  const [error, setError] = useState<string>();

  function handleSubmit() {
    if (!validateRequired(body)) {
      setError(t("validation.required"));
      return;
    }
    onSave({ body: body.trim(), rating: Number(rating) });
  }

  return (
    <Modal
      open
      title={t("admin.editReview")}
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
            onClick={handleSubmit}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? t("common.loading") : t("common.saveChanges")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">{t("common.product")}: </span>
          <span className="font-semibold text-slate-900">{productTitle}</span>
        </p>

        <SelectField
          label={t("review.rating")}
          value={rating}
          onChange={setRating}
          options={[1, 2, 3, 4, 5].map((n) => ({
            value: String(n),
            label: "★".repeat(n),
          }))}
        />

        <TextAreaField
          label={t("review.body")}
          required
          rows={5}
          value={body}
          onChange={(v) => {
            setBody(v);
            setError(undefined);
          }}
          error={error}
        />
      </div>
    </Modal>
  );
}
