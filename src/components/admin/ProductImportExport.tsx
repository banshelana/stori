"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/panel/Icon";
import { Modal } from "@/components/panel/Modal";
import { Badge } from "@/components/panel/ui";
import { useI18n } from "@/i18n/I18nProvider";
import type { LocalizedText } from "@/i18n/localized";
import { MOCK_BRANDS } from "@/lib/data/brands";
import { MOCK_CATEGORIES } from "@/lib/data/mock";
import { productsRepo } from "@/lib/data/repositories";
import { formatNumber } from "@/lib/format";
import {
  BLANK_GALLERY,
  csvTemplate,
  parseCsv,
  planImport,
  productsToCsv,
  type ImportIssue,
  type ImportPlan,
  type PlannedRow,
  type RowAction,
} from "@/lib/productCsv";
import { crossedIntoStock } from "@/lib/stockAlerts";

type Tab = "export" | "import";

const ACTION_TONE: Record<RowAction, "success" | "info" | "danger"> = {
  create: "success",
  update: "info",
  error: "danger",
};

/** Hands the browser a file without needing a server round trip. */
function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bulk product import and export.
 *
 * Import never writes images. A created product starts with an empty
 * gallery and an updated one keeps the gallery it already has, so a
 * spreadsheet round trip cannot wipe what was uploaded through the form.
 * The export still carries image paths, for a backend that will one day
 * know how to reattach them.
 */
