"use client";

import { useEffect, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/i18n/I18nProvider";
import { formatLatLon, TILE_ATTRIBUTION, type LatLon } from "@/lib/map";
import { pinIcon, useLeafletMap } from "@/lib/useLeafletMap";

export interface MapMarker extends LatLon {
  id: string;
  /** Shown in the marker tooltip and used by the caller's own list. */
  label?: string;
}

/**
 * Read-only map showing one or more fixed points.
 *
 * Distinct from MapPicker because the behaviour is genuinely different:
 * nothing here is editable, several markers can be shown at once, and the
 * view fits to their extent rather than to a single chosen point.
 */
export function MapView({
  markers,
  height = 340,
  focusId,
}: {
  markers: MapMarker[];
  height?: number;
  /** Pans to this marker when it changes — driven by the caller's list. */
  focusId?: string | null;
}) {
  const { t } = useI18n();
  const { containerRef, mapRef, leafletRef, ready } = useLeafletMap({
    center: markers[0] ?? null,
    zoom: 13,
    // The map is the point of the dialog, so the wheel can zoom it directly.
    scrollWheelZoom: "always",
  });

  const layerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const markerIndex = useRef(new Map<string, LeafletNS.Marker>());
  const [count, setCount] = useState(0);

  // A stable key so the effect re-runs on real changes, not on the new
  // array identity a parent produces every render.
  const key = markers.map((m) => `${m.id}:${m.lat},${m.lon}`).join("|");

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;

    layerRef.current?.remove();
    markerIndex.current.clear();

    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    for (const item of markers) {
      const marker = L.marker([item.lat, item.lon], {
        icon: pinIcon(L),
        // Read-only: no dragging, and not in the tab order.
        draggable: false,
        keyboard: false,
        interactive: Boolean(item.label),
        title: item.label,
      }).addTo(group);

      if (item.label) marker.bindTooltip(item.label, { direction: "top" });
      markerIndex.current.set(item.id, marker);
    }

    setCount(markers.length);

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lon], 14);
    } else if (markers.length > 1) {
      // Fit every pin, with padding so none sits under the map edge.
      map.fitBounds(
        L.latLngBounds(markers.map((m) => [m.lat, m.lon] as [number, number])),
        { padding: [40, 40], maxZoom: 14 }
      );
    }

    return () => {
      group.remove();
      layerRef.current = null;
      markerIndex.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  // Pan to whichever entry the caller highlighted.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusId) return;
    const target = markers.find((m) => m.id === focusId);
    if (!target) return;
    map.setView([target.lat, target.lon], 15, { animate: true });
    markerIndex.current.get(focusId)?.openTooltip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, ready]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      />

      {count === 0 && (
        <p className="mt-2 text-sm text-slate-500">{t("geo.noLocationSaved")}</p>
      )}

      <p
        className="mt-1 text-[11px] text-slate-400"
        dir="ltr"
        lang="en"
        dangerouslySetInnerHTML={{ __html: TILE_ATTRIBUTION }}
      />
    </div>
  );
}

export { formatLatLon };
