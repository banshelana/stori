"use client";

import { Rating } from "@/components/Rating";
import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber } from "@/lib/format";
import type { RatingSummary } from "@/lib/reviews";

/**
 * A product's stars, derived from its approved reviews.
 *
 * An unrated product says so rather than showing zero stars — zero is a
 * verdict, and nobody has given one.
 */
export function ProductRating({
  summary,
  showCount = true,
  size = "sm",
}: {
  summary: RatingSummary;
  showCount?: boolean;
  size?: "sm" | "md";
}) {
  const { t, locale } = useI18n();

  if (summary.average === null) {
    return (
      <span className="text-xs text-slate-400">{t("review.none")}</span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Rating value={summary.average} />
      {showCount && (
        <span
          className={size === "md" ? "text-sm text-slate-500" : "text-xs text-slate-400"}
        >
          ({formatNumber(summary.count, locale)})
        </span>
      )}
    </span>
  );
}
