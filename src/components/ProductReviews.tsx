"use client";

import { useState } from "react";
import Link from "next/link";
import { TextAreaField } from "@/components/form/Field";
import { Icon } from "@/components/panel/Icon";
import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocaleHref } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { MOCK_REVIEWS } from "@/lib/data/reviews-data";
import {
  customersRepo,
  ordersRepo,
  reviewsRepo,
} from "@/lib/data/repositories";
import { formatDate, formatNumber } from "@/lib/format";
import {
  approvedFor,
  hasPurchased,
  ratingFor,
  reviewEligibility,
} from "@/lib/reviews";
import type { Product } from "@/lib/types";

export function ProductReviews({ product }: { product: Product }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const href = useLocaleHref();

  // Bumped after writing so the list and summary re-read the store.
  const [version, setVersion] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const summary = ratingFor(product.id, MOCK_REVIEWS);
  const reviews = approvedFor(product.id, MOCK_REVIEWS);
  const eligibility = reviewEligibility(
    user?.id,
    product.id,
    ordersRepo.all(),
    MOCK_REVIEWS
  );

  function authorName(userId: string): string {
    const author = customersRepo.all().find((u) => u.id === userId);
    if (!author) return t("common.unknown");
    // Surname initial only — a public page should not print full names.
    return `${author.firstName} ${author.lastName.charAt(0)}.`;
  }

  return (
    <section className="mt-14 border-t border-slate-200 pt-10" key={version}>
      <h2 className="text-xl font-bold tracking-tight text-slate-900">
        {t("review.heading")}
      </h2>

      {/* Summary */}
      <div className="mt-4 flex flex-wrap items-center gap-6">
        {summary.average === null ? (
          <p className="text-slate-500">{t("review.noneYet")}</p>
        ) : (
          <>
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-slate-900">
                {formatNumber(summary.average, locale)}
              </p>
              <Rating value={summary.average} />
              <p className="mt-1 text-sm text-slate-500">
                {t("review.count", {
                  count: formatNumber(summary.count, locale),
                })}
              </p>
            </div>

            {/* Distribution, so an average of 4 built from 5s and 3s is
                distinguishable from one built entirely from 4s. */}
            <ul className="min-w-48 flex-1 space-y-1">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const n = summary.distribution[star];
                const pct = summary.count ? (n / summary.count) * 100 : 0;
                return (
                  <li key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-slate-500">
                      {formatNumber(star, locale)}
                    </span>
                    <Icon name="star" className="h-3 w-3 text-amber-400" />
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-5 text-end text-slate-400">
                      {formatNumber(n, locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Write */}
      <div className="mt-8">
        {submitted ? (
          <p className="animate-fade-in rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {t("review.submitted")}
          </p>
        ) : eligibility === "ok" ? (
          <ReviewForm
            productId={product.id}
            userId={user!.id}
            onDone={() => {
              setSubmitted(true);
              setVersion((v) => v + 1);
            }}
          />
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            {eligibility === "not-signed-in" ? (
              <>
                {t("review.signInToReview")}{" "}
                <Link
                  href={href("/login")}
                  className="font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {t("nav.login")}
                </Link>
              </>
            ) : eligibility === "already-reviewed" ? (
              t("review.alreadyReviewed")
            ) : (
              t("review.purchaseToReview")
            )}
          </p>
        )}
      </div>

      {/* List */}
      {reviews.length > 0 && (
        <ul className="mt-8 space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    {authorName(review.userId)}
                  </span>
                  {/* Every review here passed the purchase gate, but say so
                      explicitly — it is the reason to trust it. */}
                  {hasPurchased(review.userId, product.id, ordersRepo.all()) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <Icon name="check" className="h-3 w-3" />
                      {t("review.verified")}
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(review.createdAt, locale)}
                </span>
              </div>
              <Rating value={review.rating} />
              <p className="mt-2 leading-relaxed text-slate-700">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewForm({
  productId,
  userId,
  onDone,
}: {
  productId: string;
  userId: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError(t("review.pickStars"));
      return;
    }
    if (body.trim().length < 10) {
      setError(t("review.tooShort"));
      return;
    }
    setError(null);
    setPending(true);

    try {
      await reviewsRepo.create({
        productId,
        userId,
        rating,
        body: body.trim(),
        // Held back until a moderator approves it, so it does not move
        // the public rating on the way in.
        approved: false,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      onDone();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-5"
      noValidate
    >
      <p className="font-semibold text-slate-900">{t("review.writeHeading")}</p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => {
              setRating(star);
              setError(null);
            }}
            aria-label={t("review.starLabel", { star })}
            aria-pressed={rating === star}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Icon
              name="star"
              className={`h-7 w-7 ${
                star <= rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>

      <TextAreaField
        className="mt-3"
        label={t("review.body")}
        rows={4}
        value={body}
        onChange={(v) => {
          setBody(v);
          setError(null);
        }}
        hint={t("review.moderationNote")}
      />

      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-rose-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-glow mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("review.submit")}
      </button>
    </form>
  );
}
