"use client";

import { useEffect, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import {
  formatLatLon,
  IRAN_CENTER,
  IRAN_ZOOM,
  isValidLatLon,
  MAX_ZOOM,
  REGION_BOUNDS,
  roundCoord,
  TILE_ATTRIBUTION,
  TILE_URL,
  type LatLon,
} from "@/lib/map";

/**
 * Click-to-place location picker.
 *
 * Leaflet touches `window` the moment it is imported, so it is pulled in
 * with a dynamic import inside an effect rather than a top-level one —
 * a static import would break the server render of any page holding this
 * component.
 *
 * The marker is a `divIcon` rather than Leaflet's default image marker:
 * the default icon resolves its PNG by relative URL, which breaks under
 * bundlers, and a styled div matches the rest of the UI anyway.
 */
export function MapPicker({
  value,
  onChange,
  center,
  height = 320,
}: {
  value: LatLon | null;
  onChange: (value: LatLon | null) => void;
  /** Where to open when nothing is picked yet — usually the chosen city. */
  center?: LatLon | null;
  height?: number;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markerRef = useRef<LeafletNS.Marker | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);

  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback without re-running the setup effect, which
  // would tear the map down and rebuild it on every parent render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;

      const start = value ?? center ?? IRAN_CENTER;
      const map = L.map(containerRef.current, {
        center: [start.lat, start.lon],
        zoom: value ? 13 : IRAN_ZOOM,
        maxBounds: REGION_BOUNDS,
        maxBoundsViscosity: 0.7,
        // Enabled only after a deliberate click, so a wheel over an
        // embedded map still scrolls the page.
        scrollWheelZoom: false,
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: MAX_ZOOM,
      }).addTo(map);

      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());

      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        place({ lat: roundCoord(e.latlng.lat), lon: roundCoord(e.latlng.lng) });
      });

      mapRef.current = map;
      if (value) place(value, { silent: true });
      setReady(true);

      // Leaflet measures its container on creation; inside a modal or a
      // freshly mounted panel that measurement can be zero.
      setTimeout(() => map.invalidateSize(), 0);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Deliberately once: the map is imperative and syncs via the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function place(next: LatLon, { silent = false } = {}) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([next.lat, next.lon]);
    } else {
      const icon = L.divIcon({
        className: "",
        html: `<span class="map-pin"></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      const marker = L.marker([next.lat, next.lon], {
        icon,
        draggable: true,
        keyboard: true,
        title: t("geo.pickedLocation"),
      }).addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onChangeRef.current({ lat: roundCoord(lat), lon: roundCoord(lng) });
      });

      markerRef.current = marker;
    }

    if (!silent) onChangeRef.current(next);
  }

  // Follow an external change — the city select moving, or Clear.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    place(value, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lon, ready]);

  // Recentre when the chosen city changes and nothing is pinned yet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || value || !center) return;
    map.setView([center.lat, center.lon], 11);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lon, ready]);

  function locate() {
    if (!navigator.geolocation) {
      setError(t("geo.geolocationUnavailable"));
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const next = {
          lat: roundCoord(pos.coords.latitude),
          lon: roundCoord(pos.coords.longitude),
        };
        place(next);
        mapRef.current?.setView([next.lat, next.lon], 15);
      },
      () => {
        setLocating(false);
        // Covers refusal, timeout and unavailable alike — the user only
        // needs to know it didn't work and they can click instead.
        setError(t("geo.geolocationDenied"));
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("geo.pickOnMap")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <Icon name="pin" className="h-3.5 w-3.5" />
            {locating ? t("common.loading") : t("geo.useMyLocation")}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              {t("common.delete")}
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ height }}
        // Leaflet renders its own focusable controls; the container is a
        // presentation surface, and the numeric fields below are the
        // accessible path to the same value.
        className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      />

      <p className="mt-1.5 text-xs text-slate-500">
        {isValidLatLon(value) ? (
          <span className="force-ltr font-medium text-slate-700">
            {formatLatLon(value)}
          </span>
        ) : (
          t("geo.noLocationPicked")
        )}
      </p>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      {/* The tile provider's terms require this to stay visible; Leaflet
          also renders it in-map, this is the belt-and-braces copy for
          when the map fails to load at all. */}
      <p
        className="mt-1 text-[11px] text-slate-400"
        dir="ltr"
        lang="en"
        dangerouslySetInnerHTML={{ __html: TILE_ATTRIBUTION }}
      />
    </div>
  );
}