export function ProductImportExport({
  canWrite,
  onDone,
  onClose,
  onRestock,
}: {
  /** Export is a read; only a writer sees the import half. */
  canWrite: boolean;
  /** Called after a successful import so the list can reload. */
  onDone: () => void;
  onClose: () => void;
  /** Fires for a product that went from sold out to in stock. */
  onRestock?: (productId: string, title: LocalizedText) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("export");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseFailed, setParseFailed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{
    created: number;
    updated: number;
  } | null>(null);

  const num = (value: number) => formatNumber(value, locale);

  function handleExport() {
    download(`products-${today()}.csv`, productsToCsv(productsRepo.all()).csv);
  }

  // Counted straight from the catalogue rather than by building the file:
  // the summary renders on every keystroke, the CSV is built once on click.
  const catalogue = productsRepo.all();
  const inlineImageCount = catalogue.reduce(
    (sum, p) => sum + p.images.filter((i) => i.src.startsWith("data:")).length,
    0
  );

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setApplied(null);
    setParseFailed(false);
    setFileName(file.name);

    try {
      const text = await file.text();
      setPlan(
        planImport(parseCsv(text), {
          products: productsRepo.all(),
          categories: MOCK_CATEGORIES,
          brands: MOCK_BRANDS,
        })
      );
    } catch {
      setPlan(null);
      setParseFailed(true);
    }

    // Let the same file be picked again after a fix.
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleApply() {
    if (!plan) return;
    setApplying(true);
    try {
      let created = 0;
      let updated = 0;

      for (const row of plan.rows) {
        if (!row.draft) continue;

        if (row.existing) {
          const before = row.existing.stock;
          await productsRepo.update(row.existing.id, row.draft);
          updated += 1;
          // A bulk stock update is exactly when a sold-out product comes
          // back, so the waiting list hears about it here too.
          if (onRestock && crossedIntoStock(before, row.draft.stock)) {
            await onRestock(row.existing.id, row.draft.title);
          }
        } else {
          await productsRepo.create({
            ...row.draft,
            ...BLANK_GALLERY,
            createdAt: today(),
          });
          created += 1;
        }
      }

      setApplied({ created, updated });
      setPlan(null);
      setFileName("");
      onDone();
    } finally {
      setApplying(false);
    }
  }

  const importable = plan ? plan.createCount + plan.updateCount : 0;

  return (
    <Modal
      open
      size="lg"
      title={t("productCsv.title")}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t("common.cancel")}
          </button>
          {tab === "import" && plan && importable > 0 && (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {applying
                ? t("common.loading")
                : t("productCsv.apply", { count: num(importable) })}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div
          className="flex gap-1 rounded-xl bg-slate-100 p-1"
          hidden={!canWrite}
        >
          {(["export", "import"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                tab === value
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon
                name={value === "export" ? "box" : "upload"}
                className="h-4 w-4"
              />
              {t(`productCsv.${value}Tab`)}
            </button>
          ))}
        </div>

        {tab === "export" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {t("productCsv.exportIntro", { count: num(catalogue.length) })}
            </p>

            <ul className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <Note icon="check">{t("productCsv.moneyNote")}</Note>
              <Note icon="image">{t("productCsv.exportImagesNote")}</Note>
              {inlineImageCount > 0 && (
                <Note icon="alert" tone="amber">
                  {t("productCsv.inlineImages", { count: num(inlineImageCount) })}
                </Note>
              )}
            </ul>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Icon name="box" className="h-4 w-4" />
                {t("productCsv.download")}
              </button>
              <button
                type="button"
                onClick={() =>
                  download("products-template.csv", csvTemplate(MOCK_CATEGORIES))
                }
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Icon name="tag" className="h-4 w-4" />
                {t("productCsv.downloadTemplate")}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {t("productCsv.templateHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <Note icon="image">{t("productCsv.importImagesNote")}</Note>
              <Note icon="check">{t("productCsv.moneyNote")}</Note>
              <Note icon="check">{t("productCsv.matchNote")}</Note>
              <Note icon="check">{t("productCsv.columnNote")}</Note>
            </ul>

            <div>
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files)}
                className="sr-only"
              />
              <label
                htmlFor={inputId}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-sm font-medium text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Icon name="upload" className="h-5 w-5" />
                {fileName || t("productCsv.pickFile")}
              </label>
            </div>

            {parseFailed && (
              <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                {t("productCsv.unreadable")}
              </p>
            )}

            {applied && (
              <p
                role="status"
                className="animate-fade-in rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
              >
                {t("productCsv.applied", {
                  created: num(applied.created),
                  updated: num(applied.updated),
                })}
              </p>
            )}

            {plan && <PlanPreview plan={plan} />}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Note({
  icon,
  tone = "slate",
  children,
}: {
  icon: string;
  tone?: "slate" | "amber";
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex gap-2 ${tone === "amber" ? "text-amber-700" : ""}`}
    >
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
      <span>{children}</span>
    </li>
  );
}

/** What the file would do, shown before any of it happens. */
function PlanPreview({ plan }: { plan: ImportPlan }) {
  const { t, locale } = useI18n();
  const num = (value: number) => formatNumber(value, locale);

  if (plan.missingColumns.length > 0) {
    return (
      <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        <p className="font-semibold">{t("productCsv.missingColumns")}</p>
        <p className="force-ltr mt-1 font-mono text-xs">
          {plan.missingColumns.join(", ")}
        </p>
      </div>
    );
  }

  if (plan.rows.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        {t("productCsv.noRows")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge tone="success">
          {t("productCsv.toCreate", { count: num(plan.createCount) })}
        </Badge>
        <Badge tone="info">
          {t("productCsv.toUpdate", { count: num(plan.updateCount) })}
        </Badge>
        {plan.errorCount > 0 && (
          <Badge tone="danger">
            {t("productCsv.withErrors", { count: num(plan.errorCount) })}
          </Badge>
        )}
      </div>

      {plan.unknownColumns.length > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {t("productCsv.unknownColumns")}{" "}
          <span className="force-ltr font-mono text-xs">
            {plan.unknownColumns.join(", ")}
          </span>
        </p>
      )}

      {plan.errorCount > 0 && (
        <p className="text-xs text-slate-500">{t("productCsv.errorsSkipped")}</p>
      )}

      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {plan.rows.map((row) => (
          <RowLine key={row.line} row={row} />
        ))}
      </ul>
    </div>
  );
}

function RowLine({ row }: { row: PlannedRow }) {
  const { t, locale } = useI18n();

  return (
    <li className="flex flex-wrap items-start gap-2 px-3 py-2.5 text-sm">
      <span className="w-10 shrink-0 text-xs text-slate-400">
        {formatNumber(row.line, locale)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-800">
          {row.title || row.slug || "—"}
        </span>
        {row.slug && (
          <span className="force-ltr block truncate text-xs text-slate-400">
            {row.slug}
          </span>
        )}

        {row.errors.map((issue, i) => (
          <span key={`e${i}`} className="mt-1 block text-xs text-rose-600">
            {issueText(t, issue)}
          </span>
        ))}
        {row.warnings.map((issue, i) => (
          <span key={`w${i}`} className="mt-1 block text-xs text-amber-600">
            {issueText(t, issue)}
          </span>
        ))}
      </span>

      <Badge tone={ACTION_TONE[row.action]}>
        {t(`productCsv.action.${row.action}`)}
      </Badge>
    </li>
  );
}

/**
 * Renders a machine-readable issue as a sentence. The column is prefixed
 * so "required" says which cell is empty.
 */
function issueText(
  t: (key: string, vars?: Record<string, string | number>) => string,
  issue: ImportIssue
): string {
  const message = t(`productCsv.issue.${issue.message.code}`, {
    value: "value" in issue.message ? issue.message.value : "",
  });
  return issue.column ? `${issue.column}: ${message}` : message;
}
