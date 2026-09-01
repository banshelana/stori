"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ACCEPT_ATTRIBUTE,
  AVATAR_OPTIONS,
  ImageError,
  PRODUCT_IMAGE_OPTIONS,
  processImage,
  type ProcessOptions,
} from "@/lib/image";

function useImageIntake(options: ProcessOptions) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function intake(files: FileList | File[]): Promise<string[]> {
    setBusy(true);
    setError(null);
    const results: string[] = [];

    try {
      for (const file of Array.from(files)) {
        try {
          results.push(await processImage(file, options));
        } catch (err) {
          // Report the first failure but keep the files that did work,
          // so one bad file doesn't discard a whole multi-select.
          const code = err instanceof ImageError ? err.code : "DECODE";
          setError(t(`upload.error.${code}`));
        }
      }
    } finally {
      setBusy(false);
    }

    return results;
  }

  return { intake, busy, error, setError };
}

/** Round, single-image picker used for the profile photo. */
export function AvatarUpload({
  value,
  onChange,
  fallbackText,
  fallbackColor = "#4f46e5",
  disabled = false,
}: {
  value: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
  fallbackText: string;
  fallbackColor?: string;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { intake, busy, error } = useImageIntake(AVATAR_OPTIONS);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const [first] = await intake(files);
    if (first) onChange(first);
    // Reset so re-picking the same file fires change again.
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={t("upload.currentImage")}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
            style={{ backgroundColor: fallbackColor }}
          >
            {fallbackText}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          </span>
        )}
      </span>

      <div className="min-w-0">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          disabled={disabled || busy}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />

        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${
              disabled || busy ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <Icon name="upload" className="h-4 w-4" />
            {value ? t("upload.replace") : t("upload.choose")}
          </label>

          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              disabled={disabled || busy}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              {t("upload.remove")}
            </button>
          )}
        </div>

        <p className="mt-1.5 text-xs text-slate-400">{t("upload.avatarHint")}</p>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

export interface GalleryImage {
  id: string;
  src: string;
}

/**
 * Multi-image picker with an explicit primary.
 *
 * The primary is what the storefront shows in listings and as the first
 * image on the product page, so it is chosen by id rather than by
 * position — reordering or deleting must not silently move it.
 */
export function GalleryUpload({
  images,
  primaryId,
  onChange,
  max = 6,
  disabled = false,
}: {
  images: GalleryImage[];
  primaryId: string | null;
  onChange: (images: GalleryImage[], primaryId: string | null) => void;
  max?: number;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { intake, busy, error, setError } = useImageIntake(
    PRODUCT_IMAGE_OPTIONS
  );

  const remaining = max - images.length;
  const full = remaining <= 0;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    if (files.length > remaining) {
      setError(t("upload.tooMany", { max }));
    }
    const accepted = Array.from(files).slice(0, Math.max(0, remaining));
    if (accepted.length === 0) return;

    const dataUrls = await intake(accepted);
    if (dataUrls.length === 0) return;

    const added = dataUrls.map((src, i) => ({
      id: `img-${Date.now()}-${i}`,
      src,
    }));
    const next = [...images, ...added];
    // First image uploaded to an empty gallery becomes the primary.
    onChange(next, primaryId ?? next[0]?.id ?? null);

    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    const next = images.filter((img) => img.id !== id);
    const nextPrimary =
      primaryId === id ? (next[0]?.id ?? null) : primaryId;
    onChange(next, nextPrimary);
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("upload.images")}
        </span>
        <span className="text-xs text-slate-400">
          {images.length} / {max}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => {
          const isPrimary = img.id === primaryId;
          return (
            <div
              key={img.id}
              className={`group relative overflow-hidden rounded-xl border-2 bg-slate-50 ${
                isPrimary ? "border-indigo-500" : "border-slate-200"
              }`}
            >
              <span className="block aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>

              {isPrimary && (
                <span className="absolute top-1.5 start-1.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {t("upload.primary")}
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-slate-900/70 to-transparent p-1.5">
                {!isPrimary ? (
                  <button
                    type="button"
                    onClick={() => onChange(images, img.id)}
                    disabled={disabled}
                    className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
                  >
                    {t("upload.makePrimary")}
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  disabled={disabled}
                  aria-label={t("upload.remove")}
                  className="rounded-md bg-white/90 p-1 text-rose-600 hover:bg-white"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {!full && (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors ${
              dragging
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
            } ${disabled || busy ? "pointer-events-none opacity-60" : ""}`}
          >
            {busy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            ) : (
              <Icon name="upload" className="h-5 w-5 text-slate-400" />
            )}
            <span className="px-2 text-xs font-medium text-slate-500">
              {t("upload.dropHint")}
            </span>
          </label>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        disabled={disabled || busy}
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
      />

      <p className="mt-2 text-xs text-slate-400">{t("upload.productHint")}</p>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
