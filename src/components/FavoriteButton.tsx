"use client";

import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useFavorites } from "@/lib/favorites-context";

/**
 * Heart toggle. Works signed out — the guest list merges into the
 * account on sign-in — so it never interrupts browsing with a login wall.
 */
export function FavoriteButton({
  productId,
  variant = "icon",
}: {
  productId: string;
  variant?: "icon" | "full";
}) {
  const { t } = useI18n();
  const { has, toggle, ready } = useFavorites();
  const active = ready && has(productId);

  const label = active ? t("favorites.remove") : t("favorites.add");

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggle(productId)}
        aria-pressed={active}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
          active
            ? "border-rose-200 bg-rose-50 text-rose-600"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Icon
          name="heart"
          className={`h-4 w-4 ${active ? "fill-current" : ""}`}
        />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors ${
        active
          ? "bg-rose-500 text-white"
          : "bg-white/90 text-slate-500 hover:bg-white hover:text-rose-500"
      }`}
    >
      <Icon name="heart" className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
    </button>
  );
}
