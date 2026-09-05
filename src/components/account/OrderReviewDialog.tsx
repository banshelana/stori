"use client";

import Link from "next/link";
import { Icon } from "@/components/panel/Icon";
import { Modal } from "@/components/panel/Modal";
import { Badge } from "@/components/panel/ui";
import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import type { Review } from "@/lib/data/commerce";
import { formatDate } from "@/lib/format";

/**
 * The customer's own review of one purchased line.
 *
 * Shows their review when they have written one — including whether it is
 * still awaiting approval, which is otherwise invisible to them: an
 * unapproved review does not appear on the product page, so without this
 * a submitted review simply seems to have vanished.
 */
export function OrderReviewDialog({
  productTitle,
  productSlug,
  review,
  onClose,
}: {
  productTitle: string;
  productSlug: string;
  review: Review | undefined;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const href = useLocaleHref();

  return (
    <Modal
      open
      title={productTitle}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t("common.back")}
          </button>
          <Link
            href={href(`/products/${productSlug}`)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {review ? t("review.viewOnProduct") : t("review.writeHeading")}
          </Link>
        </>
      }
    >
      {review ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Rating value={review.rating} />
            <Badge tone={review.approved ? "success" : "warning"}>
              {review.approved ? t("review.approved") : t("review.pending")}
            </Badge>
          </div>

          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 leading-relaxed text-slate-800">
            {review.body}
          </p>

          <p className="text-xs text-slate-400">
            {t("review.writtenOn", { date: formatDate(review.createdAt, locale) })}
          </p>

          {!review.approved && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {t("review.pendingExplain")}
            </p>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Icon name="star" className="h-6 w-6" />
          </span>
          <p className="mt-3 font-semibold text-slate-800">
            {t("review.notReviewedYet")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t("review.notReviewedHint")}
          </p>
        </div>
      )}
    </Modal>
  );
}
