"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { localized } from "@/i18n/localized";
import { useLocaleHref } from "@/i18n/navigation";
import { listProducts } from "@/lib/data";
import { useDataSource } from "@/lib/data/source-context";
import { formatPrice } from "@/lib/format";
import { effectivePrice } from "@/lib/pricing";
import { primaryImageSrc } from "@/lib/product";
import type { Product } from "@/lib/types";
import { useSearchInput } from "@/lib/useDebouncedValue";

const MAX_SUGGESTIONS = 5;

/**
 * Hero search with debounced live suggestions.
 *
 * Typing filters against the active data source after a 300 ms pause;
 * Enter or the button hands the query to the catalog page, which is the
 * page that owns filtering, sorting and the shareable URL.
 */
export function HeroSearch() {
  const { t, locale } = useI18n();
  const { source } = useDataSource();
  const router = useRouter();
  const href = useLocaleHref();
  const listId = useId();

  const search = useSearchInput("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = search.debounced.trim();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    listProducts(source, { q: query }, locale)
      .then((products) => {
        if (!alive) return;
        setResults(products.slice(0, MAX_SUGGESTIONS));
        setLoading(false);
        setActive(-1);
      })
      .catch(() => {
        if (!alive) return;
        setResults([]);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query, source, locale]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function submit(value: string) {
    const trimmed = value.trim();
    setOpen(false);
    router.push(
      trimmed
        ? `${href("/products")}?q=${encodeURIComponent(trimmed)}`
        : href("/products")
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[active];
      if (chosen) {
        setOpen(false);
        router.push(href(`/products/${chosen.slug}`));
      } else {
        submit(search.value);
      }
      return;
    }
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  }

  const showPanel = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative mx-auto mt-10 max-w-xl">
      <div className="glass flex items-center gap-2 rounded-2xl p-1.5 ps-4">
        <Icon name="search" className="h-5 w-5 shrink-0 text-indigo-200" />
        <input
          type="search"
          value={search.value}
          onChange={(e) => {
            search.setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("home.searchPlaceholder")}
          aria-label={t("common.search")}
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          role="combobox"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-indigo-200/60"
        />
        <button
          type="button"
          onClick={() => submit(search.value)}
          className="btn-glow shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900"
        >
          {t("common.search")}
        </button>
      </div>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="animate-fade-in absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-start shadow-2xl"
        >
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" aria-hidden />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              {t("common.noResults")}
            </p>
          ) : (
            <>
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((product, i) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => {
                        setOpen(false);
                        router.push(href(`/products/${product.slug}`));
                      }}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors ${
                        i === active ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={primaryImageSrc(product)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {localized(product.title, locale)}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {formatPrice(
                            effectivePrice(product),
                            product.currency,
                            locale
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => submit(search.value)}
                className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-slate-50"
              >
                {t("home.seeAllResults")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
