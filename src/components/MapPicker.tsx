"use client";

import { useEffect, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import {
  formatLatLon,
  isValidLatLon,
  roundCoord,
  TILE_ATTRIBUTION,
  type LatLon,
} from "@/lib/map";
import { pinIcon, useLeafletMap } from "@/lib/useLeafletMap";

/**
 * Click-to-place location picker.
 *
 * The map itself is created by useLeafletMap; this component owns only
 * the marker and the interactions that change it.
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
  const { containerRef, mapRef, leafletRef, ready } = useLeafletMap({
    center: value ?? center,
    zoom: value ? 13 : undefined,
  });

  const markerRef = useRef<LeafletNS.Marker | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keeps the latest callback reachable from Leaflet's own handlers,
  // which are registered once and outlive any particular render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  function place(next: LatLon, { silent = false } = {}) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([next.lat, next.lon]);
    } else {
      const marker = L.marker([next.lat, next.lon], {
        icon: pinIcon(L),
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

  // Register the click handler once the map exists.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const onClick = (e: LeafletNS.LeafletMouseEvent) => {
      place({ lat: roundCoord(e.latlng.lat), lon: roundCoord(e.latlng.lng) });
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Follow an external change — the city select moving, or Clear.
  useEffect(() => {
    if (!mapRef.current || !ready) return;

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

      {/* The tile provider's terms require this to stay visible. Leaflet
          renders its own in-map control; this copy survives the map
          failing to load at all. */}
      <p
        className="mt-1 text-[11px] text-slate-400"
        dir="ltr"
        lang="en"
        dangerouslySetInnerHTML={{ __html: TILE_ATTRIBUTION }}
      />
    </div>
  );
}
