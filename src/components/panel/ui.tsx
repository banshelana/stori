"use client";

import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPercent } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string;
  change?: number;
  icon: string;
}) {
  const { t, locale } = useI18n();
  const up = (change ?? 0) >= 0;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon name={icon} />
        </span>
      </div>

      {change !== undefined && (
        <p className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`flex items-center gap-1 font-semibold ${
              up ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <Icon name={up ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
            {formatPercent(Math.abs(change), locale)}
          </span>
          <span className="text-slate-400">{t("admin.vsLastMonth")}</span>
        </p>
      )}
    </Card>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Maps a domain status onto a badge tone, so colour stays consistent. */
export const ORDER_STATUS_TONE: Record<string, Tone> = {
  created: "info",
  pending: "warning",
  processing: "info",
  done: "success",
  canceled: "danger",
};

export const PAYMENT_STATUS_TONE: Record<string, Tone> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl bg-slate-200"
          aria-hidden
        />
      ))}
    </div>
  );
}

/**
 * Marks a section whose CRUD screens land in the next phase. Keeping the
 * route real means the nav, guards and permissions are exercised now.
 */
export function ComingSoon({ section }: { section: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <Icon name="box" />
      </span>
      <p className="mt-4 text-lg font-semibold text-slate-700">{section}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        {t("admin.comingSoon")}
      </p>
    </div>
  );
}
